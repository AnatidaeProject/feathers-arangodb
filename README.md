# feathers-arangodb

[![Build Status](https://travis-ci.org/AnatidaeProject/feathers-arangodb.png?branch=master)](https://travis-ci.org/AnatidaeProject/feathers-arangodb)  
[![Dependency Status](https://img.shields.io/david/AnatidaeProject/feathers-arangodb.svg?style=flat-square)](https://david-dm.org/AnatidaeProject/feathers-arangodb)  
[![Download Status](https://img.shields.io/npm/dm/feathers-arangodb.svg?style=flat-square)](https://www.npmjs.com/package/feathers-arangodb)

A [Feathers](https://feathersjs.com) database adapter for [ArangoDB](https://www.arango.org/) using [official NodeJS driver for ArangoDB](https://github.com/arangodb/arangojs).

```bash
$ npm install --save arangojs feathers-arangodb
```

> **Important:** `feathers-arangodb` implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html) and [querying syntax](https://docs.feathersjs.com/api/databases/querying.html).

> This adapter also requires a [running ArangoDB](https://docs.arangodb.com/3.3/Manual/GettingStarted/) database server.

---

### Simple Server Example

```javascript
import express from '@feathersjs/express';
import feathers, {HookContext} from '@feathersjs/feathers';
import cors from 'cors';
import helmet from 'helmet';
import compress from 'compression';
import ArangoDbService, { IArangoDbService, IOptions, AUTH_TYPES } from 'feathers-arangodb'
import { aql } from "arangojs";

// Set up your feathers app.
const app = express(feathers());
app.use(helmet());
app.use(cors());
app.use(compress());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.configure(express.rest());

// Create your database settings
const todoDatabase:IOptions = {
  collection: 'TODOS',
  database: 'YOUR_DATABASE_NAME',
  authType: AUTH_TYPES.BASIC_AUTH,
  username: 'root',
  password: 'root',
};
// Fast and simple CRUD
app.use('todos', ArangoDbService(todoDatabase));

// Add in some hooks!
const todoService = <IArangoDbService<any>>app.service('todos');
todoService.hooks({
  after: {
    create: [
      async (context:HookContext) => {
        // Maybe we want run another AQL query directly on the database.
        const { database, collection } = await todoService.connect();
        // Do a query
        const cursor = await database.query(aql`RETURN LENGTH(${collection})`)
        // Parse the cursor
        const count = await cursor.next();
        // Assign some data to the stuff
        context.result = {
          count,
          data: context.result
        };
        return context;
      }
    ]
  }
});

// Start the app listening
app.listen(8080);
console.log('Listening on port 8080');
```

#### Database Options

**id** _(optional)_ : String : Translated ID key value in payloads. Actual storage in database is saved in the `_key` key/value within ArangoDB. Defaults to `_key`

**expandData** _(optional)_ : Boolean : Adapter filters out `_rev` and `_id` from ArangoDB. Setting expandData to true will include these in the payload results. Defaults to `false`

**collection** _(required)_ : Collection | String : Either a string name of a collection, which will be created if it doesn't exist in database, or a reference to an existing arangoDB collection object.

**database** _(required)_ : Database | String : Either a string name of a database, which will be created if it doesn't exist on the ArangoDB server, or a reference to an existing ArangoDB database object.

**graph** _(optional)_ : Graph | { properties, opts } : Graph options to create a new graph. `name` is required in the properties. [See Documentation](https://docs.arangodb.com/devel/HTTP/Gharial/Management.html#create-a-graph)

**authType** _(optional)_ : String : String value of either `BASIC_AUTH` or `BEARER_AUTH`. Used to define the type of auth to ArangoDB ([see documentation](https://docs.arangodb.com/devel/Drivers/JS/Reference/Database/#databaseusebasicauth)). Defaults to `BASIC_AUTH`

**username** _(optional)_ : String : Used for auth, plaintext username

**password** _(optional)_ : String : Used for auth, plaintext password

**token** _(optional)_ : String : If token is supplied, auth uses token instead of username/password.

**dbConfig** _(optional)_ : ArangoDbConfig : ArangoDB Config file for a new database. [See Documentation](https://docs.arangodb.com/devel/Drivers/JS/Reference/Database/#new-database)

**events** _(optional)_ : Array : FeathersJS Events - [See Documentation](https://docs.feathersjs.com/api/events.html)

**paginate** _(optional)_ : FeathersJS Paginate : FeathersJS Paginate - [See Documentation](https://docs.feathersjs.com/api/databases/common.html#pagination)

Copyright (c) 2018

Licensed under the [MIT license](LICENSE).
