const mongoose = require('mongoose');
const {
  getProjectQuery,
  getEntityDbQuery,
  getEntityByQueryParamsDbQuery,
  getEntityByIdDbQuery,
  getNestedEntitiesByQueryParamsDbQuery,
  getDbQuery,
  getEntity,
} = require('../functions/getEntities');
const { getUserModel } = require('../models/user');
require('dotenv').config();

test('get project query single query param', () => {
  const selector = 'environments.dev.users';
  const queryParams = { name: 'Tom' };
  const projectQuery = getProjectQuery(selector, queryParams);
  expect(projectQuery).toEqual({
    'environments.dev.users': {
      $filter: {
        input: '$environments.dev.users',
        as: 'item',
        cond: { $and: [{ $eq: ['$$item.name', 'Tom'] }] },
      },
    },
  });
});

test('get project query multiple query param', () => {
  const selector = 'environments.dev.users';
  const queryParams = { name: 'Tom', age: 39 };
  const projectQuery = getProjectQuery(selector, queryParams);
  expect(projectQuery).toEqual({
    'environments.dev.users': {
      $filter: {
        input: '$environments.dev.users',
        as: 'item',
        cond: {
          $and: [{ $eq: ['$$item.name', 'Tom'] }, { $eq: ['$$item.age', 39] }],
        },
      },
    },
  });
});

test('find entity db query test', () => {
  const environment = 'dev';
  const entity = 'users';
  const query = getEntityDbQuery(entity, environment);
  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
  expect(query[2]).toEqual({ $project: { users: 1, _id: 0 } });
});

