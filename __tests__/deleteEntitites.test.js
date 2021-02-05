const mongoose = require('mongoose');
const { getUserModel } = require('../models/user');
const {
  getFirstFilter,
  deleteEntityQuery,
  deleteEntityWithQueryParamsQuery,
  deleteFieldQuery,
  deleteNestedFieldWithQueryParamsQuery,
  deleteElementOfArrayQuery,
  deleteEntity,
  idsInvalid,
} = require('../functions/deleteEntities');
require('dotenv').config();

test('ids invalid invalid id', () => {
  const pathSegments = ['users', '6017d6443b553b21603'];
  expect(idsInvalid(pathSegments)).toBeTruthy();
});

test('ids invalid nested invalid id', () => {
  const pathSegments = [
    'users',
    '6017d641860f43b553b21603',
    'posts',
    '4238094',
  ];
  expect(idsInvalid(pathSegments)).toBeTruthy();
});

test('ids invalid valid id', () => {
  const pathSegments = ['users', '6017d641860f43b553b21603'];
  expect(idsInvalid(pathSegments)).toBeFalsy();
});

test('ids invalid no id', () => {
  const pathSegments = ['users'];
  expect(idsInvalid(pathSegments)).toBeFalsy();
});

test('get first filter', () => {
  const filter = getFirstFilter('dev');
  expect(filter).toEqual({ 'envId.dev': { $exists: true } });
});

test('delete entity query', () => {
  const env = 'dev';
  const entity = 'users';
  const { update, options } = deleteEntityQuery(env, entity);
  expect(update).toEqual({ $unset: { 'environments.$[envId].dev.users': '' } });
  expect(options).toEqual({
    arrayFilters: [{ 'envId.dev': { $exists: true } }],
  });
});

test('delete entity with query params', () => {
  const env = 'dev';
  const entity = 'users';
  const queryParams = { name: 'Tom' };
  const { update, options } = deleteEntityWithQueryParamsQuery(
    env,
    entity,
    queryParams,
  );
  expect(update).toEqual({
    $pull: { 'environments.$[envId].dev.users': { name: 'Tom' } },
  });
  expect(options).toEqual({
    arrayFilters: [{ 'envId.dev': { $exists: true } }],
  });
});

test('delete entity with multiple query params', () => {
  const env = 'dev';
  const entity = 'users';
  const queryParams = { name: 'Tom', lastname: 'Wick' };
  const { update, options } = deleteEntityWithQueryParamsQuery(
    env,
    entity,
    queryParams,
  );
  expect(update).toEqual({
    $pull: {
      'environments.$[envId].dev.users': { name: 'Tom', lastname: 'Wick' },
    },
  });
  expect(options).toEqual({
    arrayFilters: [{ 'envId.dev': { $exists: true } }],
  });
});

test('delete field query', () => {
  const env = 'dev';
  const pathSegments = ['users', '6017d641860f43b553b21603', 'posts'];
  const { update, options } = deleteFieldQuery(env, pathSegments);
  expect(update).toEqual({
    $unset: { 'environments.$[envId].dev.users.$[usersId].posts': '' },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('6017d641860f43b553b21603') },
    ],
  });
});

test('delete field query', () => {
  const env = 'dev';
  const pathSegments = [
    'users',
    '6017d641860f43b553b21603',
    'posts',
    '601a91476e16940587282479',
    'comments',
  ];
  const { update, options } = deleteFieldQuery(env, pathSegments);
  expect(update).toEqual({
    $unset: {
      'environments.$[envId].dev.users.$[usersId].posts.$[postsId].comments':
        '',
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('6017d641860f43b553b21603') },
      { 'postsId._id': mongoose.Types.ObjectId('601a91476e16940587282479') },
    ],
  });
});

test('delete nested field query with query params', () => {
  const env = 'dev';
  const pathSegments = ['users', '6017d641860f43b553b21603', 'posts'];
  const queryParams = { text: 'hello' };
  const { update, options } = deleteNestedFieldWithQueryParamsQuery(
    env,
    pathSegments,
    queryParams,
  );
  expect(update).toEqual({
    $pull: {
      'environments.$[envId].dev.users.$[usersId].posts': { text: 'hello' },
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('6017d641860f43b553b21603') },
    ],
  });
});

test('delete nested field query with multiple query params', () => {
  const env = 'dev';
  const pathSegments = ['users', '6017d641860f43b553b21603', 'posts'];
  const queryParams = { text: 'hello', rating: 5 };
  const { update, options } = deleteNestedFieldWithQueryParamsQuery(
    env,
    pathSegments,
    queryParams,
  );
  expect(update).toEqual({
    $pull: {
      'environments.$[envId].dev.users.$[usersId].posts': {
        text: 'hello',
        rating: 5,
      },
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('6017d641860f43b553b21603') },
    ],
  });
});

