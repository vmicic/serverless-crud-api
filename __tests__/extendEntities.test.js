/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const {
  addIdForObjects,
  addIdForArrayInField,
  getSelectorAndFilters,
  replaceEntityQuery,
  addToExistingEntityQuery,
  extendEntityWrapper,
} = require('../functions/extendEntity/extendEntity');
const { getUserModel } = require('../models/user');
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

describe('extend entity tests', () => {
  beforeEach(async () => initializeDb());

  test('invalid body error when parsing json', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: '"age":20}',
    };

    const response = await extendEntityWrapper(event);
    expect(response.statusCode).toBe(400);
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
