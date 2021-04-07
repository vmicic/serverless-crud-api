const mongoose = require('mongoose');
const {
  getEntityOrSchemaWrapper,
} = require('../../functions/getEntity/getEntityOrSchema');
const { getUserModel } = require('../../models/user');

const usersWithStringId = [
  {
    name: 'Tom',
    age: 39,
    _id: '6017d641860f43b553b21602',
  },
  {
    name: 'Mark',
    age: 39,
    _id: '600c099f8684263f7419818d',
  },
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
    ],
  },
];

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

describe('get entity or schema wrapper, get entity', () => {
  beforeAll(async () => initializeDb());

  test('get entity', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({ users: usersWithStringId });
  });

  test('get not existing entity', async () => {
    const event = {
      path: '/api/ghost/dev/notexisting',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('get entity with query prop', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { name: 'Mark' },
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      users: [
        {
          name: 'Mark',
          age: 39,
          _id: '600c099f8684263f7419818d',
        },
      ],
    });
  });

  test('get entity with not existing prop', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { name: 'Michel' },
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({ users: [] });
  });

  test('get entity with multiple query props', async () => {
    const event = {
      path: '/api/ghost/dev/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { name: 'Mark', age: 39 },
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      users: [
        {
          name: 'Mark',
          age: 39,
          _id: '600c099f8684263f7419818d',
        },
      ],
    });
  });

  test('get entity with id', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21602',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      users: [
        {
          name: 'Tom',
          age: 39,
          _id: '6017d641860f43b553b21602',
          __embedded: {
            self: '/users/6017d641860f43b553b21602',
          },
        },
      ],
    });
  });

  test('get entity with invalid id', async () => {
    const event = {
      path: '/api/ghost/dev/users/131',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('get entity with not existing id', async () => {
    const event = {
      path: '/api/ghost/dev/users/601a91476e1694058728247c',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({ users: [] });
  });

  test('get nested entity', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
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
    });
  });

  test('get nested entity', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
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
    });
  });

  test('get nested entity with query prop', async () => {
    const event = {
      path: '/api/ghost/dev/users/6017d641860f43b553b21603/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'hello my name is John' },
    };

    const response = await getEntityOrSchemaWrapper(event);
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
      ],
    });
  });

  test('get nested entity with id', async () => {
    const event = {
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'hello my name is John' },
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      posts: [
        {
          text: 'hello my name is John',
          _id: '601a91476e16940587282479',
          __embedded: {
            comments:
              '/users/6017d641860f43b553b21603/posts/601a91476e16940587282479/comments',
            self:
              '/users/6017d641860f43b553b21603/posts/601a91476e16940587282479',
          },
        },
      ],
    });
  });

  test('get deep nested entity', async () => {
    const event = {
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479/comments',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: null,
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
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
    });
  });

  test('get deep nested entity with multiple query props', async () => {
    const event = {
      path:
        '/api/ghost/dev/users/6017d641860f43b553b21603/posts/601a91476e16940587282479/comments',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'Nice to meet you', rating: '5' },
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({
      comments: [
        {
          text: 'Nice to meet you',
          _id: '601a91476e1694058728247a',
          rating: 5,
        },
      ],
    });
  });

  test('get deep nested with not existing id before', async () => {
    const event = {
      path:
        '/api/ghost/dev/users/601a91476e16940587282479/posts/601a91476e16940587282479/comments',
      pathParameters: { username: 'ghost', environment: 'dev' },
      queryStringParameters: { text: 'Nice to meet you', rating: '5' },
    };

    const response = await getEntityOrSchemaWrapper(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
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
          dev: {
            users: {
              name: 'string',
              age: 'number',
              comments: {
                text: 'string',
                ratings: { rating: 'number', date: 'string' },
              },
            },
          },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('get entity or schema wrapper, get schema', () => {
  beforeEach(async () => initDbWithSchema());

  test('get entity schema', async () => {
    const event = {
      path: '/api/ghost/dev/users/__describe',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntityOrSchemaWrapper(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toStrictEqual({
      name: 'string',
      age: 'number',
      comments: {
        text: 'string',
        ratings: { rating: 'number', date: 'string' },
      },
    });
  });

  test('get nested entity schema', async () => {
    const event = {
      path: '/api/ghost/dev/users/comments/__describe',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntityOrSchemaWrapper(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toStrictEqual({
      text: 'string',
      ratings: { rating: 'number', date: 'string' },
    });
  });

  test('get deeply nested entity schema', async () => {
    const event = {
      path: '/api/ghost/dev/users/comments/ratings/__describe',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntityOrSchemaWrapper(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toStrictEqual({
      rating: 'number',
      date: 'string',
    });
  });

  test('no schema', async () => {
    const event = {
      path: '/api/ghost/dev/notexisting/__describe',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntityOrSchemaWrapper(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toStrictEqual({});
  });
});
