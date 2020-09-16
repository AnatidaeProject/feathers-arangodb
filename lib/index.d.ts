import { Database } from "arangojs/database";
import { DocumentCollection } from "arangojs/collection";
import { LoadBalancingStrategy, Config } from "arangojs/connection";
import { AqlQuery } from "arangojs/aql";
import { Graph } from "arangojs/graph";
import { Application, Id, NullableId, Paginated, Params, Service } from "@feathersjs/feathers";
import { AutoDatabse } from "./auto-database";
import { GraphVertexCollection } from "arangojs/graph";
import { View } from "arangojs/view";
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
    view?: View;
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
    view?: View | string | Promise<View>;
    database: AutoDatabse | Database | string | Promise<AutoDatabse | Database>;
    graph?: Graph | IGraphOptions;
    authType?: AUTH_TYPES;
    username?: string;
    password?: string;
    token?: string;
    dbConfig?: Config;
    events?: any[];
    paginate?: Paginate;
}
export interface IArangoDbService<T> extends Service<T> {
    events: any[];
    paginate: Paginate;
    readonly id: string;
    readonly database: Database;
    readonly collection: DocumentCollection | GraphVertexCollection;
    readonly view: View;
    connect(): Promise<IConnectResponse>;
    setup(): Promise<void>;
}
export declare class DbService<T> {
    events: any[];
    readonly options: IOptions;
    private readonly _id;
    private _database;
    private _databasePromise;
    private _collection;
    private _collectionPromise;
    private _view;
    private _viewPromise;
    private _graph;
    private _graphPromise;
    private _paginate;
    constructor(options: IOptions);
    connect(): Promise<IConnectResponse>;
    get id(): string;
    get database(): AutoDatabse | Database | undefined;
    get collection(): DocumentCollection | GraphVertexCollection | undefined;
    get view(): View | undefined;
    get paginate(): Paginate;
    set paginate(option: Paginate);
    _injectPagination(params: Params): Params;
    fixKeySend<T>(data: T | T[]): Partial<T> | Array<Partial<T>>;
    fixKeyReturn(item: any): any;
    _returnMap(database: AutoDatabse | Database, query: AqlQuery, errorMessage?: string, removeArray?: boolean, paging?: boolean): Promise<T | T[] | {
        total: any;
        data: T[];
    }>;
    find(params: Params): Promise<any[] | Paginated<any>>;
    get(id: Id, params: Params): Promise<T | T[] | {
        total: any;
        data: T[];
    }>;
    create(data: Partial<any> | Array<Partial<any>>, params: Params): Promise<T | T[] | {
        total: any;
        data: T[];
    }>;
    _replaceOrPatch(fOpt: string | undefined, id: NullableId | NullableId[], data: Partial<any>, params: Params): Promise<T | T[] | {
        total: any;
        data: T[];
    }>;
    update(id: NullableId | NullableId[], data: Partial<any>, params: Params): Promise<T | T[] | {
        total: any;
        data: T[];
    }>;
    patch(id: NullableId | NullableId[], data: Partial<any>, params: Params): Promise<T | T[] | {
        total: any;
        data: T[];
    }>;
    remove(id: NullableId | NullableId[], params: Params): Promise<T | T[] | {
        total: any;
        data: T[];
    }>;
    setup(app: Application, path: string): Promise<void>;
}
export default function ArangoDbService<T>(options: IOptions): DbService<T> | any;
