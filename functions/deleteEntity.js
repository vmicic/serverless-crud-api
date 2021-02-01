const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');

const baseSelector = 'environments.$[envId].entities.$[entityId]';

const getFirstArrayFilters = (env, segment) => {
  const filterSelector = `entityId.${segment}`;
  const filter = {};
  filter[filterSelector] = { $exists: true };
  const arrayFilters = [{ 'envId.name': env }, filter];
  return arrayFilters;
};

const deleteFieldTemplate = (env, pathSegments) => {
  let unsetSelector = baseSelector;

  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);

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

const deleteNestedEntitySearchParams = (
  env,
  pathSegments,
  queryStringParameters,
) => {
  let pullSelector = baseSelector;

  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);

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

  Object.entries(queryStringParameters).forEach((entry) => {
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

const deleteEntityTemplate = (env, pathSegments) => {
  const entityCondition = {};
  entityCondition[pathSegments[0]] = { $exists: true };

  const update = {
    $pull: { 'environments.$[envId].entities': entityCondition },
  };

  const options = {
    arrayFilters: [{ 'envId.name': env }],
  };

  return { update, options };
};

const deleteEntityWithSearchParams = (
  env,
  pathSegments,
  queryStringParameters,
) => {
  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);
  const pullObject = {};
  const pullSelector = `${baseSelector}.${pathSegments[0]}`;
  pullObject[pullSelector] = {};

  Object.entries(queryStringParameters).forEach((entry) => {
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

const deleteElementOfArrayTemplate = (env, pathSegments) => {
  const pullObject = {};
  let pullSelector = baseSelector;

  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);

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

const getQueryParams = (env, pathSegments, queryStringParameters) => {
  if (pathSegments.length === 1) {
    if (queryStringParameters !== null) {
      return deleteEntityWithSearchParams(
        env,
        pathSegments,
        queryStringParameters,
      );
    }
    return deleteEntityTemplate(env, pathSegments);
  }

  if (pathSegments.length % 2 === 1) {
    if (queryStringParameters !== null) {
      return deleteNestedEntitySearchParams(
        env,
        pathSegments,
        queryStringParameters,
      );
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

  const User = getUserModel();
  await User.updateOne(query, update, options);
  await mongoose.connection.close();
  callback(null, { statusCode: 200 });
};

module.exports = { deleteEntity };
