/*
Extends the ArangoDB Database Class to offer helper functions.
 */

import { Database, DocumentCollection, aql } from "arangojs";
import { Config } from "arangojs/lib/cjs/connection";

export class AutoDatabse extends Database {
  constructor(config?: Config) {
    super(config);
  }

  /**
   * Will asthmatically create a database of the name if it doesn't exist.
   * @param databaseName
   */
  async autoUseDatabase(databaseName: string): Promise<this> {
    const databaseList = await this.listUserDatabases();
    /* istanbul ignore next  */
    if (databaseList.indexOf(databaseName) === -1) {
      /* istanbul ignore next  ArangoDB Driver tests covered in driver*/
      await this.createDatabase(databaseName);
    }
    this.useDatabase(databaseName);
    return this;
  }

  /**
   * Will automatically create a collection of the name if it doesn't exist.
   * @param collectionName
   */
  async autoCollection(collectionName: string): Promise<DocumentCollection> {
    const collectionList = await this.collections();
    /* istanbul ignore next  */
    if (
      collectionList.map((item: any) => item.name).indexOf(collectionName) ===
      -1
    ) {
      /* istanbul ignore next  */
      await this.collection(collectionName).create({
        waitForSync: true // always sync document changes to disk
      });
    }
    return this.collection(collectionName);
  }
}
