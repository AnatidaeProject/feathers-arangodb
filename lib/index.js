"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbService = exports.AUTH_TYPES = void 0;
const errors_1 = require("@feathersjs/errors");
const aql_1 = require("arangojs/aql");
const graph_1 = require("arangojs/graph");
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const isString_1 = __importDefault(require("lodash/isString"));
const omit_1 = __importDefault(require("lodash/omit"));
const uuidv4_1 = require("uuidv4");
const auto_database_1 = require("./auto-database");
const queryBuilder_1 = require("./queryBuilder");
var AUTH_TYPES;
(function (AUTH_TYPES) {
    AUTH_TYPES["BASIC_AUTH"] = "BASIC_AUTH";
    AUTH_TYPES["BEARER_AUTH"] = "BEARER_AUTH";
})(AUTH_TYPES = exports.AUTH_TYPES || (exports.AUTH_TYPES = {}));
class DbService {
    constructor(options) {
        this.events = [];
        // Runtime checks
        /* istanbul ignore next */
        if (!options.collection) {
            throw new Error("A collection reference or name is required");
        }
        /* istanbul ignore next */
        if (!options.database) {
            throw new Error("A database reference or name is required");
        }
        /* istanbul ignore next */
        if (options.id && ["_rev"].indexOf(options.id) !== -1) {
            throw new Error(`Database id name of ${options.id} is a reserved key`);
        }
        this._id = options.id || "_id";
        this.events = options.events || this.events;
        this._paginate = options.paginate || {};
        this.options = options;
        // Set the database if passed an existing DB
        /* istanbul ignore next */
        if (options.database instanceof Promise) {
            this._databasePromise = options.database;
        }
        else if (options.database instanceof auto_database_1.AutoDatabse) {
            this._database = options.database;
        }
        else if (!isString_1.default(options.database)) {
            throw new Error("Database reference or name (string) is required");
        }
        if (options.graph instanceof Promise) {
            this._graphPromise = options.graph;
        }
        else if (options.graph instanceof graph_1.Graph) {
            this._graph = options.graph;
        }
        // Set the collection if it is connected
        /* istanbul ignore next */
        if (options.collection instanceof Promise) {
            this._collectionPromise = options.collection;
        }
        else if (!isString_1.default(options.collection) && !!options.collection) {
            this._collection = (options.collection);
        }
        else if (!options.collection) {
            throw new Error("Collection reference or name (string) is required");
        }
        // Set the view if it is connected
        /* istanbul ignore next */
        if (options.view instanceof Promise) {
            this._viewPromise = options.view;
        }
        else if (!isString_1.default(options.view) && !!options.view) {
            this._view = (options.view);
        }
    }
    async connect() {
        const { authType, username, password, token, graph, dbConfig, } = this.options;
        if (this._database === undefined && this._databasePromise) {
            this._database = await this._databasePromise;
        }
        /* istanbul ignore next */
        if (this._database === undefined) {
            let db = new auto_database_1.AutoDatabse(dbConfig);
            switch (authType) {
                case AUTH_TYPES.BASIC_AUTH:
                    db.useBasicAuth(username, password);
                    break;
                case AUTH_TYPES.BEARER_AUTH:
                    /* istanbul ignore next  Testing will assuming working SDK  */
                    if (token) {
                        await db.useBearerAuth(token || "");
                    }
                    else {
                        await db.login(username, password);
                    }
                    break;
            }
            await db.autoUseDatabase(this.options.database);
            this._database = db;
        }
        if (!this._graph && this._graphPromise) {
            this._graph = await this._graphPromise;
        }
        if (graph && !this._graph) {
            const { properties, opts } = graph;
            if (this._database instanceof auto_database_1.AutoDatabse) {
                this._graph = await this._database.autoGraph(properties, opts);
            }
            else {
                throw `Auto creation of graphs requires instance of AutoDatabase`;
            }
        }
        /* istanbul ignore next  This doens't need to be tested  */
        if (this._collectionPromise) {
            this._collection = await this._collectionPromise;
        }
        if (this._collection === undefined) {
            if (this._database instanceof auto_database_1.AutoDatabse) {
                this._collection = await this._database.autoCollection(this.options.collection);
            }
            else {
                throw `Auto creation of collections requires instance of AutoDatabase`;
            }
        }
        if (this._viewPromise) {
            this._view = await this._viewPromise;
        }
        if (this._view === undefined) {
            if (this._database instanceof auto_database_1.AutoDatabse) {
                this._view = await this._database.autoView(this.options.view);
            }
            else {
                throw `Auto creation of collections requires instance of AutoDatabase`;
            }
        }
        return {
            database: this._database,
            collection: this._collection,
            view: this._view
        };
    }
    get id() {
        return this._id;
    }
    get database() {
        return this._database;
    }
    get collection() {
        return this._collection;
    }
    get view() {
        return this._view;
    }
    get paginate() {
        return this._paginate;
    }
    set paginate(option) {
        this._paginate = option || this._paginate;
    }
    _injectPagination(params) {
        params = params || {};
        if (isEmpty_1.default(this._paginate) || (params && params.paginate) === false) {
            return params;
        }
        const paginate = params.paginate || this._paginate;
        params.query = params.query || {};
        let limit = parseInt(params.query.$limit);
        limit =
            isNaN(limit) || limit === null
                ? paginate.default || paginate.max || 0
                : limit;
        limit = Math.min(limit, paginate.max || paginate.default || limit);
        params.query.$limit = limit;
        return params;
    }
    fixKeySend(data) {
        const aData = Array.isArray(data) ? data : [data];
        if (aData.length < 1) {
            return aData;
        }
        return aData.map((item) => {
            const id = item[this._id] || uuidv4_1.uuid();
            return Object.assign({ _key: id }, omit_1.default(item, "_id", "_rev", "_key"));
        });
    }
    fixKeyReturn(item) {
        const idObj = {};
        if (typeof item == "object" && item != null) {
            if ("_key" in item) {
                idObj[this._id] = item._key;
            }
            const removeKeys = [this._id, "_key"];
            if (!this.options.expandData) {
                removeKeys.push("_id", "_rev");
            }
            return Object.assign(Object.assign({}, idObj), omit_1.default(item, removeKeys));
        }
        return null;
    }
    async _returnMap(database, query, errorMessage, removeArray = true, paging = false) {
        var _a;
        const cursor = (await database
            .query(query, { count: paging, fullCount: paging })
            .catch((error) => {
            if (error &&
                error.isArangoError &&
                error.errorNum === 1202 &&
                errorMessage) {
                throw new errors_1.NotFound(errorMessage);
            }
            else {
                throw error;
            }
        }));
        const unfiltered = await cursor.map((item) => this.fixKeyReturn(item));
        const result = unfiltered.filter((item) => item != null);
        if ((result.length === 0 || (result.length === 1 && result[0] == null)) &&
            errorMessage) {
            throw new errors_1.NotFound(errorMessage);
        }
        if (paging) {
            return {
                total: (_a = cursor.extra.stats) === null || _a === void 0 ? void 0 : _a.fullCount,
                data: result,
            };
        }
        return result.length > 1 || !removeArray ? result : result[0];
    }
    async find(params) {
        let { database, collection, view } = await this.connect();
        params = this._injectPagination(params);
        const queryBuilder = new queryBuilder_1.QueryBuilder(params, collection.name);
        const query = aql_1.aql.join([
            aql_1.aql `FOR doc in ${queryBuilder.search ? view : collection}`,
            queryBuilder.search
                ? aql_1.aql.join([aql_1.aql `SEARCH`, queryBuilder.search], " ")
                : aql_1.aql ``,
            queryBuilder.filter
                ? aql_1.aql.join([aql_1.aql `FILTER`, queryBuilder.filter], " ")
                : aql_1.aql ``,
            queryBuilder.sort
                ? aql_1.aql.join([aql_1.aql `SORT`, queryBuilder.sort], " ")
                : aql_1.aql ``,
            queryBuilder.limit,
            queryBuilder.returnFilter,
        ], " ");
        const result = (await this._returnMap(database, query, undefined, false, !isEmpty_1.default(this._paginate)));
        console.log("DEBUG - aql:", query.query);
        if (!isEmpty_1.default(this._paginate)) {
            // console.log("DEBUG -  params.query.$limit:", params.query?.$limit);
            // console.log("DEBUG - result.data:", JSON.stringify(result.data));
            return {
                total: result.total,
                // @ts-ignore   Will be defined based on previous logic
                limit: params.query.$limit || 0,
                // @ts-ignore   Will be defined based on previous logic
                skip: params.query.$skip || 0,
                data: result.data,
            };
        }
        return result;
    }
    async get(id, params) {
        const { database, collection } = await this.connect();
        const queryBuilder = new queryBuilder_1.QueryBuilder(params);
        queryBuilder.addFilter("_key", id, "doc", "AND");
        const query = aql_1.aql.join([
            aql_1.aql `FOR doc IN ${collection}`,
            queryBuilder.filter
                ? aql_1.aql.join([aql_1.aql `FILTER`, queryBuilder.filter], " ")
                : aql_1.aql ``,
            queryBuilder.returnFilter,
        ], " ");
        return this._returnMap(database, query, `No record found for id '${id}'`);
    }
    async create(data, params) {
        data = this.fixKeySend(data);
        const { database, collection } = await this.connect();
        const queryBuilder = new queryBuilder_1.QueryBuilder(params);
        const query = aql_1.aql `
        FOR item IN ${data}
          INSERT item IN ${collection}
          let doc = NEW
        ${queryBuilder.returnFilter}`;
        return this._returnMap(database, query);
    }
    async _replaceOrPatch(fOpt = "REPLACE", id, data, params) {
        const { database, collection } = await this.connect();
        const ids = Array.isArray(id) ? id : [id];
        let query;
        if (ids.length > 0 && (ids[0] != null || ids[0] != undefined)) {
            const queryBuilder = new queryBuilder_1.QueryBuilder(params, "", "doc", "changed");
            query = aql_1.aql.join([
                aql_1.aql `FOR doc IN ${ids}`,
                aql_1.aql.literal(`${fOpt}`),
                aql_1.aql `doc WITH ${data} IN ${collection}`,
                aql_1.aql `LET changed = NEW`,
                queryBuilder.returnFilter,
            ], " ");
        }
        else {
            const queryBuilder = new queryBuilder_1.QueryBuilder(params, "", "doc", "changed");
            query = aql_1.aql.join([
                aql_1.aql `FOR doc IN ${collection}`,
                queryBuilder.filter
                    ? aql_1.aql.join([aql_1.aql `FILTER`, queryBuilder.filter], " ")
                    : aql_1.aql ``,
                aql_1.aql.literal(`${fOpt}`),
                aql_1.aql `doc WITH ${data} IN ${collection}`,
                aql_1.aql `LET changed = NEW`,
                queryBuilder.returnFilter,
            ], " ");
        }
        return this._returnMap(database, query, `No record found for id '${id}'`);
    }
    async update(id, data, params) {
        return this._replaceOrPatch("REPLACE", id, data, params);
    }
    async patch(id, data, params) {
        return this._replaceOrPatch("UPDATE", id, data, params);
    }
    async remove(id, params) {
        // Eliminate null or empty clauses
        const ids = Array.isArray(id) ? id : [id];
        // Setup connection & verify
        const { database, collection } = await this.connect();
        if (!database) {
            throw new Error("Database not initialized");
        }
        if (!collection) {
            throw new Error("Collection not initialized");
        }
        // Build query
        let query;
        if (id && (!Array.isArray(id) || (Array.isArray(id) && id.length > 0))) {
            const queryBuilder = new queryBuilder_1.QueryBuilder(params, "", "doc", "removed");
            query = aql_1.aql `
        FOR doc IN ${ids}
          REMOVE doc IN ${collection}
          LET removed = OLD
          ${queryBuilder.returnFilter}
      `;
        }
        else {
            const queryBuilder = new queryBuilder_1.QueryBuilder(params, "", "doc", "removed");
            query = aql_1.aql.join([
                aql_1.aql `FOR doc IN ${collection}`,
                queryBuilder.filter
                    ? aql_1.aql.join([aql_1.aql `FILTER`, queryBuilder.filter], " ")
                    : aql_1.aql ``,
                aql_1.aql `REMOVE doc IN ${collection}`,
                aql_1.aql `LET removed = OLD`,
                queryBuilder.returnFilter,
            ], " ");
        }
        return this._returnMap(database, query);
        // let cursor: ArrayCursor;
        // cursor = await database.query(query);
        // let result: any[] = await cursor.map(item => this.fixKeyReturn(item));
        // return result.length > 1 ? result : result[0];
    }
    async setup(app, path) {
        await this.connect();
    }
}
exports.DbService = DbService;
function ArangoDbService(options) {
    return new DbService(options);
}
exports.default = ArangoDbService;
