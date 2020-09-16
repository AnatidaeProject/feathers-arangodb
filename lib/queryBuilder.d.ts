import { Params } from "@feathersjs/feathers";
import { AqlQuery, AqlValue } from "arangojs/aql";
import { AqlLiteral } from "arangojs/aql";
export declare class QueryBuilder {
    reserved: string[];
    bindVars: {
        [key: string]: any;
    };
    maxLimit: number;
    _limit: number;
    _countNeed: string;
    _skip: number;
    sort?: AqlQuery;
    filter?: AqlQuery;
    returnFilter?: AqlQuery;
    _collection: string;
    search?: AqlLiteral;
    varCount: number;
    constructor(params: Params, collectionName?: string, docName?: string, returnDocName?: string);
    projectRecursive(o: object): AqlValue;
    selectBuilder(params: Params, docName?: string): AqlQuery;
    create(params: Params, docName?: string, returnDocName?: string): QueryBuilder;
    _runCheck(query: any, docName?: string, returnDocName?: string, operator?: string): this | undefined;
    get limit(): AqlValue;
    addSort(sort: any, docName?: string): void;
    addSearch(query: any, docName?: string): void;
    addFilter(key: string, value: any, docName?: string, operator?: string): QueryBuilder;
}
