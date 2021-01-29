const mongoose = require('mongoose');
const { Environment } = require('../models/environment.js');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
  getUsernameAndEnv,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

const deleteFieldTemplate = (env, pathSegments) => {
  let unsetSelector =
    'environments.$[envIdentifier].entities.$[entityIdentifier]';

  const firstArrayFilterSelector = `entityIdentifier.${pathSegments[0]}`;
  const firstArrayFilter = {};
  firstArrayFilter[firstArrayFilterSelector] = { $exists: true };
  const arrayFilters = [{ 'envIdentifier.name': env }, firstArrayFilter];

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      unsetSelector = `${unsetSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      const filter = {};
      const idSelector = `${pathSegments[i - 1]}Identifier._id`;
      unsetSelector = `${unsetSelector}.$[${pathSegments[i - 1]}Identifier]`;
      filter[idSelector] = id;
      arrayFilters.push(filter);
    }
  });

  const unsetObject = {};
  unsetObject[unsetSelector] = '';

  const updateTemplate = { $unset: unsetObject };

  const optionsTemplate = { arrayFilters };

  return {
    updateTemplate,
    optionsTemplate,
  };
};

const deleteEntityTemplate = (env, pathSegments) => {
  const entityCondition = {};
  entityCondition[pathSegments[0]] = { $exists: true };

  const updateTemplate = {
    $pull: { 'environments.$[envId].entities': entityCondition },
  };

  const optionsTemplate = {
    arrayFilters: [{ 'envId.name': env }],
  };

  return { updateTemplate, optionsTemplate };
};

const getTemplates = (env, pathSegments) => {
  if (pathSegments.length === 1) {
    return deleteEntityTemplate(env, pathSegments);
  }

  if (pathSegments.length % 2 === 1) {
    return deleteFieldTemplate(env, pathSegments);
  }

  if (pathSegments.length % 2 === 0) {
    // return deleteElementOfArrayTemplate();
  }
};

const deleteEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const url = new URL(event.path);
  const { username, env } = getUsernameAndEnv(url.pathname);
  const pathSegments = getSegmentsWithoutUsernameAndEnv(url.pathname);

  const query = {
    username,
  };
  const { updateTemplate, optionsTemplate } = getTemplates(env, pathSegments);

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
