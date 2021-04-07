const mongoose = require('mongoose');

const {
  getResponse,
  getSchema,
} = require('../../functions/getEntity/getEntitySchema');
const { getUserModel } = require('../../models/user');

require('dotenv').config();

describe('get response', () => {
  test('not existing schema response', () => {
    const schema = undefined;
    const response = getResponse(schema);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toStrictEqual({});
  });

  test('schema response', () => {
    const schema = { from: 'string', to: 'number' };
    const response = getResponse(schema);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toStrictEqual(schema);
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

describe('get schema', () => {
  beforeEach(async () => initDbWithSchema());

  test('get entity schema', async () => {
    const event = {
      path: '/api/ghost/dev/users/__describe',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getSchema(event);

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

    const response = await getSchema(event);

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

    const response = await getSchema(event);

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

    const response = await getSchema(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toStrictEqual({});
  });
});
