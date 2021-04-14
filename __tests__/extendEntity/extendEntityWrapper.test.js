/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const {
  extendEntityWrapper,
} = require('../../functions/extendEntity/extendEntity');
const { getUserModel } = require('../../models/user');
require('dotenv').config();

const initializeDb = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const User = getUserModel();
  await User.deleteMany({});
  const user = new User({ username: 'ghost' });
  await user.save();
  await User.updateOne(
    { username: 'ghost' },
    { $push: { environments: [{ dev: {} }, { prod: {} }] } },
    { useFindAndModify: false },
  ).exec();

  const users = [
    {
      name: 'Tom',
      age: 39,
      _id: mongoose.Types.ObjectId('6017d641860f43b553b21602'),
    },
    {
      name: 'Mark',
      age: 39,
      _id: mongoose.Types.ObjectId('600c099f8684263f7419818d'),
    },
    {
      name: 'John',
      age: 38,
      _id: mongoose.Types.ObjectId('6017d641860f43b553b21603'),
      posts: [
        {
          text: 'hello my name is John',
          _id: mongoose.Types.ObjectId('601a91476e16940587282479'),
          comments: [
            {
              text: 'Nice to meet you',
              _id: mongoose.Types.ObjectId('601a91476e1694058728247a'),
              rating: 5,
            },
            {
              _id: mongoose.Types.ObjectId('601a91476e1694058728247d'),
              rating: 4,
            },
          ],
        },
        {
          text: 'I like it',
          _id: mongoose.Types.ObjectId('601a91476e1694058728247b'),
        },
      ],
    },
  ];
  await User.updateOne(
    { username: 'ghost' },
    {
      $set: { 'environments.$[envId].dev.users': users },
    },
    {
      arrayFilters: [{ 'envId.dev': { $exists: true } }],
    },
  ).exec();
  await mongoose.connection.close();
};

