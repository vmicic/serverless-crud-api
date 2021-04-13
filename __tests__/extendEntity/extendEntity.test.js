/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const {
  addIdForObjects,
  addIdForArrayInField,
  getSelectorAndFilters,
  replaceEntityQuery,
  addToExistingEntityQuery,
  addIds,
  extendEntity,
} = require('../../functions/extendEntity/extendEntity');
const { getUserModel } = require('../../models/user');
require('dotenv').config();

describe('add ids for objects', () => {
  test('no nested objects', () => {
    const users = [{ name: 'Johnatan' }, { name: 'Michael' }];
    addIdForObjects(users);
    users.forEach((user) => {
      expect(user._id).not.toBeNull();
    });
  });

  test('nested objects', () => {
    const users = [
      { name: 'Johnatan' },
      { name: 'Michael' },
      { name: 'Kim', posts: [{ text: 'first post' }, { text: 'second post' }] },
    ];
    addIdForObjects(users);
    users.forEach((user) => {
      expect(user._id).not.toBeUndefined();
    });
    users[2].posts.forEach((post) => {
      expect(post._id).not.toBeUndefined();
    });
  });
  test('nested objects no ids for fields', () => {
    const users = [
      { name: 'Johnatan' },
      { name: 'Michael', family: { father: 'Ada' } },
      { name: 'Kim', posts: [{ text: 'first post' }, { text: 'second post' }] },
    ];
    addIdForObjects(users);
    expect(users[1].family._id).toBeUndefined();
  });
});

describe('add id for array in field', () => {
  test('add ids for field array', () => {
    const user = {
      name: 'Michale',
      posts: [{ text: 'first' }, { text: 'second' }],
    };
    addIdForArrayInField(user);
    user.posts.forEach((post) => {
      expect(post._id).not.toBeUndefined();
    });
    expect(user._id).toBeUndefined();
  });
});

describe('add ids', () => {
  test('add ids for objects no nested', () => {
    const users = [{ name: 'Johnatan' }, { name: 'Michael' }];
    const pathSegments = ['users'];
    addIds(users, pathSegments);
    users.forEach((user) => {
      expect(user._id).not.toBeNull();
    });
  });

  test('add ids for objects nested nested', () => {
    const pathSegments = ['users'];
    const users = [
      { name: 'Johnatan' },
      { name: 'Michael' },
      { name: 'Kim', posts: [{ text: 'first post' }, { text: 'second post' }] },
    ];
    addIds(users, pathSegments);
    users.forEach((user) => {
      expect(user._id).not.toBeUndefined();
    });
    users[2].posts.forEach((post) => {
      expect(post._id).not.toBeUndefined();
    });
  });

  test('add ids for nested objects no ids for fields', () => {
    const pathSegments = ['users'];
    const users = [
      { name: 'Johnatan' },
      { name: 'Michael', family: { father: 'Ada' } },
      { name: 'Kim', posts: [{ text: 'first post' }, { text: 'second post' }] },
    ];
    addIds(users, pathSegments);
    expect(users[1].family._id).toBeUndefined();
  });

  test('add ids for field array', () => {
    const pathSegments = ['users', '6017d641860f43b553b21603'];
    const user = {
      name: 'Michale',
      posts: [{ text: 'first' }, { text: 'second' }],
    };
    addIds(user, pathSegments);
    user.posts.forEach((post) => {
      expect(post._id).not.toBeUndefined();
    });
    expect(user._id).toStrictEqual(
      mongoose.Types.ObjectId('6017d641860f43b553b21603'),
    );
  });
});

