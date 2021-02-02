const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');

const baseSelector = 'environments.$[envId].entities.$[entityId]';

const getFirstFilter = (env) => {
  const filter = {};
  const filterSelector = `envId.${env}`;
  filter[filterSelector] = { $exists: true };
  return filter;
};

const deleteFieldTemplate = (env, pathSegments) => {
  let unsetSelector = baseSelector;

  const arrayFilters = getFirstFilter(env, pathSegments[0]);

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      unsetSelector = `${unsetSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      const filter = {};
      const idSelector = `${pathSegments[i - 1]}Id._id`;
      unsetSelector = `${unsetSelector}.$[${pathSegments[i - 1]}Id]`;
      filter[idSelector] = id;
      arrayFilters.push(filter);
    }
  });

  const unsetObject = {};
  unsetObject[unsetSelector] = '';

  const update = { $unset: unsetObject };
  const options = { arrayFilters };

  return { update, options };
};

const deleteNestedEntitySearchParams = (env, pathSegments, queryParams) => {
  let pullSelector = baseSelector;

  const arrayFilters = getFirstFilter(env, pathSegments[0]);

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      pullSelector = `${pullSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      const filter = {};
      const filterSelector = `${pathSegments[i - 1]}Id._id`;
      pullSelector = `${pullSelector}.$[${pathSegments[i - 1]}Id]`;
      filter[filterSelector] = id;
      arrayFilters.push(filter);
    }
  });

  const pullObject = {};
  pullObject[pullSelector] = {};

  Object.entries(queryParams).forEach((entry) => {
    const [key, value] = entry;
    if (+value) {
      pullObject[pullSelector][key] = +value;
    } else {
      pullObject[pullSelector][key] = value;
    }
  });

  const update = {
    $pull: pullObject,
  };
  const options = { arrayFilters };

  return { update, options };
};

// { $unset: { 'environments.$[envId].dev.da': '' } },
// { arrayFilters: [{ 'envId.dev': { $exists: true } }] },
const deleteEntityTemplate = (env, entity) => {
  const unset = {};
  const unsetSelector = `environments.$[envId].${env}.${entity}`;
  unset[unsetSelector] = '';

  const update = {
    $unset: unset,
  };

  const filter = getFirstFilter(env);

  const options = {
    arrayFilters: [filter],
  };

  return { update, options };
};

// { $pull: { 'environments.$[envId].dev.users': { name: 'Tom' } } },
// { arrayFilters: [{ 'envId.dev': { $exists: true } }] },

const deleteEntityWithSearchParams = (env, entity, queryParams) => {
  const filter = getFirstFilter(env);

  const pull = {};
  const pullSelector = `environments.$[envId].${env}.${entity}`;
  pull[pullSelector] = {};

  Object.entries(queryParams).forEach((entry) => {
    const [key, value] = entry;
    if (+value) {
      pull[pullSelector][key] = +value;
    } else {
      pull[pullSelector][key] = value;
    }
  });

  const update = {
    $pull: pull,
  };

  const arrayFilters = [filter];
  const options = { arrayFilters };

  return { update, options };
};

const deleteElementOfArrayTemplate = (env, pathSegments) => {
  const pullObject = {};
  let pullSelector = baseSelector;

  const arrayFilters = getFirstFilter(env, pathSegments[0]);

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      pullSelector = `${pullSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      if (i + 1 === pathSegments.length) {
        pullObject[pullSelector] = { _id: id };
      } else {
        const filter = {};
        const idSelector = `${pathSegments[i - 1]}Id._id`;
        pullSelector = `${pullSelector}.$[${pathSegments[i - 1]}Id]`;
        filter[idSelector] = id;
        arrayFilters.push(filter);
      }
    }
  });

  const update = { $pull: pullObject };
  const options = { arrayFilters };

  return { update, options };
};

const getQueryParams = (env, pathSegments, queryParams) => {
  if (pathSegments.length === 1) {
    if (queryParams !== null) {
      return deleteEntityWithSearchParams(env, pathSegments[0], queryParams);
    }
    return deleteEntityTemplate(env, pathSegments[0]);
  }

  if (pathSegments.length % 2 === 1) {
    if (queryParams !== null) {
      return deleteNestedEntitySearchParams(env, pathSegments, queryParams);
    }
    return deleteFieldTemplate(env, pathSegments);
  }

  return deleteElementOfArrayTemplate(env, pathSegments);
};

const deleteEntity = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { queryStringParameters } = event;

  const query = {
    username,
  };
  const { update, options } = getQueryParams(
    environment,
    pathSegments,
    queryStringParameters,
  );

  console.log(update);
  console.log(options);

  const User = getUserModel();
  await User.updateOne(query, update, options);
  await mongoose.connection.close();
  callback(null, { statusCode: 200 });
};

module.exports = { deleteEntity };