test('find entity db query params', () => {
  const entity = 'users';
  const environment = 'dev';
  const queryParams = { name: 'Tom' };
  const query = getEntityByQueryParamsDbQuery(entity, environment, queryParams);
  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({
    $project: {
      'environments.dev.users': {
        $filter: {
          input: '$environments.dev.users',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item.name', 'Tom'] }] },
        },
      },
    },
  });
  expect(query[2]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
});

test('find entity db multiple query params', () => {
  const entity = 'posts';
  const environment = 'dev';
  const queryParams = { text: 'hello', rating: 5 };
  const query = getEntityByQueryParamsDbQuery(entity, environment, queryParams);
  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({
    $project: {
      'environments.dev.posts': {
        $filter: {
          input: '$environments.dev.posts',
          as: 'item',
          cond: {
            $and: [
              { $eq: ['$$item.text', 'hello'] },
              { $eq: ['$$item.rating', 5] },
            ],
          },
        },
      },
    },
  });
  expect(query[2]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
});

test('find entity by id db query', () => {
  const environment = 'dev';
  const pathSegments = ['users', '6019284f26bbc9dbe92d01d0'];
  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');

  const query = getEntityByIdDbQuery(pathSegments, environment);
  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({
    $project: {
      'environments.dev.users': {
        $filter: {
          input: '$environments.dev.users',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item._id', userId] }] },
        },
      },
    },
  });

  expect(query[2]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
});

test('find entity by id nested db query', () => {
  const environment = 'dev';
  const pathSegments = [
    'users',
    '6019284f26bbc9dbe92d01d0',
    'posts',
    '60192540b9565cda13b56fdd',
  ];
  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');
  const postId = mongoose.Types.ObjectId('60192540b9565cda13b56fdd');

  const query = getEntityByIdDbQuery(pathSegments, environment);
  expect(query.length).toBe(5);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({ $unwind: '$environments.dev.users' });
  expect(query[2]).toEqual({
    $match: { 'environments.dev.users._id': userId },
  });
  expect(query[3]).toEqual({
    $project: {
      'environments.dev.users.posts': {
        $filter: {
          input: '$environments.dev.users.posts',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item._id', postId] }] },
        },
      },
    },
  });
  expect(query[4]).toEqual({
    $replaceRoot: { newRoot: '$environments.dev.users' },
  });
});

test('find nested entities with single query param', () => {
  const pathSegments = ['users', '6019284f26bbc9dbe92d01d0', 'posts'];
  const environment = 'dev';
  const queryParams = { text: 'hello' };

  const query = getNestedEntitiesByQueryParamsDbQuery(
    pathSegments,
    environment,
    queryParams,
  );

  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');

  expect(query.length).toBe(4);
  expect(query[0]).toEqual({ $unwind: '$environments.dev.users' });
  expect(query[1]).toEqual({
    $match: { 'environments.dev.users._id': userId },
  });
  expect(query[2]).toEqual({
    $project: {
      'environments.dev.users.posts': {
        $filter: {
          input: '$environments.dev.users.posts',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item.text', 'hello'] }] },
        },
      },
    },
  });
  expect(query[3]).toEqual({
    $replaceRoot: { newRoot: '$environments.dev.users' },
  });
});

test('find nested entities with multiple query params', () => {
  const pathSegments = ['users', '6019284f26bbc9dbe92d01d0', 'posts'];
  const environment = 'dev';
  const queryParams = { text: 'hello', rating: 5 };

  const query = getNestedEntitiesByQueryParamsDbQuery(
    pathSegments,
    environment,
    queryParams,
  );

  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');

  expect(query.length).toBe(4);
  expect(query[0]).toEqual({ $unwind: '$environments.dev.users' });
  expect(query[1]).toEqual({
    $match: { 'environments.dev.users._id': userId },
  });
  expect(query[2]).toEqual({
    $project: {
      'environments.dev.users.posts': {
        $filter: {
          input: '$environments.dev.users.posts',
          as: 'item',
          cond: {
            $and: [
              { $eq: ['$$item.text', 'hello'] },
              { $eq: ['$$item.rating', 5] },
            ],
          },
        },
      },
    },
  });
  expect(query[3]).toEqual({
    $replaceRoot: { newRoot: '$environments.dev.users' },
  });
});

test('get db query for entity', () => {
  const pathSegments = ['users'];
  const environment = 'dev';
  const queryParams = null;
  const query = getDbQuery(pathSegments, environment, queryParams);

  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
  expect(query[2]).toEqual({ $project: { users: 1, _id: 0 } });
});

test('get db query for entity with query params', () => {
  const pathSegments = ['users'];
  const environment = 'dev';
  const queryParams = { name: 'Tom' };
  const query = getDbQuery(pathSegments, environment, queryParams);
  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({
    $project: {
      'environments.dev.users': {
        $filter: {
          input: '$environments.dev.users',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item.name', 'Tom'] }] },
        },
      },
    },
  });
  expect(query[2]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
});

test('get db query for entity with multiple query params', () => {
  const pathSegments = ['posts'];
  const environment = 'dev';
  const queryParams = { text: 'hello', rating: 5 };
  const query = getDbQuery(pathSegments, environment, queryParams);
  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({
    $project: {
      'environments.dev.posts': {
        $filter: {
          input: '$environments.dev.posts',
          as: 'item',
          cond: {
            $and: [
              { $eq: ['$$item.text', 'hello'] },
              { $eq: ['$$item.rating', 5] },
            ],
          },
        },
      },
    },
  });
  expect(query[2]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
});

test('get db query for entity with id', () => {
  const environment = 'dev';
  const pathSegments = ['users', '6019284f26bbc9dbe92d01d0'];
  const queryParams = null;
  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');

  const query = getDbQuery(pathSegments, environment, queryParams);
  expect(query.length).toBe(3);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({
    $project: {
      'environments.dev.users': {
        $filter: {
          input: '$environments.dev.users',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item._id', userId] }] },
        },
      },
    },
  });

  expect(query[2]).toEqual({ $replaceRoot: { newRoot: '$environments.dev' } });
});

test('get db query for nested entity with id', () => {
  const environment = 'dev';
  const pathSegments = [
    'users',
    '6019284f26bbc9dbe92d01d0',
    'posts',
    '60192540b9565cda13b56fdd',
  ];
  const queryParams = null;
  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');
  const postId = mongoose.Types.ObjectId('60192540b9565cda13b56fdd');

  const query = getEntityByIdDbQuery(pathSegments, environment, queryParams);
  expect(query.length).toBe(5);
  expect(query[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(query[1]).toEqual({ $unwind: '$environments.dev.users' });
  expect(query[2]).toEqual({
    $match: { 'environments.dev.users._id': userId },
  });
  expect(query[3]).toEqual({
    $project: {
      'environments.dev.users.posts': {
        $filter: {
          input: '$environments.dev.users.posts',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item._id', postId] }] },
        },
      },
    },
  });
  expect(query[4]).toEqual({
    $replaceRoot: { newRoot: '$environments.dev.users' },
  });
});

test('find nested entities with single query param', () => {
  const pathSegments = ['users', '6019284f26bbc9dbe92d01d0', 'posts'];
  const environment = 'dev';
  const queryParams = { text: 'hello' };

  const query = getDbQuery(pathSegments, environment, queryParams);

  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');

  expect(query.length).toBe(4);
  expect(query[0]).toEqual({ $unwind: '$environments.dev.users' });
  expect(query[1]).toEqual({
    $match: { 'environments.dev.users._id': userId },
  });
  expect(query[2]).toEqual({
    $project: {
      'environments.dev.users.posts': {
        $filter: {
          input: '$environments.dev.users.posts',
          as: 'item',
          cond: { $and: [{ $eq: ['$$item.text', 'hello'] }] },
        },
      },
    },
  });
  expect(query[3]).toEqual({
    $replaceRoot: { newRoot: '$environments.dev.users' },
  });
});

test('find nested entities with multiple query params', () => {
  const pathSegments = ['users', '6019284f26bbc9dbe92d01d0', 'posts'];
  const environment = 'dev';
  const queryParams = { text: 'hello', rating: 5 };

  const query = getDbQuery(pathSegments, environment, queryParams);

  const userId = mongoose.Types.ObjectId('6019284f26bbc9dbe92d01d0');

  expect(query.length).toBe(4);
  expect(query[0]).toEqual({ $unwind: '$environments.dev.users' });
  expect(query[1]).toEqual({
    $match: { 'environments.dev.users._id': userId },
  });
  expect(query[2]).toEqual({
    $project: {
      'environments.dev.users.posts': {
        $filter: {
          input: '$environments.dev.users.posts',
          as: 'item',
          cond: {
            $and: [
              { $eq: ['$$item.text', 'hello'] },
              { $eq: ['$$item.rating', 5] },
            ],
          },
        },
      },
    },
  });
  expect(query[3]).toEqual({
    $replaceRoot: { newRoot: '$environments.dev.users' },
  });
});

const initializeDb = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const User = getUserModel();
  const user = new User({ username: 'ghost' });
  await user.save();
  await User.findOneAndUpdate(
    { username: 'ghost' },
    { $push: { environments: [{ dev: {} }, { prod: {} }] } },
    { useFindAndModify: false },
  ).exec();
  const users = [
    {
      name: 'John',
      age: 38,
      posts: [
        {
          text: 'hello my name is John',
          comments: [
            {
              text: 'Nice to meet you',
              rating: 5,
            },
            {
              rating: 4,
            },
          ],
        },
        {
          text: 'I like it',
        },
      ],
    },
    {
      name: 'Tom',
      age: 39,
    },
    {
      name: 'Tom',
      age: 39,
    },
  ];
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

describe('get entity tests', () => {
  beforeAll(async () => initializeDb());

  it('first test', async () => {});
});
