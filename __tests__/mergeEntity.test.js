/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const { getUserModel } = require('../models/user');
const {
  mergeEntityWrapper,
  addId,
  getQueryParams,
} = require('../functions/mergeEntity/mergeEntity');
require('dotenv').config();

test('add id entity', () => {
  const entity = {
    posts: [{ text: 'hello' }, { text: 'bye' }],
    ratings: [5, 10],
  };

  addId(entity);
  expect(entity.posts[0]._id).not.toBeNull();
  expect(entity.ratings[0]._id).toBeUndefined();
  expect(entity._id).toBeUndefined();
});

test('get query params for update', () => {
  const env = 'dev';
  const pathSegments = ['users', '601d0913ebddc2403083eae9'];
  const entity = { name: 'Johnny', age: '20' };

  const { update, options } = getQueryParams(env, pathSegments, entity);
  expect(update).toEqual({
    $set: {
      'environments.$[envId].dev.users.$[usersId].name': 'Johnny',
      'environments.$[envId].dev.users.$[usersId].age': 20,
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('601d0913ebddc2403083eae9') },
    ],
  });
});

test('get query params for update with nested entities', () => {
  const env = 'dev';
  const pathSegments = ['users', '601d0913ebddc2403083eae9', 'posts', '601d0c80b18e7540dac4da59'];
  const entity = { text: 'Johnny', rating: '20' };

  const { update, options } = getQueryParams(env, pathSegments, entity);
  expect(update).toEqual({
    $set: {
      'environments.$[envId].dev.users.$[usersId].posts.$[postsId].text': 'Johnny',
      'environments.$[envId].dev.users.$[usersId].posts.$[postsId].rating': 20,
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('601d0913ebddc2403083eae9') },
      { 'postsId._id': mongoose.Types.ObjectId('601d0c80b18e7540dac4da59') },
    ],
  });
});

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

  await User.findOneAndUpdate(
    { username: 'ghost' },
    {
      $set: { 'environments.$[envId].dev.users': users },
    },
    {
      arrayFilters: [{ 'envId.dev': { $exists: true } }],
      useFindAndModify: false,
    },
  ).exec();
  await mongoose.connection.close();
};

describe('merge entity tests', () => {
  beforeEach(async () => initializeDb());

  test('wrong path', async () => {
    const user = {
      age: 20,
    };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response).not.toBeNull();
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid id in path', async () => {
    const user = {
      age: 20,
    };

    const event = {
      path: '/api/ghost/dev/users/4234098fs',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response).not.toBeNull();
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid body', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: '"age":20}',
    };

    const response = await mergeEntityWrapper(event);
    expect(response.stat);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('merge entity', async () => {
    const user = {
      age: 20,
    };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response).not.toBeNull();
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
    expect(doc.environments[0].dev.users[0].age).toBe(20);
    expect(doc.environments[0].dev.users[0].name).toMatch('Tom');
    await mongoose.connection.close();
  });

  test('merge nested entity', async () => {
    const update = {
      text: 'hello I changed my name',
      rating: 5,
    };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(update),
    };

    const response = await mergeEntityWrapper(event);
    expect(response).not.toBeNull();
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
    expect(doc.environments[0].dev.users[2].posts[0].text).toMatch('hello I changed my name');
    expect(doc.environments[0].dev.users[2].posts[0].rating).toBe(5);
    await mongoose.connection.close();
  });
  test('merge nested entity middle not existing', async () => {
    const update = {
      text: 'hello I changed my name',
      rating: 5,
    };

    const event = {
      path: '/api/ghost/dev/notexisting/601a91476e16940587282479/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(update),
    };

    const response = await mergeEntityWrapper(event);
    expect(response).not.toBeNull();
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch('Entity not found.');
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
          dev: { users: { name: 'string', age: 'number', male: 'boolean?' } },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('merge entity wrong input', () => {
  beforeEach(async () => initDbWithSchema());

  test('invalid body expect object got array', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: '[{"name": "John"}]',
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Expected object got array in body.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid body expect object null', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: null,
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Expected object in body.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid path', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: null,
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Invalid path.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });

  test('invalid path', async () => {
    const event = {
      path: '/api/ghost/dev/users/211243u',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: null,
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatch('Id in path is invalid.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });
});

describe('merge entity with schema no nested', () => {
  beforeEach(async () => initDbWithSchema());

  test('field type mismatch', async () => {
    const user = { name: 'John', age: 'twenty' };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected number got string.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });
  test('invalid id', async () => {
    const user = { name: 'John', age: 'twenty' };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch('Entity not found.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });

  test('add not existing field', async () => {
    const user = { name: 'John', lastname: 'johnson' };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Entity contains fields not existing in schema.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });
  test('add new field, no errors', async () => {
    const user = { male: true };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(204);
  });
  test('change existing field no errors', async () => {
    const user = { name: 'Robinson' };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
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
    expect(doc.environments[0].dev.users[0].name).toMatch('Robinson');
    await mongoose.connection.close();
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
                  _id: mongoose.Types.ObjectId('6017d641860f43b553b21602'),
                  name: 'John',
                  age: 20,
                  comments: [
                    {
                      text: 'hello',
                      _id: mongoose.Types.ObjectId('607406b523637659bd4e2d1f'),
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
              male: 'boolean?',
              comments: { text: 'string', rating: 'number?' },
            },
          },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('merge entity with nested entities', () => {
  beforeEach(async () => initDbWithSchemaNested());

  test('field type mismatch', async () => {
    const user = { comments: [{ text: 2 }] };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected string got number.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });

  test('add new field no erros', async () => {
    const user = { comments: [{ text: 'hello', rating: 2 }] };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
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
    expect(doc.environments[0].dev.users[0].comments[0].rating).toBe(2);
    await mongoose.connection.close();
  });

  test('not existing id', async () => {
    const user = { comments: [{ text: 'hello', rating: 2 }] };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21601',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch('Entity not found.');
  });
});

describe('merge nested entities', () => {
  beforeEach(async () => initDbWithSchemaNested());

  test('field type mismatch', async () => {
    const user = { text: 2 };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602/comments/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(417);
    expect(response.body).toMatch('Expected string got number.');
    expect(response.headers).toStrictEqual({ 'Content-type': 'text/plain' });
  });

  test('add new field no erros', async () => {
    const user = { rating: 2 };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602/comments/607406b523637659bd4e2d1f',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
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
    expect(doc.environments[0].dev.users[0].comments[0].rating).toBe(2);
    await mongoose.connection.close();
  });

  test('not existing id', async () => {
    const user = { rating: 2 };

    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602/comments/607406b523637659bd4e2d1e',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(user),
    };

    const response = await mergeEntityWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.body).toMatch('Entity not found.');
  });
});
