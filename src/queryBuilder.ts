import _isNumber from "lodash/isNumber";
import _isBoolean from "lodash/isBoolean";
import _isObject from "lodash/isObject";
import _isString from "lodash/isString";
import _omit from "lodash/omit";
import _get from "lodash/get";
import _set from "lodash/set";
import _isEmpty from "lodash/isEmpty";
import { Params } from "@feathersjs/feathers";
import { aql } from "arangojs";
import { AqlQuery, AqlValue } from "arangojs/aql";
import { AqlLiteral } from "arangojs/aql";

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
    "$aql",
    "$resolve",
    "$search"
  ];
  bindVars: { [key: string]: any } = {};
  maxLimit = 1000000000; // A billion records...
  _limit: number = -1;
  _countNeed: string = "";
  _skip: number = 0;
  sort?: AqlQuery;
  filter?: AqlQuery;
  returnFilter?: AqlQuery;
  _collection: string;
  search?: AqlLiteral;
  varCount: number = 0;

  constructor(
    params: Params,
    collectionName: string = "",
    docName: string = "doc",
    returnDocName: string = "doc"
  ) {
    this._collection = collectionName;
    this.create(params, docName, returnDocName);
  }

  projectRecursive(o: object): AqlValue {
    const result = Object.keys(o).map((field: string) => {
      const v: any = _get(o, field);
      return aql.join(
        [
          aql.literal(`"${field}":`),
          _isObject(v)
            ? aql.join([
                aql.literal("{"),
                this.projectRecursive(v),
                aql.literal("}"),
              ])
            : aql.literal(`${v}`),
        ],
        " "
      );
    });

    return aql.join(result, ", ");
  }

  selectBuilder(params: Params, docName: string = "doc"): AqlQuery {
    let filter = aql.join([aql.literal(`RETURN ${docName}`)]);
    const select = _get(params, "query.$select", null);
    if (select && select.length > 0) {
      var ret = {};
      _set(ret, "_key", docName + "._key");
      select.forEach((fieldName: string) => {
        _set(ret, fieldName, docName + "." + fieldName);
      });
      filter = aql.join(
        [
          aql`RETURN`,
          aql.literal("{"),
          this.projectRecursive(ret),
          aql.literal("}"),
        ],
        " "
      );
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
          aValue.forEach((item) =>
            this._runCheck(item, docName, returnDocName, "OR")
          );
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

  get limit(): AqlValue {
    if (this._limit === -1 && this._skip === 0) return aql.literal("");
    const realLimit = this._limit > -1 ? this._limit : this.maxLimit;
    return aql.literal(`LIMIT ${this._skip}, ${realLimit}`);
  }

  addSort(sort: any, docName: string = "doc") {
    if (Object.keys(sort).length > 0) {
      this.sort = aql.join(
        Object.keys(sort).map((key: string) => {
          return aql.literal(
            `${docName}.${key} ${parseInt(sort[key]) === -1 ? "DESC" : ""}`
          );
        }),
        ", "
      );
    }
  }

  addSearch(query: any, docName: string = "doc") {
    switch(this._collection) {
      case 'person':
        this.search = aql.literal(
          `NGRAM_MATCH(${docName}.firstName, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.firstName, "${query}")
          OR NGRAM_MATCH(${docName}.lastName, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.lastName, "${query}")
          OR NGRAM_MATCH(${docName}.displayName, "${query}", 0.5, "trigram")
          OR ${docName}.personID == ${parseInt(query) || 0}
          SORT bm25(${docName}) DESC`);
        break;
      case 'person_role':
        this.search = aql.literal(
          `${docName}._from IN ( FOR r IN person_view SEARCH
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
        this.search = aql.literal(`NGRAM_MATCH(${docName}.nameEn, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.nameEn, "${query}")
          OR NGRAM_MATCH(${docName}.nameNo, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.nameNo, "${query}")
          SORT bm25(${docName}) DESC`);
        break;
      case 'org':
        this.search = aql.literal(`NGRAM_MATCH(${docName}.name, "${query}", 0.6, "trigram")
          OR STARTS_WITH(${docName}.name, "${query}")
          OR ${docName}.churchID == ${parseInt(query) || 0}
          SORT bm25(${docName}) DESC`);
        break;
      default:
        this.search = aql.literal(`NGRAM_MATCH(${docName}.name, "${query}", 0.8, "trigram")
          OR STARTS_WITH(${docName}.name, "${query}")
          SORT bm25(${docName}) DESC`);
        break;
    }
  }

  addFilter(
    key: string,
    value: any,
    docName: string = "doc",
    operator = "AND"
  ): QueryBuilder {
    const stack = (
      fOpt: string,
      arg1: AqlValue,
      arg2: AqlValue,
      equality: AqlValue
    ) => {
      this.filter = aql.join([this.filter, arg1, equality, arg2], " ");
      delete value[fOpt];
      return this.addFilter(key, value, docName, operator);
    };

    if (typeof value === "object" && _isEmpty(value)) return this;

    if (this.filter == null) {
      this.filter = aql``;
    } else {
      if (this.filter.query != "") {
        this.filter = aql.join([this.filter, aql.literal(`${operator}`)], " ");
        operator = "AND";
      }
    }
    if (_isString(value) || _isBoolean(value) || _isNumber(value)) {
      this.filter = aql.join(
        [this.filter, aql.literal(`${docName}.${key} ==`), aql`${value}`],
        " "
      );
      return this;
    } else if (typeof value === "object" && value["$in"]) {
      return stack(
        "$in",
        aql`${value["$in"]}`,
        aql.literal(`${docName}.${key}`),
        aql.literal("ANY ==")
      );
    } else if (typeof value === "object" && value["$nin"]) {
      return stack(
        "$nin",
        aql`${value["$nin"]}`,
        aql.literal(`${docName}.${key}`),
        aql.literal("NONE ==")
      );
    } else if (typeof value === "object" && value["$not"]) {
      return stack(
        "$not",
        aql.literal(`${docName}.${key}`),
        aql`${value["$not"]}`,
        aql.literal("!=")
      );
    } else if (typeof value === "object" && value["$lt"]) {
      return stack(
        "$lt",
        aql.literal(`${docName}.${key}`),
        aql`${value["$lt"]}`,
        aql.literal("<")
      );
    } else if (typeof value === "object" && value["$lte"]) {
      return stack(
        "$lte",
        aql.literal(`${docName}.${key}`),
        aql`${value["$lte"]}`,
        aql.literal("<=")
      );
    } else if (typeof value === "object" && value["$gt"]) {
      return stack(
        "$gt",
        aql.literal(`${docName}.${key}`),
        aql`${value["$gt"]}`,
        aql.literal(">")
      );
    } else if (typeof value === "object" && value["$gte"]) {
      return stack(
        "$gte",
        aql.literal(`${docName}.${key}`),
        aql`${value["$gte"]}`,
        aql.literal(">=")
      );
    } else if (typeof value === "object" && value["$ne"]) {
      return stack(
        "$ne",
        aql.literal(`${docName}.${key}`),
        aql`${value["$ne"]}`,
        aql.literal("!=")
      );
    } else {
      /* istanbul ignore next */
      const leftovers = _omit(value, this.reserved);
      /* istanbul ignore next */
      if (!_isEmpty(leftovers)) {
        console.log("DEBUG - leftovers:", leftovers);

        this._runCheck(value, docName + `.${key}`, "AND");
      }
    }
    /* istanbul ignore next */
    return this;
  }
}
