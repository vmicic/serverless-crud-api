const mongoose = require('mongoose');
const { getUserModel } = require('../../models/user');
const {
  addIdForObjects,
  getUpdate,
  getOptions,
  getEntitySchema,
  validateFieldExistsInSchema,
  validateType,
  validateEntityWithSchema,
  createEntityInDb,
  createEntity,
} = require('../../functions/createEntity/createEntity');
require('dotenv').config();

describe('add id for objects', () => {
  test('with no nested entities', () => {
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

  test('with nested entities', () => {
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
});

describe('get update', () => {
  test('get update', () => {
    const env = 'dev';
    const entityName = 'users';
    const entity = { users: [{ name: 'John' }, { name: 'Michael' }] };

    const update = getUpdate(env, entityName, entity);
    expect(update).toStrictEqual({
      $set: {
        'environments.$[envId].dev.users': [
          { name: 'John' },
          { name: 'Michael' },
        ],
      },
    });
  });
});

describe('get options', () => {
  test('get options', () => {
    const env = 'dev';
    const options = getOptions(env);
    expect(options).toStrictEqual({
      arrayFilters: [{ 'envId.dev': { $exists: true } }],
      useFindAndModify: false,
    });
  });
});

const initDb = async () => {
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
          dev: { users: { name: 'string', age: 'number', male: 'boolean' } },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('get entity schema', () => {
  beforeAll(async () => initDb());

  test('schema exists', async () => {
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify({ users: [{ name: 'John' }] }),
    };

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const { schemaExists, schema } = await getEntitySchema(event);

    expect(schemaExists).toBeTruthy();
    expect(schema).toStrictEqual({
      name: 'string',
      age: 'number',
      male: 'boolean',
    });

    await mongoose.connection.close();
  });

  test('schema doesnt exist', async () => {
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'moz', environment: 'dev' },
      body: JSON.stringify({ friends: [{ name: 'John' }] }),
    };

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const { schemaExists } = await getEntitySchema(event);
    expect(schemaExists).toBeFalsy();

    await mongoose.connection.close();
  });
});

describe('validate field exists in schema', () => {
  test('exists', () => {
    const field = 'name';
    const entity = { name: 'John' };

    validateFieldExistsInSchema(field, entity);
  });

  test('doesnt exist', () => {
    const field = 'age';
    const entity = { name: 'John' };

    expect(() => {
      validateFieldExistsInSchema(field, entity);
    }).toThrow('Entity does not contain age field.');
  });
});

describe('validate type', () => {
  test('valid type', () => {
    const name = 'John';
    const fieldTypeInSchema = 'string';

    validateType(name, fieldTypeInSchema);
  });

  test('valid type array', () => {
    const friends = [{ name: 'John' }];
    const fieldTypeInSchema = 'array';

    validateType(friends, fieldTypeInSchema);
  });

  test('invalid, expect array got object', () => {
    const user = { name: 'John' };
    const fieldTypeInSchema = 'array';

    expect(() => {
      validateType(user, fieldTypeInSchema);
    }).toThrow('Expected array got object.');
  });

  test('invalid, expect number got objects', () => {
    const user = { name: 'John' };
    const fieldTypeInSchema = 'number';

    expect(() => {
      validateType(user, fieldTypeInSchema);
    }).toThrow('Expected number got object.');
  });

  test('invalid, expect number got string', () => {
    const name = 'John';
    const fieldTypeInSchema = 'number';

    expect(() => {
      validateType(name, fieldTypeInSchema);
    }).toThrow('Expected number got string.');
  });
});

describe('validate entity with schema', () => {
  test('number of keys dont match', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [{ name: 'John' }];

    expect(() => {
      validateEntityWithSchema(entities, schema);
    }).toThrow('Number of fields in entity is not correct');
  });

  test('field doesnt exist in schema', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [
      { name: 'John', age: 30 },
      { name: 'Michale', lastname: 'Thompson' },
    ];

    expect(() => {
      validateEntityWithSchema(entities, schema);
    }).toThrow('Entity does not contain age field.');
  });

  test('field type mismatch', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [{ name: 'John', age: 'two' }];

    expect(() => {
      validateEntityWithSchema(entities, schema);
    }).toThrow('Expected number got string.');
  });

  test('no error, no nested entities', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [{ name: 'John', age: 20 }];

    validateEntityWithSchema(entities, schema);
  });

  test('no error entity with properties with same name, no nested entities', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [
      { name: 'John', age: 20 },
      // eslint-disable-next-line no-dupe-keys
      { name: 'Michale', age: 20, name: 'Sebastian' },
    ];

    validateEntityWithSchema(entities, schema);
  });

  test('number of keys dont match, nested entities', () => {
    const schema = {
      name: 'string',
      comments: { text: 'string', rating: 'number' },
    };
    const entities = [{ name: 'John', comments: [{ text: 'hello' }] }];

    expect(() => {
      validateEntityWithSchema(entities, schema);
    }).toThrow('Number of fields in entity is not correct');
  });

  test('field doesnt exist in schema, nested entities', () => {
    const schema = {
      name: 'string',
      comments: { text: 'string' },
    };
    const entities = [{ name: 'John', comments: [{ rating: 5 }] }];

    expect(() => {
      validateEntityWithSchema(entities, schema);
    }).toThrow('Entity does not contain text field.');
  });

  test('field mismatch, nested entities', () => {
    const schema = { name: 'string', comments: { rating: 'number' } };
    const entities = [{ name: 'John', comments: [{ rating: 'hello' }] }];

    expect(() => {
      validateEntityWithSchema(entities, schema);
    }).toThrow('Expected number got string.');
  });

  test('no error,  nested entities', () => {
    const schema = { name: 'string', comments: { text: 'string' } };
    const entities = [
      {
        name: 'John',
        comments: [{ text: 'hello' }, { text: 'this is comment' }],
      },
    ];

    validateEntityWithSchema(entities, schema);
  });
});

