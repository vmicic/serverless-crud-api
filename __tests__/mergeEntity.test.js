/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const { getUserModel } = require('../models/user');
const {
  mergeEntity,
  addId,
  getQueryParams,
} = require('../functions/mergeEntity');
require('dotenv').config();

test('add id entity', () => {
  const entity = {
    posts: [{ text: 'hello' }, { text: 'bye' }],
    ratings: [5, 10],
  };

  addId(entity);
  expect(entity.posts[0]._id).not.toBeNull();
  expect(entity.ratings[0]._id).toBeUndefined();
  expect(entity._id).toBeUndefined();
});

test('get query params for update', () => {
  const event = {
    path: '/api/ghost/dev/users/601d0913ebddc2403083eae9',
    pathParameters: { username: 'ghost', environment: 'dev' },
  };

  const env = 'dev';
  const pathSegments = ['users', '601d0913ebddc2403083eae9'];
  const entity = { name: 'Johnny', age: '20' };

  const { update, options } = getQueryParams(env, pathSegments, entity);
  expect(update).toEqual({
    $set: {
      'environments.$[envId].dev.users.$[usersId].name': 'Johnny',
      'environments.$[envId].dev.users.$[usersId].age': 20,
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('601d0913ebddc2403083eae9') },
    ],
  });
});

test('get query params for update with nested entities', () => {
  const event = {
    path: '/api/ghost/dev/users/601d0913ebddc2403083eae9',
    pathParameters: { username: 'ghost', environment: 'dev' },
  };

  const env = 'dev';
  const pathSegments = [
    'users',
    '601d0913ebddc2403083eae9',
    'posts',
    '601d0c80b18e7540dac4da59',
  ];
  const entity = { text: 'Johnny', rating: '20' };

  const { update, options } = getQueryParams(env, pathSegments, entity);
  expect(update).toEqual({
    $set: {
      'environments.$[envId].dev.users.$[usersId].posts.$[postsId].text':
        'Johnny',
      'environments.$[envId].dev.users.$[usersId].posts.$[postsId].rating': 20,
    },
  });
  expect(options).toEqual({
    arrayFilters: [
      { 'envId.dev': { $exists: true } },
      { 'usersId._id': mongoose.Types.ObjectId('601d0913ebddc2403083eae9') },
      { 'postsId._id': mongoose.Types.ObjectId('601d0c80b18e7540dac4da59') },
    ],
  });
});
