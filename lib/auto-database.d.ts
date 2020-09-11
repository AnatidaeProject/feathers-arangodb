import { Database } from "arangojs/database";
import { DocumentCollection } from "arangojs/collection";
import { View } from "arangojs/view";
import { Config } from "arangojs/connection";
import { Graph, GraphVertexCollection } from "arangojs/graph";
export declare class AutoDatabse extends Database {
    constructor(config?: Config);
    /**
     * Will asthmatically create a database of the name if it doesn't exist.
     * @param databaseName
     */
    autoUseDatabase(databaseName: string): Promise<this>;
    /**
     * Will automatically create a graph if one doesn't exist
     * @param properties
     * @param opts
     */
    autoGraph(properties: any, opts?: any): Promise<Graph>;
    /**
     * Will automatically create a collection of the name if it doesn't exist.
     * @param collectionName
     * @param graphRef
     */
    autoCollection(collectionName: string, graphRef?: Graph): Promise<DocumentCollection | GraphVertexCollection>;
    autoView(view: string): Promise<View | undefined>;
}
