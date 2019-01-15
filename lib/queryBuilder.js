"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_isstring_1 = __importDefault(require("lodash.isstring"));
const lodash_isnumber_1 = __importDefault(require("lodash.isnumber"));
const lodash_isboolean_1 = __importDefault(require("lodash.isboolean"));
const lodash_omit_1 = __importDefault(require("lodash.omit"));
const lodash_get_1 = __importDefault(require("lodash.get"));
const lodash_isempty_1 = __importDefault(require("lodash.isempty"));
class QueryBuilder {
    constructor(params, docName = "doc", returnDocName = "doc") {
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
            "$aql"
        ];
        this.bindVars = {};
        this.maxLimit = 1000000000; // A billion records...
        this._limit = -1;
        this._countNeed = "";
        this._skip = 0;
        this.sort = "";
        this.filter = "";
        this.returnFilter = "";
        this.varCount = 0;
        this.create(params, docName, returnDocName);
    }
    addBindVar(value, collection = false) {
        const varName = (collection ? "@" : "") + `value${this.varCount++}`;
        this.bindVars[varName] = value;
        return `@${varName}`;
    }
    selectBuilder(params, docName = "doc") {
        let filter = `RETURN ${docName}`;
        const select = lodash_get_1.default(params, "query.$select", null);
        if (select && select.length > 0) {
            filter = `RETURN {"_key":${docName}._key,`;
            select.forEach((key, i) => {
                filter += `"${key}":${docName}.${key}`;
                filter += select.length > i + 1 ? "," : "";
            });
            filter += "}";
        }
        this.returnFilter = filter;
        return filter;
    }
    create(params, docName = "doc", returnDocName = "doc") {
        this.selectBuilder(params, returnDocName);
        const query = lodash_get_1.default(params, "query", null);
        this._runCheck(query, docName, returnDocName);
        return this;
    }
    _runCheck(query, docName = "doc", returnDocName = "doc", operator = "AND") {
        if (!query || lodash_isempty_1.default(query))
            return this;
        Object.keys(query).forEach((key) => {
            const testKey = key.toLowerCase();
            const value = query[key];
            switch (testKey) {
                case "$or":
                    const aValue = Array.isArray(value) ? value : [value];
                    aValue.forEach(item => this._runCheck(item, docName, returnDocName, "OR"));
                    break;
                case "$select":
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
                default:
                    this.addFilter(key, value, docName, operator);
            }
        });
    }
    get limit() {
        if (this._limit === -1 && this._skip === 0)
            return "";
        const realLimit = this._limit > -1 ? this._limit : this.maxLimit;
        return `LIMIT ${this._skip}, ${realLimit}`;
    }
    addSort(sort, docName = "doc") {
        Object.keys(sort).forEach(key => {
            /* istanbul ignore next */
            if (this.sort === "") {
                this.sort = "SORT ";
            }
            else {
                this.sort += ", ";
            }
            this.sort += ` ${docName}.${key} ${parseInt(sort[key]) === -1 ? "DESC" : ""}`;
        });
    }
    addFilter(key, value, docName = "doc", operator = "AND") {
        const stack = (fOpt, arg1, arg2, equality) => {
            this.filter += ` ${arg1} ${equality} ${arg2} `;
            delete value[fOpt];
            return this.addFilter(key, value, docName, operator);
        };
        if (typeof value === "object" && lodash_isempty_1.default(value))
            return this;
        if (this.filter === "") {
            this.filter = "FILTER";
        }
        else {
            this.filter += operator;
            operator = "AND";
        }
        if (lodash_isstring_1.default(value) || lodash_isboolean_1.default(value) || lodash_isnumber_1.default(value)) {
            this.filter += ` ${docName}.${key} == ${this.addBindVar(value)} `;
            return this;
        }
        else if (typeof value === "object" && value["$in"]) {
            return stack("$in", this.addBindVar(value["$in"]), `${docName}.${key}`, "ANY ==");
        }
        else if (typeof value === "object" && value["$nin"]) {
            return stack("$nin", this.addBindVar(value["$nin"]), `${docName}.${key}`, "NONE ==");
        }
        else if (typeof value === "object" && value["$not"]) {
            return stack("$not", `${docName}.${key}`, this.addBindVar(value["$not"]), "!=");
        }
        else if (typeof value === "object" && value["$lt"]) {
            return stack("$lt", `${docName}.${key}`, this.addBindVar(value["$lt"]), "<");
        }
        else if (typeof value === "object" && value["$lte"]) {
            return stack("$lte", `${docName}.${key}`, this.addBindVar(value["$lte"]), "<=");
        }
        else if (typeof value === "object" && value["$gt"]) {
            return stack("$gt", `${docName}.${key}`, this.addBindVar(value["$gt"]), ">");
        }
        else if (typeof value === "object" && value["$gte"]) {
            return stack("$gte", `${docName}.${key}`, this.addBindVar(value["$gte"]), ">=");
        }
        else if (typeof value === "object" && value["$ne"]) {
            return stack("$ne", `${docName}.${key}`, this.addBindVar(value["$ne"]), "!=");
        }
        else {
            /* istanbul ignore next */
            const leftovers = lodash_omit_1.default(value, this.reserved);
            /* istanbul ignore next */
            if (!lodash_isempty_1.default(leftovers))
                this._runCheck(value, docName + `.${key}`, "AND");
        }
        /* istanbul ignore next */
        return this;
    }
}
exports.QueryBuilder = QueryBuilder;
