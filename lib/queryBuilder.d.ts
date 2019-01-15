import { Params } from "@feathersjs/feathers";
export declare class QueryBuilder {
    reserved: string[];
    bindVars: {
        [key: string]: any;
    };
    maxLimit: number;
    _limit: number;
    _countNeed: string;
    _skip: number;
    sort: string;
    filter: string;
    returnFilter: string;
    varCount: number;
    constructor(params: Params, docName?: string, returnDocName?: string);
    addBindVar(value: any, collection?: boolean): string;
    selectBuilder(params: Params, docName?: string): string;
    create(params: Params, docName?: string, returnDocName?: string): QueryBuilder;
    _runCheck(query: any, docName?: string, returnDocName?: string, operator?: string): this | undefined;
    readonly limit: string;
    addSort(sort: any, docName?: string): void;
    addFilter(key: string, value: any, docName?: string, operator?: string): QueryBuilder;
}
