const Proto = require('uberproto');
const errors = require('@feathersjs/errors');
const cloneDeep = require('clone-deep');
const aql = require('arangojs').aql;
const uuidV4 = require('uuid/v4');
const mongoAql = require('./mongo-aql');

const errorHandler = require('./error-handler');

const {select, filterQuery, _} = require('@feathersjs/commons');

class Service {
  constructor (options) {
    if (!options) {
      throw new Error('ArangoDB options have to be provided');
    }

    this.paginate = options.paginate || {};
    this._id = this.id = options.idField || options.id || '_id';
    // this._uId = options.startId || 0;
    this.store = options.store || {};
    this.events = options.events || [];
    // this._matcher = options.matcher;
    // this._sorter = options.sorter || sorter;
    this._colName = options.collection;
    this._db = options.db;
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  init (db = this._db, name = this._colName) {
    this.db = db;
    this._colName = name;
    this._collection = db.collection(name);

    return new Promise((resolve, reject) => {
      this._collection.get()
        .then(() => {
          resolve(db);
        })
        .catch(err => {
          if (err.errorNum === 1203 || err.message === 'collection not found') {
            this._collection.create()
              .then(() => {
                resolve(db);
              })
              .catch(errCol => {
                reject(errCol);
              });
          } else {
            reject(err);
          }
        });
    });
  }

  feathersFormat (doc, params) {
    let final = cloneDeep(doc);
    final[this._id] = final._key;
    delete final._key;
    delete final._rev;
    return select(params, this._id)(final);
  }

  _getSelect (select) {
    if (Array.isArray(select)) {
      let result = {};
      select.forEach(name => {
        result[name] = 1;
      });
      return result;
    }

    return select;
  }

  // Find without hooks and mixins that can be used internally and always returns
  // a pagination object
  _find (params, getFilter = filterQuery) {
    let {filters, query} = getFilter(params.query || {});
    let totalOnly = false;

    if (filters.$limit === 0) {
      totalOnly = true;
      delete filters.$limit;
      delete filters.$skip;
    }

    Object.keys(filters).forEach(key => {
      if (typeof filters[key] === 'undefined') {
        delete filters[key];
      }
    });

    // For skip to work, there has to be a limit
    if (filters.$skip && !filters.$limit) {
      filters.$limit = 100000; // A top limit number of items to return.
    }

    if (filters.$sort) {
      filters.$orderby = filters.$sort;
      delete filters.$sort;
    }

    let select = (filters.$select) ? filters.$select : null;
    delete filters.$select;

    let queryObject = Object.assign({}, query, filters);
    let queryCount = Object.assign({}, query);

    let aqlQuery = mongoAql(this._colName, queryObject);
    let aqlCountQuery = mongoAql(this._colName, queryCount);

    // Implement select as a projection/filter
    if (aqlQuery.query && select) {
      let projection = 'RETURN {';
      if (Array.isArray(select)) {
        select.forEach((name, index) => {
          projection += ` ${name}: c.${name}`;
          if (index !== select.length - 1) {
            projection += ',';
          }
        });
        projection += ' }';
      } else {
        projection += ` ${select}: c.${select} }`;
      }
      aqlQuery.query = aqlQuery.query.replace('RETURN c', projection);
    }

    return this.db.query(aqlCountQuery.query, aqlCountQuery.values, {count: true})
      .then(countCursor => {
        if (totalOnly) {
          return Promise.resolve({
            total: countCursor.count,
            limit: filters.$limit || 0,
            skip: filters.$skip || 0,
            data: []
          });
        } else {
          return this.db.query(aqlQuery.query, aqlQuery.values).then(cursor => cursor.all().then(result => {
            return Promise.resolve({
              total: countCursor.count,
              limit: filters.$limit,
              skip: filters.$skip || 0,
              data: result.map(doc => this.feathersFormat(doc, params))
            });
          })
          ).catch(errorHandler);
        }
      }).catch(errorHandler);
  }

  find (params) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    // Call the internal find with query parameter that include pagination
    const result = this._find(params, query => filterQuery(query, paginate));

    if (!paginate.default) {
      return result.then(page => page.data);
    }

    return result;
  }

  get (id, params) {
    const identifier = this._colName + '/' + id;
    return this.db.query(aql`
      RETURN DOCUMENT(${identifier})
    `).then(cursor => cursor.next().then(doc => {
      if (!doc) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }
      return this.feathersFormat(doc, params);
    })).catch(errorHandler);
  }

  // Create without hooks and mixins that can be used internally
  _create (data, params) {
    let id = data[this._id] || uuidV4();
    let current = Object.assign({}, _.omit(data, '_id', '_rev'), {_key: id});

    return this.db.query(aql`
      INSERT ${current}
      IN ${this._collection}
      RETURN NEW`)
      .then(cursor => cursor.next().then(doc => this.feathersFormat(doc, params))).catch(errorHandler);
  }

  create (data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this._create(current)));
    }

    return this._create(data, params);
  }

  // Update without hooks and mixins that can be used internally
  _update (id, data, params) {
    const identifier = this._colName + '/' + id;
    const current = _.omit(data, this._id, '_id', '_key', '_rev');
    return this.db.query(aql`
      LET doc = DOCUMENT(${identifier})
      REPLACE doc WITH ${current}
      IN ${this._collection}
      RETURN NEW`)
      .then(cursor => cursor.next().then(doc => this.feathersFormat(doc, params)))
      .catch(err => {
        if (err.errorNum === 1226 || err.errorNum === 1227) return Promise.reject(new errors.NotFound(`No record found for id '${id}'`));
        errorHandler(err);
      });
  }

  update (id, data, params) {
    if (id === null || Array.isArray(data)) {
      return Promise.reject(new errors.BadRequest(
        'You can not replace multiple instances. Did you mean \'patch\'?'
      ));
    }

    return this._update(id, data, params);
  }

  // Patch without hooks and mixins that can be used internally
  _patch (id, data, params) {
    const identifier = this._colName + '/' + id;
    const current = _.omit(data, this._id, '_id', '_key', '_rev');
    return this.db.query(aql`
      LET doc = DOCUMENT(${identifier})
      UPDATE doc WITH ${current}
      IN ${this._collection}
      RETURN NEW`)
      .then(cursor => cursor.next().then(doc => this.feathersFormat(doc, params)))
      .catch(err => {
        if (err.errorNum === 1226 || err.errorNum === 1227) return Promise.reject(new errors.NotFound(`No record found for id '${id}'`));
        errorHandler(err);
      });
  }

  patch (id, data, params) {
    if (id === null) {
      return this._find(params).then(page => {
        return Promise.all(page.data.map(
          current => this._patch(current[this._id], data, params))
        );
      });
    }

    return this._patch(id, data, params);
  }

  // Remove without hooks and mixins that can be used internally
  _remove (id, params) {
    const identifier = this._colName + '/' + id;
    return this.db.query(aql`
      LET doc = DOCUMENT(${identifier})
      REMOVE doc
      IN ${this._collection}
      RETURN OLD
    `)
      .then(cursor => cursor.next().then(doc => this.feathersFormat(doc, params)))
      .catch(err => {
        if (err.errorNum === 1226 || err.errorNum === 1227) return Promise.reject(new errors.NotFound(`No record found for id '${id}'`));
        errorHandler(err);
      });
  }

  remove (id, params) {
    if (id === null) {
      return this._find(params).then(page =>
        Promise.all(page.data.map(current =>
          this._remove(current[this._id], params
          )
        )));
    }

    return this._remove(id, params);
  }
}

module.exports = function init (options) {
  return new Service(options);
};

module.exports.Service = Service;
