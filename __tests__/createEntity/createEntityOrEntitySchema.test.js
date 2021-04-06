const mongoose = require('mongoose');
const {
  createEntityOrEntitySchemaWrapper,
} = require('../../functions/createEntity/createEntityOrEntitySchema');
require('dotenv').config();
const { getUserModel } = require('../../models/user');

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
    const body = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
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

    const response = await createEntityOrEntitySchemaWrapper(event);
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

    const response = await createEntityOrEntitySchemaWrapper(event);
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
      moremore: {},
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    const response = await createEntityOrEntitySchemaWrapper(event);
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

    const response = await createEntityOrEntitySchemaWrapper(event);
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

    const response = await createEntityOrEntitySchemaWrapper(event);
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
