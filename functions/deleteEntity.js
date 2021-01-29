const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
  getUsernameAndEnv,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

const deleteEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const url = new URL(event.path);
  const { username, env } = getUsernameAndEnv(url.pathname);

  const query = {
    username,
  };

  const updateTemplate = {
    $unset: {
      'environments.$[envIdentifier].entities.$[entityIdentifier].posts.$[postIdentifier].comments':
        '',
    },
  };
  const optionsTemplate = {
    arrayFilters: [
      { 'envIdentifier.name': 'dev' },
      { 'entityIdentifier.posts': { $exists: true } },
      { 'postIdentifier.comments': { $exists: true } },
    ],
  };

  const result = await User.updateOne(query, updateTemplate, optionsTemplate);
  console.log(result);
  await mongoose.connection.close();
};

module.exports = { deleteEntity };

// del users/id
//      $pull: { environments: { name: env } },
// {
//   $pull: {
//     'environments.$[envIdentifier].entities.$[entityIdentifier].users': {
//       name: 'Jane',
//     },
//   },
// },
// {
//   arrayFilters: [
//     { 'envIdentifier.name': 'prod' },
//     { entityIdentifier: { $exists: true } },
//   ],
// },

// del users
// {
//   $pull: {
//     'environments.$[envIdentifier].entities': {
//       users: { $exists: true },
//     },
//   },
// },
// {
//   arrayFilters: [{ 'envIdentifier.name': 'prod' }],
// },
// );

// remove post
// const result = await User.updateOne(
//   query,
//   {
//     $pull: {
//       'environments.$[envIdentifier].entities.$[entityIdentifier].posts': {
//         content: 'great',
//       },
//     },
//   },
//   {
//     arrayFilters: [
//       { 'envIdentifier.name': 'dev' },
//       { 'entityIdentifier.posts': { $exists: true } },
//     ],
//   },
// );
