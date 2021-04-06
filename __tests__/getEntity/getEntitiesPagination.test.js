const mongoose = require('mongoose');
const {
  isPagination,
  getPaginationResponse,
  getEntityDbQuery,
  getNestedEntityDbQuery,
  getDbQuery,
  convertToPaginationResponse,
  replaceRoot,
} = require('../../functions/getEntity/getEntityPagination');
const { getUserModel } = require('../../models/user');
require('dotenv').config();

test('is pagination more query params', () => {
  const pathSegments = ['users'];
  const queryParams = { page: 1, per_page: 2, name: 'John' };
  expect(isPagination(pathSegments, queryParams)).toBeFalsy();
});

test('is pagination one query param', () => {
  const pathSegments = ['users'];
  const queryParams = { page: 1 };
  expect(isPagination(pathSegments, queryParams)).toBeFalsy();
});

test('is pagination one wrong query param', () => {
  const pathSegments = ['users'];
  const queryParams = { page: 1, wrong: 2 };
  expect(isPagination(pathSegments, queryParams)).toBeFalsy();
});

test('is pagination null query param', () => {
  const pathSegments = ['users'];
  const queryParams = null;
  expect(isPagination(pathSegments, queryParams)).toBeFalsy();
});

test('is pagination undefined query param', () => {
  const pathSegments = ['users'];
  const queryParams = undefined;
  expect(isPagination(pathSegments, queryParams)).toBeFalsy();
});

test('is pagination more query params', () => {
  const pathSegments = ['users', 'some random id'];
  const queryParams = { page: 1, per_page: 2 };
  expect(isPagination(pathSegments, queryParams)).toBeFalsy();
});

test('is pagination more query params', () => {
  const pathSegments = ['users', 'some random id', 'comments'];
  const queryParams = { page: 1, per_page: 2 };
  expect(isPagination(pathSegments, queryParams)).toBeTruthy();
});

test('is pagination more query params', () => {
  const pathSegments = ['users'];
  const queryParams = { page: 1, per_page: 2 };
  expect(isPagination(pathSegments, queryParams)).toBeTruthy();
});

