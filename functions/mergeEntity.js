const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
const { idsInvalid } = require('./deleteEntities');
const { successResponse, errorResponse } = require('../util/responseUtil');
const { getSelectorAndFilters } = require('./extendEntities');
const { addIdForObjects } = require('./createEntity/createEntity');
require('dotenv').config();

const getQueryParams = (env, pathSegments, entity) => {
  const { selector, filters } = getSelectorAndFilters(pathSegments, env);

  const set = {};
  Object.entries(entity).forEach((entry) => {
    const [field, value] = entry;
    const fieldSelector = `${selector}.${field}`;
    if (+value) {
      set[fieldSelector] = +value;
    } else {
      set[fieldSelector] = value;
    }
  });

  const update = { $set: set };
  const options = { arrayFilters: filters };
  return { update, options };
};

const addId = (entity) => {
  if (typeof entity === 'object' && entity !== null) {
    Object.keys(entity).forEach((field) => {
      if (Array.isArray(entity[field])) {
        addIdForObjects(entity[field]);
      }
    });
  }
};

const mergeEntity = async (event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);

  if (pathSegments.length % 2 !== 0) {
    return errorResponse(
      400,
      { 'Content-type': 'text/plain' },
      'Invalid path.',
    );
  }

  if (idsInvalid(pathSegments)) {
    return errorResponse(
      400,
      { 'Content-type': 'text/plain' },
      'Id in path is invalid.',
    );
  }

  let entity;
  try {
    entity = JSON.parse(event.body);
  } catch (error) {
    return errorResponse(
      400,
      { 'Content-type': 'text/plain' },
      'Invalid body.',
    );
  }

  addId(entity);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = { username };
  const { update, options } = getQueryParams(environment, pathSegments, entity);

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

module.exports = { mergeEntity, getQueryParams, addId };
