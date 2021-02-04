const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
const { getSelectorAndFilters } = require('./extendEntities');

const getFirstFilter = (env) => {
  const filter = {};
  const filterSelector = `envId.${env}`;
  filter[filterSelector] = { $exists: true };
  return filter;
};

const deleteFieldTemplate = (env, pathSegments) => {
  let arrayFilters = [getFirstFilter(env)];

  const { selector, filters } = getSelectorAndFilters(
    pathSegments,
    `environments.$[envId].${env}`,
  );
  arrayFilters = arrayFilters.concat(filters);

  const unset = {};
  unset[selector] = '';

  const update = { $unset: unset };
  const options = { arrayFilters };

  return { update, options };
};

const deleteNestedFieldQueryParams = (env, pathSegments, queryParams) => {
  let arrayFilters = [getFirstFilter(env)];

  const { selector, filters } = getSelectorAndFilters(
    pathSegments,
    `environments.$[envId].${env}`,
  );
  arrayFilters = arrayFilters.concat(filters);

  const pull = {};
  pull[selector] = {};

  Object.entries(queryParams).forEach((entry) => {
    const [key, value] = entry;
    if (+value) {
      pull[selector][key] = +value;
    } else {
      pull[selector][key] = value;
    }
  });

  const update = { $pull: pull };
  const options = { arrayFilters };

  return { update, options };
};

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

const deleteEntityWithSearchParams = (env, entity, queryParams) => {
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

  const filter = getFirstFilter(env);
  const arrayFilters = [filter];
  const options = { arrayFilters };

  return { update, options };
};

const deleteElementOfArrayTemplate = (env, pathSegments) => {
  const pull = {};
  let pullSelector = `environments.$[envId].${env}`;

  const firstFilter = getFirstFilter(env);
  const arrayFilters = [firstFilter];

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      pullSelector = `${pullSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      if (i + 1 === pathSegments.length) {
        pull[pullSelector] = { _id: id };
      } else {
        const filter = {};
        const idSelector = `${pathSegments[i - 1]}Id._id`;
        pullSelector = `${pullSelector}.$[${pathSegments[i - 1]}Id]`;
        filter[idSelector] = id;
        arrayFilters.push(filter);
      }
    }
  });

  const update = { $pull: pull };
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
      return deleteNestedFieldQueryParams(env, pathSegments, queryParams);
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
