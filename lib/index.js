"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auto_database_1 = require("./auto-database");
const errors_1 = __importDefault(require("@feathersjs/errors"));
const lodash_isstring_1 = __importDefault(require("lodash.isstring"));
const lodash_omit_1 = __importDefault(require("lodash.omit"));
const lodash_isempty_1 = __importDefault(require("lodash.isempty"));
const v4_1 = __importDefault(require("uuid/v4"));
const queryBuilder_1 = require("./queryBuilder");
var AUTH_TYPES;
(function (AUTH_TYPES) {
    AUTH_TYPES[AUTH_TYPES["BASIC_AUTH"] = 0] = "BASIC_AUTH";
    AUTH_TYPES[AUTH_TYPES["BEARER_AUTH"] = 1] = "BEARER_AUTH";
})(AUTH_TYPES = exports.AUTH_TYPES || (exports.AUTH_TYPES = {}));
class DbService {
    constructor(options) {
        this.events = [];
        // Runtime checks
        if (!options.collection)
            throw new Error("A collection reference or name is required");
        if (!options.database)
            throw new Error("A database reference or name is required");
        if (options.id && ["_rev"].indexOf(options.id) !== -1)
            throw new Error(`Database id name of ${options.id} is a reserved key`);
        this._id = options.id || "_id";
        this.events = options.events || this.events;
        this._paginate = options.paginate || {};
        this.options = options;
        // Set the database if passed an existing DB
        /* istanbul ignore next */
        if (options.database instanceof auto_database_1.AutoDatabse) {
            this._database = options.database;
        }
        else if (!lodash_isstring_1.default(options.database)) {
            throw new Error("Database reference or name (string) is required");
        }
        // Set the collection if it is connected
        /* istanbul ignore next */
        if (!lodash_isstring_1.default(options.collection) && !!options.collection) {
            this._collection = options.collection;
        }
        else if (!options.collection) {
            throw new Error("Collection reference or name (string) is required");
        }
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            /* istanbul ignore next */
            if (this._database === undefined) {
                this._database = new auto_database_1.AutoDatabse();
                const { authType, username, password, token } = this.options;
                switch (authType) {
                    case AUTH_TYPES.BASIC_AUTH:
                        this._database.useBasicAuth(username, password);
                        break;
                    case AUTH_TYPES.BEARER_AUTH:
                        /* istanbul ignore next  Testing will assuming working SDK  */
                        if (token) {
                            yield this._database.useBearerAuth(token || "");
                        }
                        else {
                            yield this._database.login(username, password);
                        }
                        break;
                }
                yield this._database.autoUseDatabase(this.options.database);
            }
            if (this._collection === undefined) {
                this._collection = yield this._database.autoCollection((this.options.collection));
            }
            return {
                database: this._database,
                collection: this._collection
            };
        });
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
    get paginate() {
        return this._paginate;
    }
    set paginate(option) {
        this._paginate = option || this._paginate;
    }
    _injectPagination(params) {
        params = params || {};
        if (lodash_isempty_1.default(this._paginate) || (params && params.paginate) === false)
            return params;
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
        data = Array.isArray(data) ? data : [data];
        if (data.length < 1)
            return data;
        return data.map((item) => {
            let id = item[this._id] || v4_1.default();
            return Object.assign({ _key: id }, lodash_omit_1.default(item, "_id", "_rev", "_key"));
        });
    }
    fixKeyReturn(item) {
        const idObj = {};
        idObj[this._id] = item._key;
        const removeKeys = [this._id, "_key"];
        if (!this.options.expandData) {
            removeKeys.push("_id", "_rev");
        }
        return Object.assign(idObj, lodash_omit_1.default(item, removeKeys));
    }
    _returnMap(database, query, errorMessage, removeArray = true, paging = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const cursor = yield database
                .query(query, { count: paging, options: { fullCount: paging } })
                .catch(error => {
                if (error &&
                    error.isArangoError &&
                    error.errorNum === 1202 &&
                    errorMessage) {
                    throw new errors_1.default.NotFound(errorMessage);
                }
                else {
                    throw error;
                }
            });
            let result = yield cursor.map(item => this.fixKeyReturn(item));
            if (result.length === 0 && errorMessage)
                throw new errors_1.default.NotFound(errorMessage);
            if (paging) {
                return {
                    total: cursor.extra.stats.fullCount,
                    data: result
                };
            }
            return result.length > 1 || !removeArray ? result : result[0];
        });
    }
    find(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { database, collection } = yield this.connect();
            params = this._injectPagination(params);
            const queryBuilder = new queryBuilder_1.QueryBuilder(params);
            const colVar = queryBuilder.addBindVar(collection.name, true);
            const query = {
                query: `
        FOR doc IN ${colVar}
          ${queryBuilder.filter}
          ${queryBuilder.sort}
          ${queryBuilder.limit}
          ${queryBuilder.returnFilter}
      `,
                bindVars: queryBuilder.bindVars
            };
            const result = (yield this._returnMap(database, query, undefined, false, !lodash_isempty_1.default(this._paginate)));
            if (!lodash_isempty_1.default(this._paginate)) {
                return {
                    total: result.total,
                    // @ts-ignore   Will be defined based on previous logic
                    limit: params.query.$limit || 0,
                    // @ts-ignore   Will be defined based on previous logic
                    skip: params.query.$skip || 0,
                    data: result.data
                };
            }
            return result;
        });
    }
    get(id, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { database, collection } = yield this.connect();
            const queryBuilder = new queryBuilder_1.QueryBuilder(params);
            const query = {
                query: `
        FOR doc IN ${queryBuilder.addBindVar(collection.name, true)}
          FILTER doc._key == ${queryBuilder.addBindVar(id)}
          ${queryBuilder.filter}
          ${queryBuilder.returnFilter}
      `,
                bindVars: queryBuilder.bindVars
            };
            return yield this._returnMap(database, query, `No record found for id '${id}'`);
        });
    }
    create(data, params) {
        return __awaiter(this, void 0, void 0, function* () {
            data = this.fixKeySend(data);
            const { database, collection } = yield this.connect();
            const queryBuilder = new queryBuilder_1.QueryBuilder(params);
            const query = {
                query: `
        FOR item IN ${queryBuilder.addBindVar(data)}
          INSERT item IN ${queryBuilder.addBindVar(collection.name, true)}
          let doc = NEW
          ${queryBuilder.returnFilter}
      `,
                bindVars: queryBuilder.bindVars
            };
            return yield this._returnMap(database, query);
        });
    }
    _replaceOrPatch(fOpt = "REPLACE", id, data, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { database, collection } = yield this.connect();
            const ids = Array.isArray(id) ? id : [id];
            let query;
            if (ids.length > 0 && (ids[0] != null || ids[0] != undefined)) {
                const queryBuilder = new queryBuilder_1.QueryBuilder(params, "doc", "changed");
                const colRef = queryBuilder.addBindVar(collection.name, true);
                query = {
                    query: `
        FOR doc IN ${queryBuilder.addBindVar(ids)}
          ${fOpt} doc WITH ${queryBuilder.addBindVar(data)} IN ${colRef}
          LET changed = NEW
          ${queryBuilder.returnFilter}
      `,
                    bindVars: queryBuilder.bindVars
                };
            }
            else {
                const queryBuilder = new queryBuilder_1.QueryBuilder(params, "doc", "changed");
                const colRef = queryBuilder.addBindVar(collection.name, true);
                query = {
                    query: `
        FOR doc IN ${colRef}
          ${queryBuilder.filter}
          ${fOpt} doc WITH ${queryBuilder.addBindVar(data)} IN ${colRef}
          LET changed = NEW
          ${queryBuilder.returnFilter}
      `,
                    bindVars: queryBuilder.bindVars
                };
            }
            return yield this._returnMap(database, query, `No record found for id '${id}'`);
        });
    }
    update(id, data, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._replaceOrPatch("REPLACE", id, data, params);
        });
    }
    patch(id, data, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._replaceOrPatch("UPDATE", id, data, params);
        });
    }
    remove(id, params) {
        return __awaiter(this, void 0, void 0, function* () {
            // Eliminate null or empty clauses
            const ids = Array.isArray(id) ? id : [id];
            // Setup connection & verify
            const { database, collection } = yield this.connect();
            if (!database)
                throw new Error("Database not initialized");
            if (!collection)
                throw new Error("Collection not initialized");
            // Build query
            let query;
            if (id && (!Array.isArray(id) || (Array.isArray(id) && id.length > 0))) {
                const queryBuilder = new queryBuilder_1.QueryBuilder(params, "doc", "removed");
                query = {
                    query: `
        FOR doc IN ${queryBuilder.addBindVar(ids)}
          REMOVE doc IN ${queryBuilder.addBindVar(collection.name, true)}
          LET removed = OLD
          ${queryBuilder.returnFilter}
      `,
                    bindVars: queryBuilder.bindVars
                };
            }
            else {
                const queryBuilder = new queryBuilder_1.QueryBuilder(params, "doc", "removed");
                const colRef = queryBuilder.addBindVar(collection.name, true);
                query = {
                    query: `
        FOR doc IN ${colRef}
          ${queryBuilder.filter}
          REMOVE doc IN ${colRef}
          LET removed = OLD
          ${queryBuilder.returnFilter}
      `,
                    bindVars: queryBuilder.bindVars
                };
            }
            return yield this._returnMap(database, query);
            // let cursor: ArrayCursor;
            // cursor = await database.query(query);
            // let result: any[] = await cursor.map(item => this.fixKeyReturn(item));
            // return result.length > 1 ? result : result[0];
        });
    }
    setup(app, path) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
        });
    }
}
exports.DbService = DbService;
function ArangoDbService(options) {
    return new DbService(options);
}
exports.default = ArangoDbService;