describe('extend entity wrapper', () => {
  beforeEach(async () => initializeDb());

  test('invalid body error when parsing json', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: '"age":20}',
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Invalid body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid body add entities', async () => {
    const newUsers = { name: 'Tommy' };

    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUsers),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Expected array in body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('id in path invalid', async () => {
    const newUsers = { name: 'Tommy' };

    const event = {
      path: '/api/ghost/dev/users/34215636456',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUsers),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Id in path is invalid.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid body replace entity send an array', async () => {
    const newUsers = [{ name: 'Tommy' }];

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUsers),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Expected object got array in body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid body replace entity send string', async () => {
    const newUsers = 'Tommy';

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUsers),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Expected object in body.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('add new entities with entity not existing', async () => {
    const newPost = [{ text: 'hello' }];

    const event = {
      path: '/api/ghost/dev/notexisting',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newPost),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(404);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc.environments[0].dev.notexisting).toBeUndefined();
    await mongoose.connection.close();
  });

  test('add new entities', async () => {
    const newUsers = [{ name: 'Tommy' }];

    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUsers),
    };

    const response = await extendEntityWrapper(event);
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

  test('add multiple new entities', async () => {
    const newUsers = [{ name: 'Tommy' }, { name: 'Raphael' }];

    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUsers),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(5);
    await mongoose.connection.close();
  });

  test('add nested new entities', async () => {
    const posts = [{ text: 'new one' }];

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(posts),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users[2].posts.length).toBe(3);
    await mongoose.connection.close();
  });

  test('add multiple nested new entities', async () => {
    const posts = [{ text: 'new one' }, { text: 'one more' }];

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(posts),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users[2].posts.length).toBe(4);
    await mongoose.connection.close();
  });

  test('replace entity', async () => {
    const newUser = { name: 'Newbie' };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUser),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[0].name).toMatch('Newbie');
    await mongoose.connection.close();
  });

  test('replace entity add new field', async () => {
    const newUser = { nick: 'Newbie' };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUser),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[0].name).toBeUndefined();
    expect(doc.environments[0].dev.users[0].nick).toMatch('Newbie');
    await mongoose.connection.close();
  });

  test('replace entity multiple fields', async () => {
    const newUser = { nick: 'Newbie', age: 20 };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUser),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[0].name).toBeUndefined();
    expect(doc.environments[0].dev.users[0].nick).toMatch('Newbie');
    expect(doc.environments[0].dev.users[0].age).toBe(20);
    await mongoose.connection.close();
  });

  test('replace entity', async () => {
    const newUser = { nick: 'Newbie', age: 20 };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newUser),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[0].name).toBeUndefined();
    expect(doc.environments[0].dev.users[0].nick).toMatch('Newbie');
    expect(doc.environments[0].dev.users[0].age).toBe(20);
    await mongoose.connection.close();
  });

  test('replace entity nested', async () => {
    const newPost = { text: 'hello' };

    const event = {
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newPost),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[2].posts.length).toBe(2);
    expect(doc.environments[0].dev.users[2].posts[0].text).toMatch('hello');
    await mongoose.connection.close();
  });

  test('replace entity nested new field', async () => {
    const newPost = { rating: 5 };

    const event = {
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newPost),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[2].posts.length).toBe(2);
    expect(doc.environments[0].dev.users[2].posts[0].text).toBeUndefined();
    expect(doc.environments[0].dev.users[2].posts[0].rating).toBe(5);
    await mongoose.connection.close();
  });

  test('replace entity nested multiple new field', async () => {
    const newPost = { author: 'Johnathan', rating: 5 };

    const event = {
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(newPost),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(3);
    expect(doc.environments[0].dev.users[2].posts.length).toBe(2);
    expect(doc.environments[0].dev.users[2].posts[0].text).toBeUndefined();
    expect(doc.environments[0].dev.users[2].posts[0].rating).toBe(5);
    expect(doc.environments[0].dev.users[2].posts[0].author).toMatch(
      'Johnathan',
    );
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
    {
      $push: {
        environments: [
          {
            dev: {
              users: [
                {
                  _id: mongoose.Types.ObjectId('6017d641860f43b553b21602'),
                  name: 'John',
                  age: 20,
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
          dev: { users: { name: 'string', age: 'number' } },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('extend entity wrapper with schema no nested', () => {
  beforeEach(async () => initDbWithSchema());

  test('number of keys dont match', async () => {
    const users = [{ name: 'John', age: 20, lastname: 'Robinson' }];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch(
      'Entity contains fields not existing in schema.',
    );
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
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

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Entity does not contain age field.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('field type mismatch', async () => {
    const users = [{ name: 'John', age: 'two' }];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected number got string.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('field type mismatch single entity', async () => {
    const user = { name: 'John', age: 'two' };
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected number got string.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('no error', async () => {
    const users = [{ name: 'John', age: 20 }];
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(2);
    await mongoose.connection.close();
  });

  test('no error single entity', async () => {
    const user = { name: 'John', age: 20 };
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users[0].name).toMatch('John');
    expect(doc.environments[0].dev.users[0].age).toBe(20);
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

    const response = await extendEntityWrapper(event);
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

    const response = await extendEntityWrapper(event);
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

    const response = await extendEntityWrapper(event);
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

    const response = await extendEntityWrapper(event);
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
                  comments: [
                    {
                      _id: mongoose.Types.ObjectId('6017d641860f43b553b21602'),
                      text: 'hello',
                    },
                  ],
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

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch(
      'Entity contains fields not existing in schema.',
    );
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('field type mismatch', async () => {
    const users = { name: 'John', age: 2, comments: [{ text: 5 }] };
    const event = {
      path: '/api/ghost/dev/users/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected string got number.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('field type mismatch single entity', async () => {
    const users = { text: 5 };
    const event = {
      path:
        '/api/ghost/dev/users/607406b523637659bd4e2d1f/comments/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected string got number.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('no error single entity', async () => {
    const users = { text: 'new text' };
    const event = {
      path:
        '/api/ghost/dev/users/607406b523637659bd4e2d1f/comments/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users[0].comments[0].text).toMatch(
      'new text',
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

    const response = await extendEntityWrapper(event);
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

    const response = await extendEntityWrapper(event);
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

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(204);
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

    const response = await extendEntityWrapper(event);
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
      headers: { force: 'true' },
    };

    const response = await extendEntityWrapper(event);
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

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch(
      'Entity contains fields not existing in schema.',
    );
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
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

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected number got string.');
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
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

    const response = await extendEntityWrapper(event);
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
    expect(doc.environments[0].dev.users.length).toBe(2);
    expect(doc.environments[0].dev.users[0].posts.length).toBe(2);
    expect(doc.environments[0].dev.users[0].posts[0].rating).toBeUndefined();
    expect(doc.environments[0].dev.users[0].posts[0].text).toMatch('hello');
    await mongoose.connection.close();
  });
});