test('delete single entity', () => {
  const env = 'dev';
  const pathSegments = ['users', '6017d641860f43b553b21603'];
  const { update, options } = deleteElementOfArrayQuery(env, pathSegments);
  expect(update).toEqual({
    $pull: {
      'environments.$[envId].dev.users': {
        _id: mongoose.Types.ObjectId('6017d641860f43b553b21603'),
      },
    },
  });
  expect(options).toEqual({
    arrayFilters: [{ 'envId.dev': { $exists: true } }],
  });
});

test('delete single nested entity', () => {
  const env = 'dev';
  const pathSegments = [
    'users',
    '6017d641860f43b553b21603',
    'posts',
    '601a91476e16940587282479',
  ];
  const { update, options } = deleteElementOfArrayQuery(env, pathSegments);
  expect(update).toEqual({
    $pull: {
      'environments.$[envId].dev.users.$[usersId].posts': {
        _id: mongoose.Types.ObjectId('601a91476e16940587282479'),
      },
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('6017d641860f43b553b21603') },
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

describe('delete entity tests', () => {
  beforeEach(async () => initializeDb());

  test('delete entity', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await deleteEntity(event);
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
    expect(doc).toBeNull();
    await mongoose.connection.close();
  });

  test('delete not existing entity', async () => {
    const event = {
      path: '/api/ghost/dev/notexisting',
      pathParameters: { username: 'ghost', environments: 'dev' },
      queryStringParameters: null,
    };

    const response = await deleteEntity(event);
    expect(response.statusCode).toBe(204);
  });

  test('delete entity not existing user', async () => {
    const event = {
      path: '/api/notexisting/dev/users',
      pathParameters: { username: 'notexisting', environments: 'dev' },
      queryStringParameters: null,
    };

    const response = await deleteEntity(event);
    expect(response.statusCode).toBe(204);
  });

  test('delete entity with query params', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { age: '39' },
    };

    const response = await deleteEntity(event);
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
    await mongoose.connection.close();
  });

  test('delete entity with multiple query params', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { name: 'Tom', age: '39' },
    };

    const response = await deleteEntity(event);
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

  test('delete entity with invalid id format', async () => {
    const event = {
      path: '/api/ghost/dev/users/34235',
      pathParameters: { username: 'ghost', environments: 'dev' },
    };

    const response = await deleteEntity(event);
    expect(response.statusCode).toBe(400);
  });

  test('delete single entity with id', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await deleteEntity(event);
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

  test('delete nested entity with id', async () => {
    const event = {
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await deleteEntity(event);
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
    expect(doc.environments[0].dev.users[2].posts.length).toBe(1);
    await mongoose.connection.close();
  });

  test('delete nested entity with neste invalid id', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts/43241ew',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await deleteEntity(event);
    expect(response.statusCode).toBe(400);
    await mongoose.connection.close();
  });

  test('delete nested entity', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await deleteEntity(event);
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
    expect(doc.environments[0].dev.users[2].posts).toBeUndefined();
    await mongoose.connection.close();
  });

  test('delete nested entity with query params', async () => {
    const event = {
      path: 'api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'I like it' },
    };

    const response = await deleteEntity(event);
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
    expect(doc.environments[0].dev.users[2].posts.length).toBe(1);
    await mongoose.connection.close();
  });

  test('delete nested entity with middle one not existing', async () => {
    const event = {
      path: 'api/ghost/dev/notexisting/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'I like it' },
    };

    const response = await deleteEntity(event);
    expect(response.statusCode).toBe(400);
  });

  test('delete nested entity with multiple query params', async () => {
    const event = {
      path:
        'api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479/comments',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'Nice to meet you', rating: 5 },
    };

    const response = await deleteEntity(event);
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
    expect(doc.environments[0].dev.users[2].posts[0].comments.length).toBe(1);
    await mongoose.connection.close();
  });

  test('delete nested entity with multiple query params with middle id not existing', async () => {
    const event = {
      path:
        'api/ghost/dev/users/6017d641860f43b553b21603/posts/601bfa564792422af9e05e59/comments',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'Nice to meet you', rating: 5 },
    };

    const response = await deleteEntity(event);
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
    expect(doc.environments[0].dev.users[2].posts[0].comments.length).toBe(2);
    await mongoose.connection.close();
  });

  test('delete nested entity with multiple query params with middle id not existing', async () => {
    const event = {
      path:
        'api/ghost/dev/users/6017d641860f43b553b21603/hej/601bfa564792422af9e05e59/comments',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'Nice to meet you', rating: 5 },
    };

    const response = await deleteEntity(event);
    expect(response.statusCode).toBe(400);
  });
});
