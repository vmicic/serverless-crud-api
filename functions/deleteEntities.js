const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
const { getSelectorAndFilters, idsInvalid } = require('./extendEntities');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

const getFirstFilter = (env) => {
  const filter = {};
  const filterSelector = `envId.${env}`;
  filter[filterSelector] = { $exists: true };
  return filter;
};

const deleteFieldQuery = (env, pathSegments) => {
  const { selector, filters } = getSelectorAndFilters(pathSegments, env);

  const unset = {};
  unset[selector] = '';

  const update = { $unset: unset };
  const options = { arrayFilters: filters };

  return { update, options };
};

const deleteNestedFieldWithQueryParamsQuery = (
  env,
  pathSegments,
  queryParams,
) => {
  const { selector, filters } = getSelectorAndFilters(pathSegments, env);

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
  const options = { arrayFilters: filters };

  return { update, options };
};

const deleteEntityQuery = (env, entity) => {
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

const deleteEntityWithQueryParamsQuery = (env, entity, queryParams) => {
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

const deleteElementOfArrayQuery = (env, pathSegments) => {
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
      return deleteEntityWithQueryParamsQuery(
        env,
        pathSegments[0],
        queryParams,
      );
    }
    return deleteEntityQuery(env, pathSegments[0]);
  }

  if (pathSegments.length % 2 === 1) {
    if (queryParams !== null) {
      return deleteNestedFieldWithQueryParamsQuery(
        env,
        pathSegments,
        queryParams,
      );
    }
    return deleteFieldQuery(env, pathSegments);
  }

  return deleteElementOfArrayQuery(env, pathSegments);
};

const deleteEntity = async (event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { queryStringParameters } = event;

  if (idsInvalid(pathSegments)) {
    return errorResponse(
      400,
      { 'Content-type': 'text/plain' },
      'Id in path is invalid.',
    );
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = {
    username,
  };
  const { update, options } = getQueryParams(
    environment,
    pathSegments,
    queryStringParameters,
  );

  const User = getUserModel();
  try {
    await User.updateOne(query, update, options);
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, { 'Content-type': 'text/plain' }, 'Bad request');
  }
  await mongoose.connection.close();

  return successResponse(204, { 'Content-type': 'text/plain' });
};

module.exports = {
  deleteEntity,
  getFirstFilter,
  deleteEntityQuery,
  deleteEntityWithQueryParamsQuery,
  deleteFieldQuery,
  deleteNestedFieldWithQueryParamsQuery,
  deleteElementOfArrayQuery,
  idsInvalid,
};
