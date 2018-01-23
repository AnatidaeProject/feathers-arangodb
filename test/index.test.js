const { expect } = require('chai');
const { base } = require('feathers-service-tests');

// const { MongoClient, ObjectID } = require('mongodb');
const Database = require('arangojs').Database;

const feathers = require('@feathersjs/feathers');
const errors = require('@feathersjs/errors');
const service = require('../lib');

let db;

describe('Feathers ArangoDB Service', () => {
  const app = feathers();

  before(done => {
    db = new Database('http://localhost:8529');
    db.useBasicAuth('root', 'root');

    db.createDatabase('feathers-test', [{username: 'root'}])
      .then(() => {
        db.useDatabase('feathers-test');
        initApp(db);
      })
      .catch((err) => {
        if (err.response.body.errorNum === 1207) {
          db.useDatabase('feathers-test');
          initApp(db);
        } else {
          console.error('Error initializing database');
          console.error(err);
          done();
        }
      });

    function initApp (db) {
      app
        .use('/people', service({
          collection: 'people',
          events: [ 'testing' ]
        }))
        .use('/people-customid', service({
          collection: 'people-customid',
          id: 'customid',
          events: [ 'testing' ]
        }));

      app.service('/people').init(db, 'people');
      app.service('/people-customid').init(db, 'people-customid');

      console.log('>>>>>> CALLING DONE <<<<<<<<');
      done();
    }
  });

  after(done => {
    console.log('Dropping database');
    const rDb = new Database('http://localhost:8529');
    rDb.useBasicAuth('root', 'root');
    rDb.dropDatabase('feathers-test')
      .then(() => {
        done();
      })
      .catch(err => {
        console.error('Problems dropping database');
        console.error(err);
        done();
      });
  });

  it('is CommonJS compatible', () =>
    expect(typeof require('../lib')).to.equal('function')
  );

  base(app, errors, 'people', '_id');
  base(app, errors, 'people-customid', 'customid');

  describe('Initialization', () => {
    describe('when missing options', () => {
      it('throws an error', () =>
        expect(service.bind(null)).to.throw('ArangoDB options have to be provided')
      );
    });

    describe('when missing the id option', () => {
      it('sets the default to be _id', () =>
        expect(service({ Model: db }).id).to.equal('_id')
      );
    });

    describe('when missing the paginate option', () => {
      it('sets the default to be {}', () =>
        expect(service({ Model: db }).paginate).to.deep.equal({})
      );
    });
  });
});
