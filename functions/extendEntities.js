const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */
const addIdForObjects = (array) => {
  if (Array.isArray(array)) {
    array.forEach((element) => {
      if (typeof element === 'object' && element !== null) {
        element._id = mongoose.Types.ObjectId();
        addIdForArrayInField(element);
      }
    });
  }
};

const addIdForArrayInField = (object) => {
  Object.keys(object).forEach((field) => {
    if (Array.isArray(object[field])) {
      addIdForObjects(object[field]);
    }
  });
};

const getFirstFilter = (env) => {
  const filter = {};
  const filterSelector = `envId.${env}`;
  filter[filterSelector] = { $exists: true };
  return filter;
};

const getSelectorAndFilters = (pathSegments, env) => {
  const filters = [];
  filters.push(getFirstFilter(env));

  let selector = `environments.$[envId].${env}`;
  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      selector = `${selector}.${segment}`;
    }

    if (i % 2 === 1) {
      const filter = {};
      const filterSelector = `${pathSegments[i - 1]}Id._id`;
      filter[filterSelector] = mongoose.Types.ObjectId(segment);
      filters.push(filter);

      selector = `${selector}.$[${pathSegments[i - 1]}Id]`;
    }
  });

  return { selector, filters };
};

const addToExistingEntityQuery = (env, pathSegments, entities) => {
  const { selector, filters } = getSelectorAndFilters(pathSegments, env);

  const push = {};
  push[selector] = { $each: entities };

  const update = { $push: push };
  const options = { arrayFilters: filters };
  return { update, options };
};

const replaceEntityQuery = (env, pathSegments, bodyPayload) => {
  const { selector, filters } = getSelectorAndFilters(pathSegments, env);

  const set = {};
  set[selector] = bodyPayload;

  const update = { $set: set };
  const options = { arrayFilters: filters };
  return { update, options };
};

const getQueryParams = (env, pathSegments, bodyPayload) => {
  if (pathSegments.length % 2 === 1) {
    return addToExistingEntityQuery(env, pathSegments, bodyPayload);
  }

  return replaceEntityQuery(env, pathSegments, bodyPayload);
};

const idsInvalid = (pathSegments) => {
  try {
    pathSegments.forEach((segment, i) => {
      if (i % 2 === 1) {
        mongoose.Types.ObjectId(segment);
      }
    });
  } catch (error) {
    return true;
  }
  return false;
};

const extendEntity = async (event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);

  if (idsInvalid(pathSegments)) {
    return errorResponse(
      400,
      { 'Content-type': 'text/plain' },
      'Id in path is invalid.',
    );
  }

  let bodyPayload;
  try {
    bodyPayload = JSON.parse(event.body);
  } catch (error) {
    return errorResponse(
      400,
      { 'Content-type': 'text/plain' },
      'Invalid body.',
    );
  }
  if (pathSegments.length % 2 === 1) {
    if (!Array.isArray(bodyPayload)) {
      return errorResponse(
        400,
        { 'Content-type': 'text/plain' },
        'Invalid body.',
      );
    }
    addIdForObjects(bodyPayload);
  } else {
    if (Array.isArray(bodyPayload)) {
      return errorResponse(
        400,
        { 'Content-type': 'text/plain' },
        'Invalid body.',
      );
    }
    if (!(typeof bodyPayload === 'object' && bodyPayload !== null)) {
      return errorResponse(
        400,
        { 'Content-type': 'text/plain' },
        'Invalid body.',
      );
    }
    bodyPayload._id = mongoose.Types.ObjectId(pathSegments.slice(-1).pop());
    addIdForArrayInField(bodyPayload);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = {
    username,
  };

  if (pathSegments.length === 1) {
    const entitySelector = `environments.${environment}.${pathSegments[0]}`;
    query[entitySelector] = { $exists: true };
  }

  const { update, options } = getQueryParams(
    environment,
    pathSegments,
    bodyPayload,
  );

  const User = getUserModel();
  try {
    await User.updateOne(query, update, options);
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, { 'Content-type': 'text/plain' }, 'Bad request.');
  }

  await mongoose.connection.close();
  return successResponse(204, { 'Content-type': 'text/plain' });
};

module.exports = {
  extendEntity,
  getSelectorAndFilters,
  addIdForObjects,
  addIdForArrayInField,
  replaceEntityQuery,
  addToExistingEntityQuery,
  idsInvalid,
};