test('get entity db query shallow', () => {
  const entity = 'users';
  const env = 'dev';
  const queryParams = { page: 1, per_page: 2 };

  const dbQuery = getEntityDbQuery(entity, env, queryParams);

  expect(dbQuery[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(dbQuery[1]).toEqual({
    $project: {
      'environments.dev.users': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.dev.users' },
    },
  });
  expect(dbQuery[2]).toEqual({ $unwind: '$environments.dev.users' });
  expect(dbQuery[3]).toEqual({ $skip: 0 });
  expect(dbQuery[4]).toEqual({ $limit: 2 });
});

test('get entity db query shallow', () => {
  const entity = 'users';
  const env = 'dev';
  const queryParams = { page: 2, per_page: 5 };

  const dbQuery = getEntityDbQuery(entity, env, queryParams);

  expect(dbQuery[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(dbQuery[1]).toEqual({
    $project: {
      'environments.dev.users': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.dev.users' },
    },
  });
  expect(dbQuery[2]).toEqual({ $unwind: '$environments.dev.users' });
  expect(dbQuery[3]).toEqual({ $skip: 5 });
  expect(dbQuery[4]).toEqual({ $limit: 5 });
});

test('get entity db query shallow', () => {
  const entity = 'users';
  const env = 'dev';
  const queryParams = { page: 2, per_page: 5 };

  const dbQuery = getEntityDbQuery(entity, env, queryParams);

  expect(dbQuery[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(dbQuery[1]).toEqual({
    $project: {
      'environments.dev.users': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.dev.users' },
    },
  });
  expect(dbQuery[2]).toEqual({ $unwind: '$environments.dev.users' });
  expect(dbQuery[3]).toEqual({ $skip: 5 });
  expect(dbQuery[4]).toEqual({ $limit: 5 });
});

test('get entity db query shallow', () => {
  const entity = 'comments';
  const env = 'prod';
  const queryParams = { page: 2, per_page: 5 };

  const dbQuery = getEntityDbQuery(entity, env, queryParams);

  expect(dbQuery[0]).toEqual({
    $match: { 'environments.prod': { $exists: true } },
  });
  expect(dbQuery[1]).toEqual({
    $project: {
      'environments.prod.comments': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.prod.comments' },
    },
  });
  expect(dbQuery[2]).toEqual({ $unwind: '$environments.prod.comments' });
  expect(dbQuery[3]).toEqual({ $skip: 5 });
  expect(dbQuery[4]).toEqual({ $limit: 5 });
});

test('get entity db query nested', () => {
  const pathSegments = ['users', '6017d641860f43b553b21603', 'comments'];
  const env = 'dev';
  const queryParams = { page: 1, per_page: 2 };

  const dbQuery = getNestedEntityDbQuery(pathSegments, env, queryParams);

  expect(dbQuery[0]).toEqual({ $unwind: '$environments.dev.users' });
  expect(dbQuery[1]).toEqual({
    $match: {
      'environments.dev.users._id': mongoose.Types.ObjectId(
        '6017d641860f43b553b21603',
      ),
    },
  });
  expect(dbQuery[2]).toEqual({
    $project: {
      'environments.dev.users.comments': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.dev.users.comments' },
    },
  });
  expect(dbQuery[3]).toEqual({ $unwind: '$environments.dev.users.comments' });
  expect(dbQuery[4]).toEqual({ $skip: 0 });
  expect(dbQuery[5]).toEqual({ $limit: 2 });
});

test('get entity db query deeply nested', () => {
  const pathSegments = [
    'users',
    '6017d641860f43b553b21603',
    'comments',
    '6019284f26bbc9dbe92d01d0',
    'ratings',
  ];
  const env = 'dev';
  const queryParams = { page: 1, per_page: 2 };

  const dbQuery = getNestedEntityDbQuery(pathSegments, env, queryParams);

  expect(dbQuery[0]).toEqual({ $unwind: '$environments.dev.users' });
  expect(dbQuery[1]).toEqual({
    $match: {
      'environments.dev.users._id': mongoose.Types.ObjectId(
        '6017d641860f43b553b21603',
      ),
    },
  });
  expect(dbQuery[2]).toEqual({ $unwind: '$environments.dev.users.comments' });
  expect(dbQuery[3]).toEqual({
    $match: {
      'environments.dev.users.comments._id': mongoose.Types.ObjectId(
        '6019284f26bbc9dbe92d01d0',
      ),
    },
  });
  expect(dbQuery[4]).toEqual({
    $project: {
      'environments.dev.users.comments.ratings': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.dev.users.comments.ratings' },
    },
  });
  expect(dbQuery[5]).toEqual({
    $unwind: '$environments.dev.users.comments.ratings',
  });
  expect(dbQuery[6]).toEqual({ $skip: 0 });
  expect(dbQuery[7]).toEqual({ $limit: 2 });
});

test('get db query shallow', () => {
  const pathSegments = ['users'];
  const env = 'dev';
  const queryParams = { page: 1, per_page: 2 };

  const dbQuery = getDbQuery(pathSegments, env, queryParams);

  expect(dbQuery[0]).toEqual({
    $match: { 'environments.dev': { $exists: true } },
  });
  expect(dbQuery[1]).toEqual({
    $project: {
      'environments.dev.users': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.dev.users' },
    },
  });
  expect(dbQuery[2]).toEqual({ $unwind: '$environments.dev.users' });
  expect(dbQuery[3]).toEqual({ $skip: 0 });
  expect(dbQuery[4]).toEqual({ $limit: 2 });
});

test('get db query nested', () => {
  const pathSegments = [
    'users',
    '6017d641860f43b553b21603',
    'comments',
    '6019284f26bbc9dbe92d01d0',
    'ratings',
  ];
  const env = 'dev';
  const queryParams = { page: 1, per_page: 2 };

  const dbQuery = getDbQuery(pathSegments, env, queryParams);

  expect(dbQuery[0]).toEqual({ $unwind: '$environments.dev.users' });
  expect(dbQuery[1]).toEqual({
    $match: {
      'environments.dev.users._id': mongoose.Types.ObjectId(
        '6017d641860f43b553b21603',
      ),
    },
  });
  expect(dbQuery[2]).toEqual({ $unwind: '$environments.dev.users.comments' });
  expect(dbQuery[3]).toEqual({
    $match: {
      'environments.dev.users.comments._id': mongoose.Types.ObjectId(
        '6019284f26bbc9dbe92d01d0',
      ),
    },
  });
  expect(dbQuery[4]).toEqual({
    $project: {
      'environments.dev.users.comments.ratings': 1,
      _id: 0,
      sizeOfArray: { $size: '$environments.dev.users.comments.ratings' },
    },
  });
  expect(dbQuery[5]).toEqual({
    $unwind: '$environments.dev.users.comments.ratings',
  });
  expect(dbQuery[6]).toEqual({ $skip: 0 });
  expect(dbQuery[7]).toEqual({ $limit: 2 });
});

test('replace root shallow', () => {
  const doc = [
    {
      environments: {
        dev: { users: { name: 'John' } },
      },
      sizeOfArray: 3,
    },
    {
      environments: {
        dev: { users: { name: 'Hector' } },
      },
      sizeOfArray: 3,
    },
    {
      environments: {
        dev: { users: { name: 'Tom' } },
      },
      sizeOfArray: 3,
    },
  ];
  const pathSegments = ['users'];
  const env = 'dev';

  const newRootDoc = replaceRoot(doc, pathSegments, env);
  expect(newRootDoc).toEqual({
    users: [{ name: 'John' }, { name: 'Hector' }, { name: 'Tom' }],
    sizeOfArray: 3,
  });
});

test('replace root nested', () => {
  const doc = [
    {
      environments: {
        dev: { users: { comments: { text: 'hello' } } },
      },
      sizeOfArray: 3,
    },
    {
      environments: {
        dev: { users: { comments: { text: 'how are you' } } },
      },
      sizeOfArray: 3,
    },
    {
      environments: {
        dev: { users: { comments: { text: 'im fine' } } },
      },
      sizeOfArray: 3,
    },
  ];
  const pathSegments = ['users', '6017d641860f43b553b21603', 'comments'];
  const env = 'dev';

  const newRootDoc = replaceRoot(doc, pathSegments, env);
  expect(newRootDoc).toEqual({
    comments: [{ text: 'hello' }, { text: 'how are you' }, { text: 'im fine' }],
    sizeOfArray: 3,
  });
});

test('convert to pagination response shallow first page', () => {
  const doc = {
    users: [{ name: 'John' }, { name: 'Hector' }],
    sizeOfArray: 3,
  };
  const pathSegments = ['users'];
  const queryParams = { page: 1, per_page: 2 };

  const paginationResponse = convertToPaginationResponse(
    doc,
    pathSegments,
    queryParams,
  );

  expect(paginationResponse).toEqual({
    users: [{ name: 'John' }, { name: 'Hector' }],
    __embedded: {
      self: '/users?page=1&per_page=2',
      next: '/users?page=2&per_page=2',
      first: '/users?page=1&per_page=2',
      last: '/users?page=2&per_page=2',
      ammount: 2,
      current_page: 1,
      total: 3,
      per_page: 2,
    },
  });
});

test('convert to pagination response shallow last page', () => {
  const doc = {
    users: [{ name: 'John' }],
    sizeOfArray: 3,
  };
  const pathSegments = ['users'];
  const queryParams = { page: 2, per_page: 2 };

  const paginationResponse = convertToPaginationResponse(
    doc,
    pathSegments,
    queryParams,
  );

  expect(paginationResponse).toEqual({
    users: [{ name: 'John' }],
    __embedded: {
      self: '/users?page=2&per_page=2',
      previous: '/users?page=1&per_page=2',
      first: '/users?page=1&per_page=2',
      last: '/users?page=2&per_page=2',
      ammount: 1,
      current_page: 2,
      total: 3,
      per_page: 2,
    },
  });
});

test('convert to pagination response shallow', () => {
  const doc = {
    users: [{ name: 'John' }, { name: 'Hector' }, { name: 'Tom' }],
    sizeOfArray: 9,
  };
  const pathSegments = ['users'];
  const queryParams = { page: 3, per_page: 3 };

  const paginationResponse = convertToPaginationResponse(
    doc,
    pathSegments,
    queryParams,
  );

  expect(paginationResponse).toEqual({
    users: [{ name: 'John' }, { name: 'Hector' }, { name: 'Tom' }],
    __embedded: {
      self: '/users?page=3&per_page=3',
      previous: '/users?page=2&per_page=3',
      first: '/users?page=1&per_page=3',
      last: '/users?page=3&per_page=3',
      ammount: 3,
      current_page: 3,
      total: 9,
      per_page: 3,
    },
  });
});

test('convert to pagination response nested first page', () => {
  const doc = {
    comments: [{ text: 'hello' }, { text: 'how are you' }],
    sizeOfArray: 3,
  };
  const pathSegments = ['users', '6017d641860f43b553b21603', 'comments'];
  const queryParams = { page: 1, per_page: 2 };

  const paginationResponse = convertToPaginationResponse(
    doc,
    pathSegments,
    queryParams,
  );

  expect(paginationResponse).toEqual({
    comments: [{ text: 'hello' }, { text: 'how are you' }],
    __embedded: {
      self: '/users/6017d641860f43b553b21603/comments?page=1&per_page=2',
      next: '/users/6017d641860f43b553b21603/comments?page=2&per_page=2',
      first: '/users/6017d641860f43b553b21603/comments?page=1&per_page=2',
      last: '/users/6017d641860f43b553b21603/comments?page=2&per_page=2',
      ammount: 2,
      current_page: 1,
      total: 3,
      per_page: 2,
    },
  });
});

test('convert to pagination response nested first page', () => {
  const doc = {
    comments: [{ text: 'how are you' }],
    sizeOfArray: 3,
  };
  const pathSegments = ['users', '6017d641860f43b553b21603', 'comments'];
  const queryParams = { page: 2, per_page: 2 };

  const paginationResponse = convertToPaginationResponse(
    doc,
    pathSegments,
    queryParams,
  );

  expect(paginationResponse).toEqual({
    comments: [{ text: 'how are you' }],
    __embedded: {
      self: '/users/6017d641860f43b553b21603/comments?page=2&per_page=2',
      previous: '/users/6017d641860f43b553b21603/comments?page=1&per_page=2',
      first: '/users/6017d641860f43b553b21603/comments?page=1&per_page=2',
      last: '/users/6017d641860f43b553b21603/comments?page=2&per_page=2',
      ammount: 1,
      current_page: 2,
      total: 3,
      per_page: 2,
    },
  });
});

test('convert to pagination response nested', () => {
  const doc = {
    comments: [{ text: 'hello' }, { text: 'how are you' }, { text: 'im fine' }],
    sizeOfArray: 9,
  };
  const pathSegments = ['users', '6017d641860f43b553b21603', 'comments'];
  const queryParams = { page: 3, per_page: 3 };

  const paginationResponse = convertToPaginationResponse(
    doc,
    pathSegments,
    queryParams,
  );

  expect(paginationResponse).toEqual({
    comments: [{ text: 'hello' }, { text: 'how are you' }, { text: 'im fine' }],
    __embedded: {
      self: '/users/6017d641860f43b553b21603/comments?page=3&per_page=3',
      previous: '/users/6017d641860f43b553b21603/comments?page=2&per_page=3',
      first: '/users/6017d641860f43b553b21603/comments?page=1&per_page=3',
      last: '/users/6017d641860f43b553b21603/comments?page=3&per_page=3',
      ammount: 3,
      current_page: 3,
      total: 9,
      per_page: 3,
    },
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
      {
        text: 'omg so many posts',
        _id: mongoose.Types.ObjectId('604874d1d2d3ab6010dde4af'),
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
  await User.findOneAndUpdate(
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
      useFindAndModify: false,
    },
  ).exec();

  await mongoose.connection.close();
};

describe('get pagination response', () => {
  beforeAll(async () => initializeDb());

  test('page doesnt exists', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { page: 5, per_page: 2 },
    };

    const response = await getPaginationResponse(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('get pagination for shallow entity first page', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { page: 1, per_page: 2 },
    };

    const response = await getPaginationResponse(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      users: [
        { name: 'Tom', age: 39, _id: '6017d641860f43b553b21602' },
        { name: 'Mark', age: 39, _id: '600c099f8684263f7419818d' },
      ],
      __embedded: {
        self: '/users?page=1&per_page=2',
        next: '/users?page=2&per_page=2',
        first: '/users?page=1&per_page=2',
        last: '/users?page=2&per_page=2',
        ammount: 2,
        current_page: 1,
        total: 3,
        per_page: 2,
      },
    });
  });

  test('get pagination for shallow entity first page', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { page: 2, per_page: 1 },
    };

    const response = await getPaginationResponse(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      users: [{ name: 'Mark', age: 39, _id: '600c099f8684263f7419818d' }],
      __embedded: {
        self: '/users?page=2&per_page=1',
        next: '/users?page=3&per_page=1',
        previous: '/users?page=1&per_page=1',
        first: '/users?page=1&per_page=1',
        last: '/users?page=3&per_page=1',
        ammount: 1,
        current_page: 2,
        total: 3,
        per_page: 1,
      },
    });
  });

  test('get pagination for shallow entity last page', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { page: 2, per_page: 2 },
    };

    const response = await getPaginationResponse(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      users: [
        {
          name: 'John',
          age: 38,
          _id: '6017d641860f43b553b21603',
          posts: [
            {
              text: 'hello my name is John',
              _id: '601a91476e16940587282479',
              comments: [
                {
                  text: 'Nice to meet you',
                  _id: '601a91476e1694058728247a',
                  rating: 5,
                },
                {
                  _id: '601a91476e1694058728247d',
                  rating: 4,
                },
              ],
            },
            {
              text: 'I like it',
              _id: '601a91476e1694058728247b',
            },
            {
              text: 'omg so many posts',
              _id: '604874d1d2d3ab6010dde4af',
            },
          ],
        },
      ],
      __embedded: {
        self: '/users?page=2&per_page=2',
        previous: '/users?page=1&per_page=2',
        first: '/users?page=1&per_page=2',
        last: '/users?page=2&per_page=2',
        ammount: 1,
        current_page: 2,
        total: 3,
        per_page: 2,
      },
    });
  });

  test('get pagination for mested entity first page', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { page: 1, per_page: 2 },
    };

    const response = await getPaginationResponse(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      posts: [
        {
          text: 'hello my name is John',
          _id: '601a91476e16940587282479',
          comments: [
            {
              text: 'Nice to meet you',
              _id: '601a91476e1694058728247a',
              rating: 5,
            },
            {
              _id: '601a91476e1694058728247d',
              rating: 4,
            },
          ],
        },
        {
          text: 'I like it',
          _id: '601a91476e1694058728247b',
        },
      ],
      __embedded: {
        self: '/users/6017d641860f43b553b21603/posts?page=1&per_page=2',
        next: '/users/6017d641860f43b553b21603/posts?page=2&per_page=2',
        first: '/users/6017d641860f43b553b21603/posts?page=1&per_page=2',
        last: '/users/6017d641860f43b553b21603/posts?page=2&per_page=2',
        ammount: 2,
        current_page: 1,
        total: 3,
        per_page: 2,
      },
    });
  });

  test('get pagination for mested entity middle page', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { page: 2, per_page: 1 },
    };

    const response = await getPaginationResponse(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      posts: [
        {
          text: 'I like it',
          _id: '601a91476e1694058728247b',
        },
      ],
      __embedded: {
        self: '/users/6017d641860f43b553b21603/posts?page=2&per_page=1',
        next: '/users/6017d641860f43b553b21603/posts?page=3&per_page=1',
        previous: '/users/6017d641860f43b553b21603/posts?page=1&per_page=1',
        first: '/users/6017d641860f43b553b21603/posts?page=1&per_page=1',
        last: '/users/6017d641860f43b553b21603/posts?page=3&per_page=1',
        ammount: 1,
        current_page: 2,
        total: 3,
        per_page: 1,
      },
    });
  });

  test('get pagination for mested entity last page', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { page: 2, per_page: 2 },
    };

    const response = await getPaginationResponse(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      posts: [
        {
          text: 'omg so many posts',
          _id: '604874d1d2d3ab6010dde4af',
        },
      ],
      __embedded: {
        self: '/users/6017d641860f43b553b21603/posts?page=2&per_page=2',
        previous: '/users/6017d641860f43b553b21603/posts?page=1&per_page=2',
        first: '/users/6017d641860f43b553b21603/posts?page=1&per_page=2',
        last: '/users/6017d641860f43b553b21603/posts?page=2&per_page=2',
        ammount: 1,
        current_page: 2,
        total: 3,
        per_page: 2,
      },
    });
  });
});
