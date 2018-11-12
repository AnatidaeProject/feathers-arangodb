import _isString from "lodash.isstring";
import _isNumber from "lodash.isnumber";
import _isBoolean from "lodash.isboolean";
import _omit from "lodash.omit";
import _get from "lodash.get";
import _isEmpty from "lodash.isempty";
import { Params } from "@feathersjs/feathers";

export class QueryBuilder {
  reserved = [
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
  bindVars: { [key: string]: any } = {};
  maxLimit = 1000000000; // A billion records...
  _limit: number = -1;
  _countNeed: string = "";
  _skip: number = 0;
  sort: string = "";
  filter: string = "";
  returnFilter: string = "";
  varCount: number = 0;

  constructor(
    params: Params,
    docName: string = "doc",
    returnDocName: string = "doc"
  ) {
    this.create(params, docName, returnDocName);
  }

  addBindVar(value: any, collection = false): string {
    const varName = (collection ? "@" : "") + `value${this.varCount++}`;
    this.bindVars[varName] = value;
    return `@${varName}`;
  }

  selectBuilder(params: Params, docName: string = "doc"): string {
    let filter = `RETURN ${docName}`;
    const select = _get(params, "query.$select", null);
    if (select && select.length > 0) {
      filter = `RETURN {"_key":${docName}._key,`;
      select.forEach((key: string, i: number) => {
        filter += `"${key}":${docName}.${key}`;
        filter += select.length > i + 1 ? "," : "";
      });
      filter += "}";
    }
    this.returnFilter = filter;
    return filter;
  }

  create(
    params: Params,
    docName: string = "doc",
    returnDocName: string = "doc"
  ): QueryBuilder {
    this.selectBuilder(params, returnDocName);
    const query = _get(params, "query", null);
    this._runCheck(query, docName, returnDocName);
    return this;
  }

  _runCheck(
    query: any,
    docName: string = "doc",
    returnDocName: string = "doc",
    operator = "AND"
  ) {
    if (!query || _isEmpty(query)) return this;
    Object.keys(query).forEach((key: string) => {
      const testKey = key.toLowerCase();
      const value = query[key];
      switch (testKey) {
        case "$or":
          const aValue = Array.isArray(value) ? value : [value];
          aValue.forEach(item =>
            this._runCheck(item, docName, returnDocName, "OR")
          );
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

  get limit(): string {
    if (this._limit === -1 && this._skip === 0) return "";
    const realLimit = this._limit > -1 ? this._limit : this.maxLimit;
    return `LIMIT ${this._skip}, ${realLimit}`;
  }

  addSort(sort: any, docName: string = "doc") {
    Object.keys(sort).forEach(key => {
      /* istanbul ignore next */
      if (this.sort === "") {
        this.sort = "SORT ";
      } else {
        this.sort += ", ";
      }
      this.sort += ` ${docName}.${key} ${
        parseInt(sort[key]) === -1 ? "DESC" : ""
      }`;
    });
  }

  addFilter(
    key: string,
    value: any,
    docName: string = "doc",
    operator = "AND"
  ): QueryBuilder {
    const stack = (
      fOpt: string,
      arg1: string,
      arg2: string,
      equality: string
    ) => {
      this.filter += ` ${arg1} ${equality} ${arg2} `;
      delete value[fOpt];
      return this.addFilter(key, value, docName, operator);
    };

    if (typeof value === "object" && _isEmpty(value)) return this;
    if (this.filter === "") {
      this.filter = "FILTER";
    } else {
      this.filter += operator;
      operator = "AND";
    }
    if (_isString(value) || _isBoolean(value) || _isNumber(value)) {
      this.filter += ` ${docName}.${key} == ${this.addBindVar(value)} `;
      return this;
    } else if (typeof value === "object" && value["$in"]) {
      return stack(
        "$in",
        this.addBindVar(value["$in"]),
        `${docName}.${key}`,
        "ANY =="
      );
    } else if (typeof value === "object" && value["$nin"]) {
      return stack(
        "$nin",
        this.addBindVar(value["$nin"]),
        `${docName}.${key}`,
        "NONE =="
      );
    } else if (typeof value === "object" && value["$not"]) {
      return stack(
        "$not",
        `${docName}.${key}`,
        this.addBindVar(value["$not"]),
        "!="
      );
    } else if (typeof value === "object" && value["$lt"]) {
      return stack(
        "$lt",
        `${docName}.${key}`,
        this.addBindVar(value["$lt"]),
        "<"
      );
    } else if (typeof value === "object" && value["$lte"]) {
      return stack(
        "$lte",
        `${docName}.${key}`,
        this.addBindVar(value["$lte"]),
        "<="
      );
    } else if (typeof value === "object" && value["$gt"]) {
      return stack(
        "$gt",
        `${docName}.${key}`,
        this.addBindVar(value["$gt"]),
        ">"
      );
    } else if (typeof value === "object" && value["$gte"]) {
      return stack(
        "$gte",
        `${docName}.${key}`,
        this.addBindVar(value["$gte"]),
        ">="
      );
    } else if (typeof value === "object" && value["$ne"]) {
      return stack(
        "$ne",
        `${docName}.${key}`,
        this.addBindVar(value["$ne"]),
        "!="
      );
    } else {
    /* istanbul ignore next */
      const leftovers = _omit(value, this.reserved);
      /* istanbul ignore next */
      if (!_isEmpty(leftovers))
        this._runCheck(value, docName + `.${key}`, "AND");
    }
    /* istanbul ignore next */
    return this;
  }
}
