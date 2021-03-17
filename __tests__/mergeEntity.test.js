/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const { getUserModel } = require('../models/user');
const {
  mergeEntity,
  addId,
  getQueryParams,
} = require('../functions/mergeEntity');
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
  const pathSegments = [
    'users',
    '601d0913ebddc2403083eae9',
    'posts',
    '601d0c80b18e7540dac4da59',
  ];
  const entity = { text: 'Johnny', rating: '20' };

  const { update, options } = getQueryParams(env, pathSegments, entity);
  expect(update).toEqual({
    $set: {
      'environments.$[envId].dev.users.$[usersId].posts.$[postsId].text':
        'Johnny',
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

    const response = await mergeEntity(event);
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

    const response = await mergeEntity(event);
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

    const response = await mergeEntity(event);
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

    const response = await mergeEntity(event);
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
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(update),
    };

    const response = await mergeEntity(event);
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
    expect(doc.environments[0].dev.users[2].posts[0].text).toMatch(
      'hello I changed my name',
    );
    expect(doc.environments[0].dev.users[2].posts[0].rating).toBe(5);
    await mongoose.connection.close();
  });
  test('merge nested entity middle not existing', async () => {
    const update = {
      text: 'hello I changed my name',
      rating: 5,
    };

    const event = {
      path:
        '/api/ghost/dev/notexisting/601a91476e16940587282479/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(update),
    };

    const response = await mergeEntity(event);
    expect(response).not.toBeNull();
    expect(response.statusCode).toBe(400);
  });
});
