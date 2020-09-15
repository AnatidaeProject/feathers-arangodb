"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
const isNumber_1 = __importDefault(require("lodash/isNumber"));
const isBoolean_1 = __importDefault(require("lodash/isBoolean"));
const isObject_1 = __importDefault(require("lodash/isObject"));
const isString_1 = __importDefault(require("lodash/isString"));
const omit_1 = __importDefault(require("lodash/omit"));
const get_1 = __importDefault(require("lodash/get"));
const set_1 = __importDefault(require("lodash/set"));
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const arangojs_1 = require("arangojs");
class QueryBuilder {
    constructor(params, collectionName = "", docName = "doc", returnDocName = "doc") {
        this.reserved = [
            "$select",
            "$limit",
            "$skip",
            "$sort",
            "$in",
            "$nin",
            "$lt",
            "$lte",
            "$gt",
            "$gte",
            "$ne",
            "$not",
            "$or",
            "$aql",
            "$resolve",
            "$search"
        ];
        this.bindVars = {};
        this.maxLimit = 1000000000; // A billion records...
        this._limit = -1;
        this._countNeed = "";
        this._skip = 0;
        this.varCount = 0;
        this._collection = collectionName;
        this.create(params, docName, returnDocName);
    }
    projectRecursive(o) {
        const result = Object.keys(o).map((field) => {
            const v = get_1.default(o, field);
            return arangojs_1.aql.join([
                arangojs_1.aql.literal(`"${field}":`),
                isObject_1.default(v)
                    ? arangojs_1.aql.join([
                        arangojs_1.aql.literal("{"),
                        this.projectRecursive(v),
                        arangojs_1.aql.literal("}"),
                    ])
                    : arangojs_1.aql.literal(`${v}`),
            ], " ");
        });
        return arangojs_1.aql.join(result, ", ");
    }
    selectBuilder(params, docName = "doc") {
        let filter = arangojs_1.aql.join([arangojs_1.aql.literal(`RETURN ${docName}`)]);
        const select = get_1.default(params, "query.$select", null);
        if (select && select.length > 0) {
            var ret = {};
            set_1.default(ret, "_key", docName + "._key");
            select.forEach((fieldName) => {
                set_1.default(ret, fieldName, docName + "." + fieldName);
            });
            filter = arangojs_1.aql.join([
                arangojs_1.aql `RETURN`,
                arangojs_1.aql.literal("{"),
                this.projectRecursive(ret),
                arangojs_1.aql.literal("}"),
            ], " ");
        }
        this.returnFilter = filter;
        return filter;
    }
    create(params, docName = "doc", returnDocName = "doc") {
        this.selectBuilder(params, returnDocName);
        const query = get_1.default(params, "query", null);
        this._runCheck(query, docName, returnDocName);
        return this;
    }
    _runCheck(query, docName = "doc", returnDocName = "doc", operator = "AND") {
        if (!query || isEmpty_1.default(query))
            return this;
        Object.keys(query).forEach((key) => {
            const testKey = key.toLowerCase();
            const value = query[key];
            switch (testKey) {
                case "$or":
                    const aValue = Array.isArray(value) ? value : [value];
                    aValue.forEach((item) => this._runCheck(item, docName, returnDocName, "OR"));
                    break;
                case "$select":
                case "$resolve":
                    break;
                case "$limit":
                    this._limit = parseInt(value);
                    break;
                case "$skip":
                    this._skip = parseInt(value);
                    break;
                case "$sort":
                    this.addSort(value, docName);
                    break;
                case "$search":
                    this.addSearch(value, docName);
                    break;
                default:
                    this.addFilter(key, value, docName, operator);
            }
        });
    }
    get limit() {
        if (this._limit === -1 && this._skip === 0)
            return arangojs_1.aql.literal("");
        const realLimit = this._limit > -1 ? this._limit : this.maxLimit;
        return arangojs_1.aql.literal(`LIMIT ${this._skip}, ${realLimit}`);
    }
    addSort(sort, docName = "doc") {
        if (Object.keys(sort).length > 0) {
            this.sort = arangojs_1.aql.join(Object.keys(sort).map((key) => {
                return arangojs_1.aql.literal(`${docName}.${key} ${parseInt(sort[key]) === -1 ? "DESC" : ""}`);
            }), ", ");
        }
    }
    addSearch(query, docName = "doc") {
        switch (this._collection) {
            case 'person':
                this.search = arangojs_1.aql.literal(`NGRAM_MATCH(${docName}.firstName, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.firstName, "${query}")
          OR NGRAM_MATCH(${docName}.lastName, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.lastName, "${query}")
          OR NGRAM_MATCH(${docName}.displayName, "${query}", 0.5, "trigram")
          OR ${docName}.personID == ${parseInt(query) || 0}
          SORT bm25(${docName}) DESC`);
                break;
            case 'person_role':
                this.search = arangojs_1.aql.literal(`${docName}._from IN ( FOR r IN person_view SEARCH
          NGRAM_MATCH(r.firstName, "${query}", 0.6, "trigram")
          OR STARTS_WITH(r.firstName, "${query}")
          OR NGRAM_MATCH(r.lastName, "${query}", 0.6, "trigram")
          OR STARTS_WITH(r.lastName, "${query}")
          OR NGRAM_MATCH(r.displayName, "${query}", 0.5, "trigram")
          OR r.personID == ${parseInt(query) || 0}
          SORT bm25(r) DESC RETURN r._id )
          SORT bm25(${docName}) DESC`);
                break;
            case 'country':
                this.search = arangojs_1.aql.literal(`NGRAM_MATCH(${docName}.nameEn, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.nameEn, "${query}")
          OR NGRAM_MATCH(${docName}.nameNo, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.nameNo, "${query}")
          SORT bm25(${docName}) DESC`);
                break;
            case 'org':
                this.search = arangojs_1.aql.literal(`NGRAM_MATCH(${docName}.name, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.name, "${query}")
          OR ${docName}.churchID == ${parseInt(query) || 0}
          SORT bm25(${docName}) DESC`);
                break;
            default:
                this.search = arangojs_1.aql.literal(`NGRAM_MATCH(${docName}.name, "${query}", 0.8, "trigram")
          OR STARTS_WITH(${docName}.name, "${query}")
          SORT bm25(${docName}) DESC`);
                break;
        }
    }
    addFilter(key, value, docName = "doc", operator = "AND") {
        const stack = (fOpt, arg1, arg2, equality) => {
            this.filter = arangojs_1.aql.join([this.filter, arg1, equality, arg2], " ");
            delete value[fOpt];
            return this.addFilter(key, value, docName, operator);
        };
        if (typeof value === "object" && isEmpty_1.default(value))
            return this;
        if (this.filter == null) {
            this.filter = arangojs_1.aql ``;
        }
        else {
            if (this.filter.query != "") {
                this.filter = arangojs_1.aql.join([this.filter, arangojs_1.aql.literal(`${operator}`)], " ");
                operator = "AND";
            }
        }
        if (isString_1.default(value) || isBoolean_1.default(value) || isNumber_1.default(value)) {
            this.filter = arangojs_1.aql.join([this.filter, arangojs_1.aql.literal(`${docName}.${key} ==`), arangojs_1.aql `${value}`], " ");
            return this;
        }
        else if (typeof value === "object" && value["$in"]) {
            return stack("$in", arangojs_1.aql `${value["$in"]}`, arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql.literal("ANY =="));
        }
        else if (typeof value === "object" && value["$nin"]) {
            return stack("$nin", arangojs_1.aql `${value["$nin"]}`, arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql.literal("NONE =="));
        }
        else if (typeof value === "object" && value["$not"]) {
            return stack("$not", arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql `${value["$not"]}`, arangojs_1.aql.literal("!="));
        }
        else if (typeof value === "object" && value["$lt"]) {
            return stack("$lt", arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql `${value["$lt"]}`, arangojs_1.aql.literal("<"));
        }
        else if (typeof value === "object" && value["$lte"]) {
            return stack("$lte", arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql `${value["$lte"]}`, arangojs_1.aql.literal("<="));
        }
        else if (typeof value === "object" && value["$gt"]) {
            return stack("$gt", arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql `${value["$gt"]}`, arangojs_1.aql.literal(">"));
        }
        else if (typeof value === "object" && value["$gte"]) {
            return stack("$gte", arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql `${value["$gte"]}`, arangojs_1.aql.literal(">="));
        }
        else if (typeof value === "object" && value["$ne"]) {
            return stack("$ne", arangojs_1.aql.literal(`${docName}.${key}`), arangojs_1.aql `${value["$ne"]}`, arangojs_1.aql.literal("!="));
        }
        else {
            /* istanbul ignore next */
            const leftovers = omit_1.default(value, this.reserved);
            /* istanbul ignore next */
            if (!isEmpty_1.default(leftovers)) {
                console.log("DEBUG - leftovers:", leftovers);
                this._runCheck(value, docName + `.${key}`, "AND");
            }
        }
        /* istanbul ignore next */
        return this;
    }
}
exports.QueryBuilder = QueryBuilder;
