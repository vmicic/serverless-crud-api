const mongoose = require('mongoose');
const {
  convertStructureToResponse,
  getEntitiesDocs,
  getEntitiesStructure,
} = require('../functions/getEntitiesDocs');
const { getUserModel } = require('../models/user');
require('dotenv').config();

test('get entities structure one entity no nested', () => {
  const entities = {
    users: [
      {
        name: 'michh',
        age: 38,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9ea'),
      },
      {
        name: 'Tom',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f4'),
      },
      {
        name: 'Hercules',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f5'),
      },
    ],
  };

  const structure = getEntitiesStructure(entities);
  expect(structure).toEqual({ users: {} });
});

test('get entities structure two entities no nested', () => {
  const entities = {
    users: [
      {
        name: 'michh',
        age: 38,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9ea'),
      },
      {
        name: 'Tom',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f4'),
      },
      {
        name: 'Hercules',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f5'),
      },
    ],
    usersSecond: [
      {
        name: 'michh',
        age: 38,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9ea'),
      },
      {
        name: 'Tom',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f4'),
      },
      {
        name: 'Hercules',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f5'),
      },
    ],
  };

  const structure = getEntitiesStructure(entities);
  expect(structure).toEqual({ users: {}, usersSecond: {} });
});

test('get entities structure one entity one nested', () => {
  const entities = {
    users: [
      {
        name: 'michh',
        age: 38,
        comments: [
          {
            text: 'hello',
            id: mongoose.Types.ObjectId('605b490e68b15f9bead2a9ea'),
          },
        ],
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9ea'),
      },
      {
        name: 'Tom',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f4'),
      },
      {
        name: 'Hercules',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f5'),
      },
    ],
  };

  const structure = getEntitiesStructure(entities);
  expect(structure).toEqual({ users: { comments: {} } });
});

test('get entities structure one entity multiple nested', () => {
  const entities = {
    users: [
      {
        name: 'michh',
        age: 38,
        comments: [
          {
            text: 'hello',
            id: mongoose.Types.ObjectId('605b490e68b15f9bead2a9ea'),
            ratings: [
              {
                rating: 5,
              },
              {
                rating: 4,
              },
            ],
          },
        ],
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9ea'),
      },
      {
        name: 'Tom',
        age: 39,
        friends: [{ name: 'johanson' }],
        comments: [{ text: 'hello' }],
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f4'),
      },
      {
        name: 'Hercules',
        age: 39,
        _id: mongoose.Types.ObjectId('604b490e68b15f9bead2a9f5'),
      },
    ],
  };

  const structure = getEntitiesStructure(entities);
  expect(structure).toEqual({
    users: { comments: { ratings: {} }, friends: {} },
  });
});

test('convert structure to response one entity no nested', () => {
  const rawStructure = { users: {} };
  const responseStructure = convertStructureToResponse(rawStructure);
  expect(responseStructure).toEqual({ entities: ['users'] });
});

test('convert structure to response two entities no nested', () => {
  const rawStructure = { users: {}, usersSecond: {} };
  const responseStructure = convertStructureToResponse(rawStructure);
  expect(responseStructure).toEqual({ entities: ['users', 'usersSecond'] });
});

test('convert structure to response one entity and one level nested', () => {
  const rawStructure = { users: { comments: {} } };
  const responseStructure = convertStructureToResponse(rawStructure);
  expect(responseStructure).toEqual({ entities: [{ users: ['comments'] }] });
});

test('convert structure to response one entity and one level nested multiple nested', () => {
  const rawStructure = { users: { comments: {}, ratings: {}, friends: {} } };
  const responseStructure = convertStructureToResponse(rawStructure);
  expect(responseStructure).toEqual({
    entities: [{ users: ['comments', 'ratings', 'friends'] }],
  });
});

test('convert structure to response one entity and multiple level nested', () => {
  const rawStructure = { users: { comments: { ratings: { authors: {} } } } };
  const responseStructure = convertStructureToResponse(rawStructure);
  expect(responseStructure).toEqual({
    entities: [{ users: [{ comments: [{ ratings: ['authors'] }] }] }],
  });
});

test('convert structure to response one entity and multiple level nested multiple entities', () => {
  const rawStructure = {
    users: { comments: { ratings: { authors: {} }, likes: {} } },
  };
  const responseStructure = convertStructureToResponse(rawStructure);
  expect(responseStructure).toEqual({
    entities: [{ users: [{ comments: [{ ratings: ['authors'] }, 'likes'] }] }],
  });
});

test('convert structure to response one entity and multiple level nested multiple entities', () => {
  const rawStructure = {
    users: {
      friends: {},
      enemies: {},
      comments: { ratings: { authors: {} }, likes: {} },
    },
  };
  const responseStructure = convertStructureToResponse(rawStructure);
  expect(responseStructure).toEqual({
    entities: [
      {
        users: [
          'friends',
          'enemies',
          { comments: [{ ratings: ['authors'] }, 'likes'] },
        ],
      },
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

describe('get pagination response multiple nested entities', () => {
  beforeAll(async () => initializeDb());

  test('get entities not existing entity', async () => {
    const event = {
      path: '/api/ghost/dev/entities/cinemas',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntitiesDocs(event);
    expect(response.statusCode).toBe(400);
  });

  test('get entities not existing nested entity', async () => {
    const event = {
      path: '/api/ghost/dev/entities/users/cinemas',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntitiesDocs(event);
    expect(response.statusCode).toBe(400);
  });

  test('get entities docs multiple level nested', async () => {
    const event = {
      path: '/api/ghost/dev/entities',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntitiesDocs(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      entities: [{ users: [{ posts: ['comments'] }] }],
    });
  });

  test('get entities docs with entity in path', async () => {
    const event = {
      path: '/api/ghost/dev/entities/users',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntitiesDocs(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      entities: [{ posts: ['comments'] }],
    });
  });

  test('get entities docs with entity in path', async () => {
    const event = {
      path: '/api/ghost/dev/entities/users/posts',
      pathParameters: { username: 'ghost', environment: 'dev' },
    };

    const response = await getEntitiesDocs(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      entities: ['comments'],
    });
  });
});