describe('get selector and filters', () => {
  test('no nested', () => {
    const pathSegments = ['users', '601d293e69922540da9eeee4'];
    const env = 'dev';
    const userId = mongoose.Types.ObjectId('601d293e69922540da9eeee4');

    const { selector, filters } = getSelectorAndFilters(pathSegments, env);
    expect(selector).toEqual('environments.$[envId].dev.users.$[usersId]');
    expect(filters).toEqual([
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': userId },
    ]);
  });

  test('nested', () => {
    const pathSegments = [
      'users',
      '601d293e69922540da9eeee4',
      'posts',
      '601d293e69922540da9eeee9',
    ];
    const env = 'dev';
    const userId = mongoose.Types.ObjectId('601d293e69922540da9eeee4');
    const postId = mongoose.Types.ObjectId('601d293e69922540da9eeee9');

    const { selector, filters } = getSelectorAndFilters(pathSegments, env);
    expect(selector).toEqual(
      'environments.$[envId].dev.users.$[usersId].posts.$[postsId]',
    );
    expect(filters).toEqual([
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': userId },
      { 'postsId._id': postId },
    ]);
  });
});

describe('replace entity query', () => {
  test('no nested', () => {
    const env = 'dev';
    const pathSegments = ['users', '601d293e69922540da9eeee4'];
    const entity = { name: 'John' };
    const userId = mongoose.Types.ObjectId('601d293e69922540da9eeee4');

    const { update, options } = replaceEntityQuery(env, pathSegments, entity);
    expect(update).toEqual({
      $set: { 'environments.$[envId].dev.users.$[usersId]': { name: 'John' } },
    });
    expect(options).toEqual({
      arrayFilters: [
        { 'envId.dev': { $exists: true } },
        { 'usersId._id': userId },
      ],
    });
  });

  test('nested entity query', () => {
    const env = 'dev';
    const pathSegments = [
      'users',
      '601d293e69922540da9eeee4',
      'posts',
      '601d28e95e9f774d3e0f2461',
    ];
    const entity = { name: 'John' };
    const userId = mongoose.Types.ObjectId('601d293e69922540da9eeee4');
    const postId = mongoose.Types.ObjectId('601d28e95e9f774d3e0f2461');

    const { update, options } = replaceEntityQuery(env, pathSegments, entity);
    expect(update).toEqual({
      $set: {
        'environments.$[envId].dev.users.$[usersId].posts.$[postsId]': {
          name: 'John',
        },
      },
    });
    expect(options).toEqual({
      arrayFilters: [
        { 'envId.dev': { $exists: true } },
        { 'usersId._id': userId },
        { 'postsId._id': postId },
      ],
    });
  });

  test('nested entity multiple fields query', () => {
    const env = 'dev';
    const pathSegments = [
      'users',
      '601d293e69922540da9eeee4',
      'posts',
      '601d28e95e9f774d3e0f2461',
    ];
    const entity = { name: 'John', age: 20 };
    const userId = mongoose.Types.ObjectId('601d293e69922540da9eeee4');
    const postId = mongoose.Types.ObjectId('601d28e95e9f774d3e0f2461');

    const { update, options } = replaceEntityQuery(env, pathSegments, entity);
    expect(update).toEqual({
      $set: {
        'environments.$[envId].dev.users.$[usersId].posts.$[postsId]': {
          name: 'John',
          age: 20,
        },
      },
    });
    expect(options).toEqual({
      arrayFilters: [
        { 'envId.dev': { $exists: true } },
        { 'usersId._id': userId },
        { 'postsId._id': postId },
      ],
    });
  });
});

