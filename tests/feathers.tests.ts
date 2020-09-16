import feathers from "@feathersjs/feathers";
import { Application } from "@feathersjs/feathers";
import { NotFound } from "@feathersjs/errors";
import ArangoDbService, { IArangoDbService, AUTH_TYPES } from "../src";
import { AutoDatabse } from "../src/auto-database";

const serviceName = "people";
const idProp = "id";

describe(`Feathers common tests, ${serviceName} service with \\${idProp}\\ id property `, () => {
  const promiseDatabase = "TEST_PROMISE_DB";
  const testDatabase = "TEST_DB";
  const testCollection = "TEST_COL";
  const testUser = "root";
  const testPass = "root";
  let app: Application<any>;
  let service: IArangoDbService<any>;
  let _ids: any = {};

  beforeAll(async () => {
    app = feathers();
    app.use(
      `/${serviceName}`,
      ArangoDbService({
        id: idProp,
        collection: testCollection,
        database: testDatabase,
        authType: AUTH_TYPES.BASIC_AUTH,
        username: testUser,
        password: testPass,
        events: ["testing"],
      })
    );
    service = <IArangoDbService<any>>app.service(serviceName);
  });

  afterAll(async (done) => {
    const database = new AutoDatabse();
    database.useBasicAuth(testUser, testPass);
    await database.dropDatabase(testDatabase);
    await database.dropDatabase(promiseDatabase);
    done();
  });

  beforeEach(async () => {
    const data: any = await service.create({
      name: "Doug",
      age: 32,
    });
    _ids.Doug = data[idProp];
  });

  afterEach(async () => {
    await service.remove(_ids.Doug).catch(() => {});
  });

  it("Service connects", async () => {
    await service.connect();
    expect(service.database).toBeDefined();
    expect(service.collection).toBeDefined();
  });

  it("Can connect to a specified database url", async () => {
    app.use(
      `/tasks`,
      ArangoDbService({
        id: idProp,
        collection: "tasks",
        database: testDatabase,
        authType: AUTH_TYPES.BASIC_AUTH,
        username: testUser,
        password: testPass,
        events: ["testing"],
        dbConfig: {
          url: "http://localhost:8529",
        },
      })
    );
    const otherUrl = <IArangoDbService<any>>app.service("tasks");
    await otherUrl.connect();
    expect(otherUrl.database).toBeDefined();
    expect(otherUrl.collection).toBeDefined();
  });

  it("Service setup check", async () => {
    await service.setup();
    expect(service.database).toBeDefined();
    expect(service.collection).toBeDefined();
  });

  it("works", async () => {
    const something = true;
    expect(service).toBeDefined();
    expect(something).toBeTruthy();
  });

  it("sets `id` property on the service", () => {
    expect(service.id).toEqual(idProp);
  });

  it("Accepts a promise as a database reference", async () => {
    const autoDb = new AutoDatabse();
    autoDb.useBasicAuth(testUser, testPass);
    const promiseDb = autoDb.autoUseDatabase(promiseDatabase);
    const dbService = ArangoDbService({
      id: idProp,
      collection: testCollection,
      database: promiseDb,
    });
    await dbService.connect();
    const info = await dbService.database.get();
    expect(dbService.database).toBeDefined();
    expect(dbService.collection).toBeDefined();
    expect(info.name).toEqual(promiseDatabase);
  });

  it("Accepts a promise as a collection reference", async () => {
    const autoDb = new AutoDatabse();
    autoDb.useBasicAuth(testUser, testPass);
    const db = await autoDb.autoUseDatabase(promiseDatabase);
    const collectionPromise = autoDb.autoCollection("PROMISE_COLLECTION");
    const dbService = ArangoDbService({
      id: idProp,
      collection: collectionPromise,
      database: db,
    });
    await dbService.connect();
    const info = await dbService.collection.get();
    expect(dbService.database).toBeDefined();
    expect(dbService.collection).toBeDefined();
    expect(info.name).toEqual("PROMISE_COLLECTION");
  });

  it("Accepts string as database & collection", async () => {
    const dbService = ArangoDbService({
      id: idProp,
      collection: testCollection,
      database: testDatabase,
      authType: AUTH_TYPES.BASIC_AUTH,
      username: testUser,
      password: testPass,
    });
    await dbService.connect();
    expect(dbService.database).toBeDefined();
    expect(dbService.collection).toBeDefined();
  });

  it("Accepts a database & collection as arguments", async () => {
    const database = new AutoDatabse();
    database.useBasicAuth(testUser, testPass);
    database.useDatabase(testDatabase);
    const collection = await database.collection(testCollection);
    const dbService = ArangoDbService({
      database,
      collection,
    });
    expect(dbService.database).toBeDefined();
    expect(dbService.collection).toBeDefined();
  });

  it("sets `events` property from options", () => {
    expect(service.events.indexOf("testing")).not.toEqual(-1);
  });

  describe("extend", () => {
    it("extends and uses extended method", async (done) => {
      const now = new Date().getTime();
      // @ts-ignore  Extend added inside feathersJS via Uberproto
      const extended = service.extend({
        create: function create(data: any) {
          data.time = now;
          return this._super.apply(this, arguments);
        },
      });
      const createResult = await extended.create({ name: "Dave" });
      const removeResult = await extended.remove(createResult[idProp]);
      expect(removeResult.time).toEqual(now);
      done();
    });
  });

  describe("get", () => {
    it("returns an instance that exists", async () => {
      const result = await service.get(_ids.Doug);
      expect(result[idProp].toString()).toEqual(_ids.Doug.toString());
      expect(result.name).toEqual("Doug");
      expect(result.age).toEqual(32);
    });

    it("supports $select", async () => {
      const result = await service.get(_ids.Doug, {
        query: { $select: ["name"] },
      });
      expect(result[idProp]).toEqual(_ids.Doug);
      expect(result.name).toEqual("Doug");
      expect(result.age).toBeUndefined();
    });

    it("returns NotFound error for non-existing id", (done) => {
      const badId = "568225fbfe21222432e836ff";
      service
        .get(badId)
        .then(() => {
          throw Error("Should NOT succeed!!!");
        })
        .catch((error) => {
          expect(error instanceof NotFound).toBeTruthy();
          expect(error.message).toEqual(`No record found for id '${badId}'`);
          done();
        });
    });
  });

  describe("remove", () => {
    it("deletes an existing instance and returns the deleted instance", async () => {
      const result = await service.remove(_ids.Doug);
      expect(result.name).toEqual("Doug");
    });

    it("deletes an existing instance supports $select", async () => {
      const result = await service.remove(_ids.Doug, {
        query: { $select: ["name"] },
      });
      expect(result[idProp]).toEqual(_ids.Doug);
      expect(result.name).toEqual("Doug");

      expect(result.age).toBeUndefined();
    });

    it("deletes multiple instances", async () => {
      await service.create({ name: "Dave", age: 29, created: true });
      await service.create({ name: "David", age: 48, created: true });
      const result = await service.remove(null, { query: { created: true } });
      const names = result.map((person: any) => person.name);
      expect(names.indexOf("Dave")).toBeGreaterThan(-1);
      expect(names.indexOf("David")).toBeGreaterThan(-1);
    });
  });

  describe("find", () => {
    // Doug 32, Bob 25, Alice 19
    beforeEach(async () => {
      const bob = await service.create({ name: "Bob", age: 25 });
      _ids.Bob = bob[idProp];
      const alice = await service.create({
        name: "Alice",
        age: 19,
        address: {
          line1: "123 Some St.",
          city: "Sommerville",
        },
      });
      _ids.Alice = alice[idProp];
    });

    afterEach(async () => {
      await service.remove(_ids.Bob);
      await service.remove(_ids.Alice);
    });

    it("returns all items", async () => {
      const result = <[any]>await service.find();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toEqual(3);
    });

    it("filters results by a single parameter", async () => {
      const result = <[any]>await service.find({ query: { name: "Alice" } });
      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toEqual(1);
      expect(result[0].name).toEqual("Alice");
    });

    it("filters results by multiple parameters", async () => {
      // TODO This is a POOR test. Should be strengthened by having more than one age 19 or Alice
      const result = <[any]>(
        await service.find({ query: { name: "Alice", age: 19 } })
      );
      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toEqual(1);
      expect(result[0].name).toEqual("Alice");
    });

    describe("special filters", () => {
      it("can $sort", async () => {
        const params = {
          query: { $sort: { name: 1 } },
        };
        const result = <Array<any>>await service.find(params);
        expect(result.length).toEqual(3);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Bob");
        expect(result[2].name).toEqual("Doug");
      });

      it("can $sort with strings", async () => {
        const params = {
          query: { $sort: { name: "1" } },
        };
        const result = <Array<any>>await service.find(params);
        expect(result.length).toEqual(3);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Bob");
        expect(result[2].name).toEqual("Doug");
      });

      it("can $limit", async () => {
        const params = {
          query: { $limit: 2 },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
      });

      it("can $limit 0", async () => {
        const params = {
          query: { $limit: 0 },
        };
        const result = <any[]>await service.find(params);

        console.log("result", JSON.stringify(result));

        expect(result.length).toEqual(0);
      });

      it("can $skip", async () => {
        const params = {
          query: { $sort: { name: 1 }, $skip: 1 },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Bob");
        expect(result[1].name).toEqual("Doug");
      });

      it("can $select", async () => {
        const params = {
          query: { name: "Alice", $select: ["name"] },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(1);
        expect(result[0].name).toEqual("Alice");
        expect(result[0].age).toBeUndefined();
      });

      it("can $select nested property", async () => {
        const params = {
          query: {
            name: "Alice",
            $select: ["address.line1", "name", "address.city"],
          },
        };
        const result = <any[]>await service.find(params);

        expect(result.length).toEqual(1);
        expect(result[0].name).toEqual("Alice");
        expect(result[0].age).toBeUndefined();
        expect(result[0].address.line1).toEqual("123 Some St.");
        expect(result[0].address.city).toEqual("Sommerville");
      });

      it("can $or", async () => {
        const params = {
          query: {
            $or: [{ name: "Alice" }, { name: "Bob" }],
            $sort: { name: 1 },
          },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Bob");
      });

      it("can $not", async () => {
        const params = {
          query: { age: { $not: 19 }, name: { $not: "Doug" } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(1);
        expect(result[0].name).toEqual("Bob");
      });

      it("can $in", async () => {
        const params = {
          query: { name: { $in: ["Alice", "Bob"] }, $sort: { name: 1 } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Bob");
      });

      it("can $nin", async () => {
        const params = {
          query: { name: { $nin: ["Alice", "Bob"] } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(1);
        expect(result[0].name).toEqual("Doug");
      });

      it("can $lt", async () => {
        const params = {
          query: { age: { $lt: 30 }, $sort: { name: 1 } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Bob");
      });

      it("can $lte", async () => {
        const params = {
          query: { age: { $lte: 25 }, $sort: { name: 1 } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Bob");
      });

      it("can $gt", async () => {
        const params = {
          query: { age: { $gt: 30 }, $sort: { name: 1 } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(1);
        expect(result[0].name).toEqual("Doug");
      });

      it("can $gte", async () => {
        const params = {
          query: { age: { $gte: 25 }, $sort: { name: 1 } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Bob");
        expect(result[1].name).toEqual("Doug");
      });

      it("can $ne", async () => {
        const params = {
          query: { age: { $ne: 25 }, $sort: { name: 1 } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Doug");
      });

      it("can $gt and $lt and $sort", async () => {
        const params = {
          query: { age: { $gt: 18, $lt: 30 }, $sort: { name: 1 } },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Bob");
      });

      it("can handle nested $or queries and $sort", async () => {
        const params = {
          query: {
            $or: [
              { name: "Doug" },
              {
                age: {
                  $gte: 18,
                  $lt: 25,
                },
              },
            ],
            $sort: { name: 1 },
          },
        };
        const result = <any[]>await service.find(params);
        expect(result.length).toEqual(2);
        expect(result[0].name).toEqual("Alice");
        expect(result[1].name).toEqual("Doug");
      });
    });

    describe("paginate", () => {
      beforeEach(() => {
        service.paginate = { default: 1, max: 2 };
      });
      afterEach(() => {
        service.paginate = {};
      });

      it("returns paginated object, paginates by default and shows total", async () => {
        const params = { query: { $sort: { name: -1 } } };
        const result = <any>await service.find(params);
        expect(result.total).toEqual(3);
        expect(result.limit).toEqual(1);
        expect(result.skip).toEqual(0);
        expect(result.data[0].name).toEqual("Doug");
      });

      it("paginates max and skips", async () => {
        const params = { query: { $skip: 1, $limit: 4, $sort: { name: -1 } } };
        const result = <any>await service.find(params);
        expect(result.total).toEqual(3);
        expect(result.limit).toEqual(2);
        expect(result.skip).toEqual(1);
        expect(result.data[0].name).toEqual("Bob");
        expect(result.data[1].name).toEqual("Alice");
      });

      it("$limit 0 with pagination", async () => {
        const params = { query: { $limit: 0 } };
        const result = <any>await service.find(params);
        expect(result.data.length).toEqual(0);
      });

      it("allows to override paginate in params", async () => {
        const params = { paginate: { default: 2, max: 1000 } };
        const result = <any>await service.find(params);
        expect(result.limit).toEqual(2);
        expect(result.skip).toEqual(0);
      });
    });
  });

  describe("update", () => {
    it("replaces an existing instance, does not modify original data", async () => {
      const newData: any = { name: "Dougler" };
      newData[idProp] = _ids.Doug;
      const result = await service.update(_ids.Doug, newData);
      expect(result[idProp]).toEqual(_ids.Doug);
      expect(result.name).toEqual("Dougler");
      expect(result.age).toBeUndefined();
    });

    it("replaces an existing instance, supports $select", async () => {
      const newData: any = { name: "Dougler", age: 10 };
      newData[idProp] = _ids.Doug;
      const result = await service.update(_ids.Doug, newData, {
        query: { $select: ["name"] },
      });
      expect(result[idProp]).toEqual(_ids.Doug);
      expect(result.name).toEqual("Dougler");
      expect(result.age).toBeUndefined();
    });

    it("returns NotFound error for non-existing id", async (done) => {
      const badId = "568225fbfe21222432e836ff";
      const newData: any = { name: "NotFound" };
      newData[idProp] = badId;
      await service.update(badId, newData).catch((error) => {
        expect(error instanceof NotFound).toBeTruthy();
        expect(error.message).toEqual(`No record found for id '${badId}'`);
        done();
      });
    });
  });

  describe("patch", () => {
    it("updates an existing instance, does not modify original data", async () => {
      const newData: any = { name: "PatchDoug" };
      newData[idProp] = _ids.Doug;
      const result = await service.patch(_ids.Doug, newData);
      expect(result[idProp]).toEqual(_ids.Doug);
      expect(result.name).toEqual("PatchDoug");
      expect(result.age).toEqual(32);
    });

    it("updates an existing instance, supports $select", async () => {
      const newData: any = { name: "PatchDoug" };
      newData[idProp] = _ids.Doug;
      const result = await service.patch(_ids.Doug, newData, {
        query: { $select: ["name"] },
      });
      expect(result[idProp]).toEqual(_ids.Doug);
      expect(result.name).toEqual("PatchDoug");
      expect(result.age).toBeUndefined();
    });

    it("patches multiple instances", async (done) => {
      const params = { query: { created: true } };
      await service.create({ name: "Dave", age: 29, created: true });
      await service.create({ name: "David", age: 3, created: true });
      const result = await service.patch(null, { age: 2 }, params);
      expect(result.length).toEqual(2);
      expect(result[0].age).toEqual(2);
      expect(result[1].age).toEqual(2);
      await service.remove(null, params);
      done();
    });

    it("patches multiple instances and returns the actually changed items", async (done) => {
      const params = { query: { age: { $lt: 10 } } };
      await service.create({ name: "Dave", age: 8, created: true });
      await service.create({ name: "David", age: 4, created: true });
      const result = await service.patch(null, { age: 2 }, params);
      expect(result.length).toEqual(2);
      expect(result[0].age).toEqual(2);
      expect(result[1].age).toEqual(2);
      await service.remove(null, params);
      done();
    });

    it("patches multiple, returns correct items", async (done) => {
      await service.create({ name: "Dave", age: 2, created: true });
      await service.create({ name: "David", age: 2, created: true });
      await service.create({ name: "Frank", age: 8, created: true });
      const result = await service.patch(
        null,
        { age: 8 },
        { query: { age: 2 } }
      );
      expect(result.length).toEqual(2);
      expect(result[0].age).toEqual(8);
      expect(result[1].age).toEqual(8);
      await service.remove(null, { query: { age: 8 } });
      done();
    });

    it("returns NotFound error for non-existing id", async (done) => {
      const badId = "568225fbfe21222432e836ff";
      const newData: any = { name: "NotFound" };
      newData[idProp] = badId;
      await service.patch(badId, newData).catch((error) => {
        expect(error instanceof NotFound).toBeTruthy();
        expect(error.message).toEqual(`No record found for id '${badId}'`);
        done();
      });
    });
  });

  describe("create", () => {
    it("creates a single new instance and returns the created instance", async () => {
      const originalData = { name: "Bill", age: 40 };
      const result = await service.create(originalData);
      expect(result).toBeDefined();
      expect(result).toMatchObject(originalData);
      await service.remove(result[idProp]);
    });

    it("creates a single new instance, supports $select", async () => {
      const originalData = { name: "William", age: 23 };
      const result = await service.create(originalData, {
        query: { $select: ["name"] },
      });
      expect(result).toBeDefined();
      expect(result.name).toEqual("William");
      expect(result.age).toBeUndefined();
      await service.remove(result[idProp]);
    });

    it("creates multiple new instances", async () => {
      const originalData = [
        {
          name: "Gerald",
          age: 18,
        },
        {
          name: "Herald",
          age: 18,
        },
      ];
      const result = await service.create(originalData);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result[0].name).toEqual("Gerald");
      expect(result[1].name).toEqual("Herald");
      await service.remove(result[0][idProp]);
      await service.remove(result[1][idProp]);
    });
  });

  ///  HERE WE GO  !!!!!!!
  describe("Services don't call public methods internally", () => {
    let throwing: any;
    beforeAll(() => {
      // @ts-ignore  Extended isn't properly typed
      throwing = <any>service.extend({
        get store() {
          // @ts-ignore  Not sure where this comes from...
          return service.store;
        },

        find: function find() {
          throw new Error("find method called");
        },
        get: function get() {
          throw new Error("get method called");
        },
        create: function create() {
          throw new Error("create method called");
        },
        update: function update() {
          throw new Error("update method called");
        },
        patch: function patch() {
          throw new Error("patch method called");
        },
        remove: function remove() {
          throw new Error("remove method called");
        },
      });
    });

    it("find", async () => {
      await service.find.call(throwing);
    });

    it("get", async () => {
      await service.get.call(throwing, _ids.Doug);
    });

    it("create", async () => {
      const result = await service.create.call(throwing, {
        name: "Bob",
        age: 25,
      });
      await service.remove(result[idProp]);
    });

    it("update", async () => {
      await service.update.call(throwing, _ids.Doug, { name: "Dougler" });
    });

    it("patch", async () => {
      await service.patch.call(throwing, _ids.Doug, { name: "PatchDoug" });
    });

    it("remove", async () => {
      await service.remove.call(throwing, _ids.Doug);
    });
  });
});

function getTestData(key: string | number): any {
  const data = {
    1: {
      name: "Alice",
      age: 23,
      color: "blue",
    },
  };
}
