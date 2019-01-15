import { Database, DocumentCollection } from "arangojs";
import { LoadBalancingStrategy } from "arangojs/lib/async/connection";
import { AqlQuery } from "arangojs/lib/cjs/aql-query";
import { Graph } from "arangojs/lib/cjs/graph";
import { Application, Id, NullableId, Paginated, Params, Service } from "feathersjs__feathers";
import { AutoDatabse } from "./auto-database";
import { GraphVertexCollection } from "arangojs/lib/cjs/graph";
export declare type ArangoDbConfig = string | string[] | Partial<{
    url: string | string[];
    isAbsolute: boolean;
    arangoVersion: number;
    loadBalancingStrategy: LoadBalancingStrategy;
    maxRetries: false | number;
    agent: any;
    agentOptions: {
        [key: string]: any;
    };
    headers: {
        [key: string]: string;
    };
}>;
export declare enum AUTH_TYPES {
    BASIC_AUTH = "BASIC_AUTH",
    BEARER_AUTH = "BEARER_AUTH"
}
export declare interface Paginate {
    max?: number;
    default?: number;
}
export interface IConnectResponse {
    database: AutoDatabse | Database;
    collection: DocumentCollection | GraphVertexCollection;
    graph?: Graph;
}
export interface IGraphOptions {
    properties?: any;
    opts?: {
        waitForSync?: boolean;
    };
}
export interface IOptions {
    id?: string;
    expandData?: boolean;
    collection: DocumentCollection | GraphVertexCollection | string | Promise<DocumentCollection | GraphVertexCollection>;
    database: AutoDatabse | Database | string | Promise<AutoDatabse | Database>;
    graph?: Graph | IGraphOptions;
    authType?: AUTH_TYPES;
    username?: string;
    password?: string;
    token?: string;
    dbConfig?: ArangoDbConfig;
    events?: any[];
    paginate?: Paginate;
}
export interface IArangoDbService<T> extends Service<T> {
    events: any[];
    paginate: Paginate;
    readonly id: string;
    readonly database: Database;
    readonly collection: DocumentCollection | GraphVertexCollection;
    connect(): Promise<IConnectResponse>;
    setup(): Promise<void>;
}
export declare class DbService {
    events: any[];
    readonly options: IOptions;
    private readonly _id;
    private _database;
    private _databasePromise;
    private _collection;
    private _collectionPromise;
    private _graph;
    private _graphPromise;
    private _paginate;
    constructor(options: IOptions);
    connect(): Promise<IConnectResponse>;
    readonly id: string;
    readonly database: AutoDatabse | Database | undefined;
    readonly collection: DocumentCollection | GraphVertexCollection | undefined;
    paginate: Paginate;
    _injectPagination(params: Params): Params;
    fixKeySend<T>(data: T | T[]): Partial<T> | Array<Partial<T>>;
    fixKeyReturn(item: any): any;
    _returnMap(database: AutoDatabse | Database, query: AqlQuery, errorMessage?: string, removeArray?: boolean, paging?: boolean): Promise<any>;
    find(params: Params): Promise<any[] | Paginated<any>>;
    get(id: Id, params: Params): Promise<any>;
    create(data: Partial<any> | Array<Partial<any>>, params: Params): Promise<any>;
    _replaceOrPatch(fOpt: string | undefined, id: NullableId | NullableId[], data: Partial<any>, params: Params): Promise<any>;
    update(id: NullableId | NullableId[], data: Partial<any>, params: Params): Promise<any>;
    patch(id: NullableId | NullableId[], data: Partial<any>, params: Params): Promise<any>;
    remove(id: NullableId | NullableId[], params: Params): Promise<any>;
    setup(app: Application, path: string): Promise<void>;
}
export default function ArangoDbService(options: IOptions): DbService | any;
