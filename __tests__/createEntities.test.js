const mongoose = require('mongoose');
const { getUserModel } = require('../models/user');
const {
  createEntity,
  addIdForObjects,
} = require('../functions/createEntities');
require('dotenv').config();

test('add id for objects with no nested entities', () => {
  const users = [
    {
      name: 'Tom',
      age: 39,
    },
    {
      name: 'Mark',
      age: 39,
    },
    {
      name: 'John',
      age: 38,
    },
  ];

  addIdForObjects(users);
  users.forEach((user) => {
    expect(Object.keys(user).length).toBe(3);
  });
});

test('add id for objects with nested entities', () => {
  const users = [
    { name: 'Tom', age: 39 },
    { name: 'Mark', age: 39 },
    {
      name: 'John',
      age: 38,
      posts: [
        {
          text: 'hello my name is John',
        },
        {
          text: 'I like it',
        },
      ],
    },
  ];

  addIdForObjects(users);
  expect(Object.keys(users[0]).length).toBe(3);
  expect(Object.keys(users[1]).length).toBe(3);
  expect(Object.keys(users[2]).length).toBe(4);
  expect(Object.keys(users[2].posts[0]).length).toBe(2);
  expect(Object.keys(users[2].posts[1]).length).toBe(2);
});

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
  await mongoose.connection.close();
};

describe('create entity tests', () => {
  beforeEach(async () => initializeDb());

  test('create entity', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntity(event);
    expect(response.statusCode).toBe(201);
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
    await mongoose.connection.close();
  });

  test('create entity for not existing env', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };
    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(users),
    };

    const response = await createEntity(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create entity for not existing username', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };
    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntity(event);
    expect(response.statusCode).toBe(404);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create entity with invalid body', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
      moreUsers: [],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntity(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create entity with invalid json', async () => {
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body:
        '"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}],"moreUser":[]}',
    };

    const response = await createEntity(event);
    expect(response.statusCode).toBe(400);
    expect(response.headers).toEqual({ 'Content-type': 'text/plain' });
  });

  test('create nested entities', async () => {
    const users = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38, posts: [{ text: 'hello' }, { text: 'bye' }] },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntity(event);
    expect(response.statusCode).toBe(201);
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
    await mongoose.connection.close();
  });
});