const initDbWithoutSchema = async () => {
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

describe('create entity in db', () => {
  test('username doesnt exist', async () => {
    const body = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };

    const event = {
      path: '/api/notexisting/dev',
      pathParameters: { username: 'notexisting', environment: 'dev' },
      body: JSON.stringify(body),
    };
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await createEntityInDb(body, event);

    await mongoose.connection.close();

    expect(result.n).toBe(0);
    expect(result.nModified).toBe(0);
  });

  test('env doesnt exist', async () => {
    const body = {
      users: [
        { name: 'Rom', age: 39 },
        { name: 'Mark', age: 39 },
        { name: 'John', age: 38 },
      ],
    };

    const event = {
      path: '/api/ghost/notexisting',
      pathParameters: { username: 'ghost', environment: 'notexisting' },
      body: JSON.stringify(body),
    };
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await createEntityInDb(body, event);

    await mongoose.connection.close();

    expect(result.n).toBe(1);
    expect(result.nModified).toBe(0);
  });

  test('everything ok', async () => {
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
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await createEntityInDb(body, event);
    expect(result.n).toBe(1);
    expect(result.nModified).toBe(1);

    const User = getUserModel();
    const doc = await User.findOne({
      username: 'ghost',
      'environments.dev.users': { $exists: true },
    });
    expect(doc).not.toBeNull();
    expect(doc.environments[0].dev.users.length).toBe(3);
    await mongoose.connection.close();
  });
});

describe('create entity without schema', () => {
  beforeEach(async () => initDbWithoutSchema());

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
    expect(response.body).toMatch('Username not found.');
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
          dev: { users: { name: 'string', age: 'number' } },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('create entity with schema no nested', () => {
  beforeEach(async () => initDbWithSchema());

  test('number of keys dont match', async () => {
    const users = { users: [{ name: 'John' }] };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(createEntity(event)).rejects.toThrow(
      'Number of fields in entity is not correct.',
    );
    await mongoose.connection.close();
  });

  test('field doesnt exist in schema', async () => {
    const users = {
      users: [
        { name: 'John', age: 30 },
        { name: 'Michale', lastname: 'Thompson' },
      ],
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(createEntity(event)).rejects.toThrow(
      'Entity does not contain age field.',
    );
  });

  test('field type mismatch', async () => {
    const users = { users: [{ name: 'John', age: 'two' }] };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(createEntity(event)).rejects.toThrow(
      'Expected number got string.',
    );
  });

  test('no error', async () => {
    const users = { users: [{ name: 'John', age: 20 }] };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await createEntity(event);

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

  test('no error entity with properties with same name', async () => {
    const users = {
      users: [
        { name: 'John', age: 20 },
        // eslint-disable-next-line no-dupe-keys
        { name: 'Michale', age: 20, name: 'Sebastian' },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await createEntity(event);
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

  test('everything ok', async () => {
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
    expect(response.body).toMatch('Username not found.');
  });
});

const initDbWithSchemaNested = async () => {
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
              comments: { text: 'string' },
            },
          },
        },
      },
    },
  ).exec();

  await mongoose.connection.close();
};

describe('create entity with schema nested', () => {
  beforeEach(async () => initDbWithSchemaNested());

  test('number of keys dont match', async () => {
    const users = {
      users: [
        { name: 'John', age: 20, comments: [{ text: 'hello', rating: 5 }] },
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(createEntity(event)).rejects.toThrow(
      'Number of fields in entity is not correct.',
    );
    await mongoose.connection.close();
  });

  test('field type mismatch', async () => {
    const users = {
      users: [
        { name: 'John', age: 2, comments: [{ text: 5 }] },
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await expect(createEntity(event)).rejects.toThrow(
      'Expected string got number.',
    );
    await mongoose.connection.close();
  });

  test('no error entity with properties with same name', async () => {
    const users = {
      users: [
        {
          name: 'Michale',
          age: 20,
          // eslint-disable-next-line no-dupe-keys
          comments: [{ text: 'hello', text: 'alloha' }],
        },
      ],
    };
    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(users),
    };

    await createEntity(event);

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
    expect(doc.environments[0].dev.users[0].comments.length).toBe(1);
    expect(doc.environments[0].dev.users[0].comments[0].text).toMatch('alloha');
    await mongoose.connection.close();
  });

  test('everything ok', async () => {
    const body = {
      users: [
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
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
    expect(doc.environments[0].dev.users[0].comments.length).toBe(2);
    expect(doc.environments[0].dev.users[0].comments[1].text).toMatch('friend');
    await mongoose.connection.close();
  });

  test('create with different then schema but with force true', async () => {
    const body = {
      users: [
        {
          name: 'Rom',
          lastname: 'Anderson',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend', rating: 5 }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
      ],
      __meta: {
        force: true,
      },
    };

    const event = {
      path: '/api/ghost/dev',
      pathParameters: { username: 'ghost', environment: 'dev' },
      body: JSON.stringify(body),
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
    expect(doc.environments[0].dev.users[0].comments.length).toBe(2);
    expect(doc.environments[0].dev.users[0].comments[1].text).toMatch('friend');
    expect(doc.environments[0].dev.users[0].comments[1].rating).toBe(5);
    await mongoose.connection.close();
  });

  test('create entity for not existing env', async () => {
    const users = {
      users: [
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
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
        {
          name: 'Rom',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'Mark',
          age: 39,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
        {
          name: 'John',
          age: 38,
          comments: [{ text: 'hello' }, { text: 'friend' }],
        },
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
    expect(response.body).toMatch('Username not found.');
  });
});
