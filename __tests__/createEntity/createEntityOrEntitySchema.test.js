/* eslint-disable operator-linebreak */
const mongoose = require('mongoose');
const {
  createEntityOrEntitySchemaWrapper,
} = require('../../functions/createEntity/createEntityOrEntitySchema');
require('dotenv').config();
const { getUserModel } = require('../../models/user');

const initializeDb = async () => {
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

describe('invalid input', () => {
  test('invalid body', async () => {
    const str =
      '"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}],"moreUser":[]}';
    const event = { body: str };
    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Invalid body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('provided object insted of array', async () => {
    const event = { body: JSON.stringify({ name: 'john' }) };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch(
      'Please provide entity with this structure { NAME: [{}, {}, {}] }',
    );
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('no meta in body', async () => {
    const event = {
      body:
        '{ "users": [{ "name": "john" }, { "name": "michael" }], "neta": {} }',
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Invalid body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('type in meta but false', async () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { type: false },
      }),
    };
    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Property __meta is invalid.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('force in meta but false', async () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { force: false },
      }),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Property __meta is invalid.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('body keys length not valid', async () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { type: true },
        extra: {},
      }),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Invalid body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('body keys length not valid', async () => {
    const event = { body: JSON.stringify({}) };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Invalid body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });
});

describe('create entity', () => {
  beforeEach(async () => initializeDb());

  test('create entity no nested', async () => {
    const body = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(201);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(3);
    await mongoose.connection.close();
  });

  test('create entity for not existing env', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create entity for not existing username', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create entity with invalid body', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
      moreUsers: [],
      moremore: {},
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create entity with invalid json', async () => {
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body:
        '"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}],"moreUser":[]}',
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create nested entities', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38, posts: [{ text: 'hello' }, { text: 'bye' }] },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(201);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[2].posts.length).toBe(2);
    await mongoose.connection.close();
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

describe('create entity schema', () => {
  beforeEach(async () => initDbWithSchema());

  test('create schema with no nested entities', async () => {
    const routesSchema = {
      routes: { from: 'string', to: 'string' },
      __meta: { type: true },
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);

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
      routes: {
        from: 'string',
        to: 'string',
        subroutes: { from: 'string' },
      },
      __meta: { type: true },
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);

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
      __meta: { type: true },
    };
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe('Username or environment not found.');
  });

  test('create schema with not existing environment', async () => {
    const routesSchema = {
      routes: { from: 'string', to: 'string', subroutes: { from: 'string' } },
      __meta: { type: true },
    };
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(routesSchema),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe('Username or environment not found.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });
});

const initDbWithSchemaNested = async () => {
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
          dev: {
            users: {
              name: 'string',
              age: 'number',
              comments: { text: 'string' },
            },
          },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

const initDbWithSchema2 = async () => {
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
          dev: { users: { name: 'string', age: 'number' } },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('create entity with schema no nested', () => {
  beforeEach(async () => initDbWithSchema2());

  test('number of keys dont match', async () => {
    const users = { users: [{ name: 'John' }] };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toEqual(417);
    expect(response.body).toMatch(
      'Entity contains fields not existing in schema.',
    );
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('field doesnt exist in schema', async () => {
    const users = {
      users: [
        { name: 'John', age: 30 },
        { name: 'Michale', lastname: 'Thompson' },
      ],
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toEqual(417);
    expect(response.body).toMatch('Entity does not contain age field.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('field type mismatch', async () => {
    const users = { users: [{ name: 'John', age: 'two' }] };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toEqual(417);
    expect(response.body).toMatch('Expected number got string.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('no error entity with properties with same name', async () => {
    const users = {
      users: [
        { name: 'John', age: 20 },
        // eslint-disable-next-line no-dupe-keys
        { name: 'Michale', age: 20, name: 'Sebastian' },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(201);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(2);
    await mongoose.connection.close();
  });

  test('no error', async () => {
    const body = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(201);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(3);
    await mongoose.connection.close();
  });

  test('create entity for not existing env', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
    expect(response.body).toMatch('Environment not found.');
  });

  test('create entity for not existing username', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
    expect(response.body).toMatch('Username not found.');
  });
});

describe('create entity with schema nested', () => {
  beforeEach(async () => initDbWithSchemaNested());

  test('number of keys dont match', async () => {
    const users = {
      users: [
        { name: 'John', age: 20, comments: [{ text: 'hello', rating: 5 }] },
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toEqual(417);
    expect(response.body).toMatch(
      'Entity contains fields not existing in schema.',
    );
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('field type mismatch', async () => {
    const users = {
      users: [
        { name: 'John', age: 2, comments: [{ text: 5 }] },
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected string got number.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('no error entity with properties with same name', async () => {
    const users = {
      users: [
        {
          name: 'Michale',
          age: 20,
          // eslint-disable-next-line no-dupe-keys
          comments: [{ text: 'hello', text: 'alloha' }],
        },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await createEntityOrEntitySchemaWrapper(event);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(1);
    expect(doc.environments[0].dev.users[0].comments.length).toBe(1);
    expect(doc.environments[0].dev.users[0].comments[0].text).toMatch('alloha');
    await mongoose.connection.close();
  });

  test('no error', async () => {
    const body = {
      users: [
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(201);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[0].comments.length).toBe(2);
    expect(doc.environments[0].dev.users[0].comments[1].text).toMatch('friend');
    await mongoose.connection.close();
  });

  test('create entity not following schema but with force true', async () => {
    const body = {
      users: [
        {
          name: 'Rom',
          lastname: 'Anderson',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend', rating: 5 }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
      __meta: {
        force: true,
      },
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(201);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[0].comments.length).toBe(2);
    expect(doc.environments[0].dev.users[0].comments[1].text).toMatch('friend');
    expect(doc.environments[0].dev.users[0].comments[1].rating).toBe(5);
    await mongoose.connection.close();
  });

  test('create entity for not existing env', async () => {
    const users = {
      users: [
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch('Environment not found.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create entity for not existing username', async () => {
    const users = {
      users: [
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
    expect(response.body).toMatch('Username not found.');
  });
});
