const mongoose = require('mongoose');
const { getUserModel } = require('../models/user');
const { createEnv, getEnv } = require('../functions/environments');
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

  await User.findOneAndUpdate(
    { username: 'ghost' },
    { $push: { environments: [{ dev: {} }, { prod: {} }] } },
    { useFindAndModify: false },
  ).exec();

  const users = [
    { name: 'John', age: 38 },
    { name: 'Tom', age: 39 },
    { name: 'Tom', age: 39 },
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

describe('create env', () => {
  beforeAll(async () => initializeDb());

  test('create env', async () => {
    const event = {
      path: '/api/ghost',
      pathParameters: { username: 'ghost' },
      body: 'test',
    };

    const response = await createEnv(event);
    expect(response.statusCode).toBe(201);
  });

  test('create already existing env', async () => {
    const event = {
      path: '/api/ghost',
      pathParameters: { username: 'ghost' },
      body: 'test',
    };

    const response = await createEnv(event);
    expect(response.statusCode).toBe(400);
  });

  test('create env with invalid username', async () => {
    const event = {
      path: '/api/notexisting',
      pathParameters: { username: 'notexisting' },
      body: 'test',
    };

    const response = await createEnv(event);
    expect(response.statusCode).toBe(400);
  });

  test('create env with object as environment name', async () => {
    const event = {
      path: '/api/ghost',
      pathParameters: { username: 'ghost' },
      body: { mix: 'mix' },
    };

    const response = await createEnv(event);
    expect(response.statusCode).toBe(400);
  });
});

describe('get env', () => {
  beforeAll(async () => initializeDb());

  test('get empty env', async () => {
    const event = {
      path: '/api/ghost/prod',
      pathParameters: { username: 'ghost', environment: 'prod' },
    };

    const response = await getEnv(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({});
  });

  test('get env with entities', async () => {
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEnv(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).not.toEqual({});
  });

  test('get not existing env', async () => {
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
    };

    const response = await getEnv(event);
    expect(response.statusCode).toBe(404);
  });

  test('get env not existing user', async () => {
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
    };

    const response = await getEnv(event);
    expect(response.statusCode).toBe(404);
  });
});
