const mongoose = require('mongoose');
const { getUserModel } = require('../../models/user');
const {
  getSchemaAndName,
  getResponse,
  getUpdate,
  createEntitySchema,
} = require('../../functions/createEntity/createEntitySchema');
require('dotenv').config();

describe('get schema and name', () => {
  test('no errors', () => {
    const body = JSON.stringify({
      users: { name: 'string' },
      __meta: { type: true },
    });

    const { entitySchema, entityName } = getSchemaAndName(body);
    expect(entitySchema).toStrictEqual({ name: 'string' });
    expect(entityName).toMatch('users');
  });
});

describe('get response', () => {
  test('error response', () => {
    const result = { nModified: 0 };
    const response = getResponse(result);

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch(
      'Unable to create requested entity schema or it already exists.',
    );
  });

  test('success response', () => {
    const result = { nModified: 1 };
    const response = getResponse(result);

    expect(response.statusCode).toBe(201);
  });
});

const initDbWithoutSchemas = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const User = getUserModel();
  await User.deleteMany({});
  const user = new User({ username: 'ghost' });
  await user.save();
  await User.findOneAndUpdate(
    { username: 'ghost' },
    { $push: { environments: [{ dev: {} }, { prod: {} }] } },
    { useFindAndModify: false },
  ).exec();

  await mongoose.connection.close();
};

describe('get update with entitySchemas not existing', () => {
  beforeAll(async () => initDbWithoutSchemas());

  test('get update with entitySchemas not existing in document', async () => {
    const query = { username: 'ghost' };
    const environment = 'dev';
    const entitySchema = { name: 'string', age: 'number', male: 'boolean' };
    const entityName = 'users';
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const update = await getUpdate(
      query,
      environment,
      entitySchema,
      entityName,
    );
    await mongoose.connection.close();
    expect(update).toStrictEqual({
      entitySchemas: {
        dev: { users: { name: 'string', age: 'number', male: 'boolean' } },
      },
    });
  });
});

const initDbWithSchema = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const User = getUserModel();
  await User.deleteMany({});
  const user = new User({ username: 'ghost' });
  await user.save();
  await User.findOneAndUpdate(
    { username: 'ghost' },
    { $push: { environments: [{ dev: {} }, { prod: {} }] } },
    { useFindAndModify: false },
  ).exec();

  await User.updateOne(
    { username: 'ghost' },
    {
      $set: {
        entitySchemas: {
          dev: { users: { name: 'string', age: 'number', male: 'boolean' } },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('get update with entitySchemas not existing', () => {
  beforeAll(async () => initDbWithSchema());

  test('get update with entitySchemas not existing in document', async () => {
    const query = { username: 'ghost' };
    const environment = 'dev';
    const entitySchema = { name: 'string', age: 'number', male: 'boolean' };
    const entityName = 'friends';
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const update = await getUpdate(
      query,
      environment,
      entitySchema,
      entityName,
    );
    await mongoose.connection.close();
    expect(update).toStrictEqual({
      entitySchemas: {
        dev: {
          users: { name: 'string', age: 'number', male: 'boolean' },
          friends: { name: 'string', age: 'number', male: 'boolean' },
        },
      },
    });
  });
});

describe('create entity schema with existing schema', () => {
  beforeAll(async () => initDbWithSchema());

  test('create schema with no nested entities', async () => {
    const routesSchema = { routes: { from: 'string', to: 'string' } };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntitySchema(event);

    expect(response.statusCode).toBe(201);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
    });
    await mongoose.connection.close();

    expect(doc.entitySchemas).toStrictEqual({
      dev: {
        users: { name: 'string', age: 'number', male: 'boolean' },
        routes: { from: 'string', to: 'string' },
      },
    });
  });

  test('create schema with nested entities', async () => {
    const routesSchema = {
      routes: { from: 'string', to: 'string', subroutes: { from: 'string' } },
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntitySchema(event);

    expect(response.statusCode).toBe(201);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
    });
    await mongoose.connection.close();

    expect(doc.entitySchemas).toStrictEqual({
      dev: {
        users: { name: 'string', age: 'number', male: 'boolean' },
        routes: { from: 'string', to: 'string', subroutes: { from: 'string' } },
      },
    });
  });

  test('create schema with not existing username', async () => {
    const routesSchema = {
      routes: { from: 'string', to: 'string', subroutes: { from: 'string' } },
    };
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    await expect(createEntitySchema(event)).rejects.toThrow(
      'Username or environment not found.',
    );
  });

  test('create schema with not existing environment', async () => {
    const routesSchema = {
      routes: { from: 'string', to: 'string', subroutes: { from: 'string' } },
    };
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(routesSchema),
    };

    await expect(createEntitySchema(event)).rejects.toThrow(
      'Username or environment not found.',
    );
  });
});

describe('create entity schema with no existing schemas', () => {
  beforeAll(async () => initDbWithoutSchemas());

  test('create schema with no nested entities', async () => {
    const routesSchema = { routes: { from: 'string', to: 'string' } };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntitySchema(event);

    expect(response.statusCode).toBe(201);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
    });
    await mongoose.connection.close();

    expect(doc.entitySchemas).toStrictEqual({
      dev: {
        routes: { from: 'string', to: 'string' },
      },
    });
  });

  test('create schema with nested entities', async () => {
    const routesSchema = {
      routes: { from: 'string', to: 'string', subroutes: { from: 'string' } },
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntitySchema(event);

    expect(response.statusCode).toBe(201);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
    });
    await mongoose.connection.close();

    expect(doc.entitySchemas).toStrictEqual({
      dev: {
        routes: { from: 'string', to: 'string', subroutes: { from: 'string' } },
      },
    });
  });
});
