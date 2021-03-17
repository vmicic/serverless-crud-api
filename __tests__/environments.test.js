const mongoose = require('mongoose');
const { getUserModel } = require('../models/user');
const { getEnv, getEnvs } = require('../functions/getEnvironments');
const { createEnv } = require('../functions/createEnvironment');
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
    {
      name: 'John',
      age: 38,
      _id: mongoose.Types.ObjectId('6017d641860f43b553b21603'),
    },
    {
      name: 'Tom',
      age: 39,
      _id: mongoose.Types.ObjectId('6017d641860f43b553b21602'),
    },
    {
      name: 'Tom',
      age: 39,
      _id: mongoose.Types.ObjectId('600c099f8684263f7419818d'),
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
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create already existing env', async () => {
    const event = {
      path: '/api/ghost',
      pathParameters: { username: 'ghost' },
      body: 'test',
    };

    const response = await createEnv(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create env with invalid username', async () => {
    const event = {
      path: '/api/notexisting',
      pathParameters: { username: 'notexisting' },
      body: 'test',
    };

    const response = await createEnv(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create env with object as environment name', async () => {
    const event = {
      path: '/api/ghost',
      pathParameters: { username: 'ghost' },
      body: { mix: 'mix' },
    };

    const response = await createEnv(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
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
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).toEqual({});
  });

  test('get env with entities', async () => {
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEnv(event);
    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'Content-type': 'application/json' });
    expect(JSON.parse(response.body)).not.toEqual({});
  });

  test('get env docs', async () => {
    const event = {
      path: '/api/ghost/envs',
      pathParameters: { username: 'ghost' },
    };

    const response = await getEnvs(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ envs: ['dev', 'prod'] });
  });

  test('get not existing env', async () => {
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
    };

    const response = await getEnv(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('get env not existing user', async () => {
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
    };

    const response = await getEnv(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });
});