describe('add to existing enitity query', () => {
  test('add shallow entity', () => {
    const env = 'dev';
    const pathSegments = ['users'];
    const entities = [
      {
        name: 'Mich',
        _id: mongoose.Types.ObjectId('601d293e69922540da9eeee4'),
      },
      {
        name: 'Serena',
        _id: mongoose.Types.ObjectId('601d28e95e9f774d3e0f2461'),
      },
    ];

    const { update, options } = addToExistingEntityQuery(
      env,
      pathSegments,
      entities,
    );
    expect(update).toEqual({
      $push: { 'environments.$[envId].dev.users': { $each: entities } },
    });
    expect(options).toEqual({
      arrayFilters: [{ 'envId.dev': { $exists: true } }],
    });
  });

  test('add deep entity', () => {
    const env = 'dev';
    const pathSegments = ['users', '601d293e69922540da9eeee9', 'posts'];
    const userId = mongoose.Types.ObjectId('601d293e69922540da9eeee9');
    const entities = [
      {
        text: 'hello',
        _id: mongoose.Types.ObjectId('601d293e69922540da9eeee4'),
      },
      {
        text: 'bye',
        _id: mongoose.Types.ObjectId('601d28e95e9f774d3e0f2461'),
      },
    ];

    const { update, options } = addToExistingEntityQuery(
      env,
      pathSegments,
      entities,
    );
    expect(update).toEqual({
      $push: {
        'environments.$[envId].dev.users.$[usersId].posts': { $each: entities },
      },
    });
    expect(options).toEqual({
      arrayFilters: [
        { 'envId.dev': { $exists: true } },
        {
          'usersId._id': userId,
        },
      ],
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
    {
      $push: {
        environments: [
          { dev: { users: [{ name: 'John', age: 20 }] } },
          { prod: {} },
        ],
      },
    },
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

describe('extend entity with schema no nested', () => {
  beforeEach(async () => initDbWithSchema());

  test('number of keys dont match', async () => {
    const users = [{ name: 'John', age: 20, lastname: 'Robinson' }];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(extendEntity(event)).rejects.toThrow(
      'Entity contains fields not existing in schema.',
    );
    await mongoose.connection.close();
  });

  test('field doesnt exist in schema', async () => {
    const users = [
      { name: 'John', age: 30 },
      { name: 'Michale', lastname: 'Thompson' },
    ];

    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(extendEntity(event)).rejects.toThrow(
      'Entity does not contain age field.',
    );
  });

  test('field type mismatch', async () => {
    const users = [{ name: 'John', age: 'two' }];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(extendEntity(event)).rejects.toThrow(
      'Expected number got string.',
    );
  });

  test('no error', async () => {
    const users = [{ name: 'John', age: 20 }];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await extendEntity(event);

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

  test('no error entity with properties with same name', async () => {
    const users = [
      { name: 'John', age: 20 },
      // eslint-disable-next-line no-dupe-keys
      { name: 'Michale', age: 20, name: 'Sebastian' },
    ];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await extendEntity(event);
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

  test('everything ok', async () => {
    const body = [
      { name: 'Rom', age: 39 },
      { name: 'Mark', age: 39 },
      { name: 'John', age: 38 },
    ];

    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
    };

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(204);
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
    expect(doc.environments[0].dev.users.length).toBe(4);
    await mongoose.connection.close();
  });

  test('extend entity for not existing env', async () => {
    const users = [
      { name: 'Rom', age: 39 },
      { name: 'Mark', age: 39 },
      { name: 'John', age: 38 },
    ];
    const event = {
      path: '/api/ghost/notexisting/users',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(users),
    };

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch('Username or environment not found.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('extend entity for not existing username', async () => {
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

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
    expect(response.body).toMatch('Username or environment not found.');
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
    {
      $push: {
        environments: [
          {
            dev: {
              users: [
                {
                  _id: mongoose.Types.ObjectId('607406b523637659bd4e2d1f'),
                  name: 'John',
                  age: 20,
                  comments: [{ text: 'hello' }],
                },
              ],
            },
          },
          { prod: {} },
        ],
      },
    },
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

describe('extend entity with schema nested', () => {
  beforeEach(async () => initDbWithSchemaNested());

  test('number of keys dont match', async () => {
    const user = {
      name: 'John',
      age: 20,
      comments: [{ text: 'hello', rating: 5 }],
    };
    const event = {
      path: '/api/ghost/dev/users/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    await expect(extendEntity(event)).rejects.toThrow(
      'Entity contains fields not existing in schema.',
    );
    await mongoose.connection.close();
  });

  test('field type mismatch', async () => {
    const users = { name: 'John', age: 2, comments: [{ text: 5 }] };
    const event = {
      path: '/api/ghost/dev/users/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(extendEntity(event)).rejects.toThrow(
      'Expected string got number.',
    );
    await mongoose.connection.close();
  });

  test('no error entity with properties with same name', async () => {
    const users = {
      name: 'Michale',
      age: 20,
      // eslint-disable-next-line no-dupe-keys
      comments: [{ text: 'hello', text: 'alloha' }],
    };

    const event = {
      path: '/api/ghost/dev/users/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(204);

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

  test('everything ok', async () => {
    const body = {
      name: 'Rom',
      age: 39,
      comments: [{ text: 'hello' }, { text: 'friend' }],
    };

    const event = {
      path: '/api/ghost/dev/users/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
    };

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(204);
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
    expect(doc.environments[0].dev.users[0].comments.length).toBe(2);
    expect(doc.environments[0].dev.users[0].comments[1].text).toMatch('friend');
    await mongoose.connection.close();
  });

  test('extend entity for not existing env', async () => {
    const users = {
      name: 'Rom',
      age: 39,
      comments: [{ text: 'hello' }, { text: 'friend' }],
    };
    const event = {
      path: '/api/ghost/notexisting/users/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(users),
    };

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch('Environment not found.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('extend entity for not existing username', async () => {
    const users = {
      name: 'Rom',
      age: 39,
      comments: [{ text: 'hello' }, { text: 'friend' }],
    };
    const event = {
      path: '/api/notexisting/dev/users/607406b523637659bd4e2d1f',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
    expect(response.body).toMatch('Username or environment not found.');
  });

  test('extend with different then schema but with force true', async () => {
    const body = [
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
    ];

    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
      headers: { force: true },
    };

    const response = await extendEntity(event);
    expect(response.statusCode).toBe(204);
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
    expect(doc.environments[0].dev.users.length).toBe(4);
    expect(doc.environments[0].dev.users[1].comments.length).toBe(2);
    expect(doc.environments[0].dev.users[1].comments[1].text).toMatch('friend');
    expect(doc.environments[0].dev.users[1].comments[1].rating).toBe(5);
    await mongoose.connection.close();
  });
});

const initDbWithSchemaOptionalNested = async () => {
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
    { $push: { environments: [{ dev: { users: [] } }, { prod: {} }] } },
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
              posts: { text: 'string?', rating: 'number?' },
            },
          },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('create entity with schema and optional fields and nested', () => {
  beforeEach(async () => initDbWithSchemaOptionalNested());

  test('number of keys dont match', async () => {
    const users = [
      { name: 'John', posts: [{ text: 'hello', rating: 5, comment: 'hey' }] },
    ];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(extendEntity(event)).rejects.toThrow(
      'Entity contains fields not existing in schema.',
    );
    await mongoose.connection.close();
  });

  test('field type mismatch', async () => {
    const users = [
      {
        name: 'John',
        posts: [{ text: 'hello', rating: 'test' }],
      },
    ];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(extendEntity(event)).rejects.toThrow(
      'Expected number got string.',
    );
    await mongoose.connection.close();
  });

  test('no error, missing optional fields', async () => {
    const users = [
      { name: 'John', posts: [{ text: 'hello' }, { rating: 5 }] },
      { name: 'Rob', posts: [{}, { text: 'alloha' }] },
    ];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await extendEntity(event);

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
    expect(doc.environments[0].dev.users[0].posts.length).toBe(2);
    expect(doc.environments[0].dev.users[0].posts[0].rating).toBeUndefined();
    expect(doc.environments[0].dev.users[0].posts[0].text).toMatch('hello');
    await mongoose.connection.close();
  });
});
