/* eslint-disable operator-linebreak */
/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../../models/user.js');
const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');
const { validateInput } = require('./validateInput');
const {
  successResponse,
  errorResponse,
  errorResponseFromError,
} = require('../../util/responseUtil');
const { getSelectorAndFilters } = require('../extendEntity/extendEntity');
const { addIdForObjects } = require('../createEntity/createEntity');
const {
  validateEntitiesWithSchema,
} = require('../createEntity/schemaValidation');
const { getEntitySchema } = require('../extendEntity/extendEntity');
const { getEntity } = require('../getEntity/getEntity');
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

const mergeEntityInDb = async (event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const entity = JSON.parse(event.body);

  addId(entity);

  const query = { username };
  const { update, options } = getQueryParams(environment, pathSegments, entity);

  const User = getUserModel();
  return User.updateOne(query, update, options);
};

const mergeObjects = (oldEntity, newEntity) => {
  const mergedEntity = { ...oldEntity };

  Object.entries(newEntity).forEach((entry) => {
    const [key, value] = entry;
    mergedEntity[key] = value;
  });

  return mergedEntity;
};

const mergeEntity = async (event) => {
  validateInput(event);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  if (
    'headers' in event &&
    'force' in event.headers &&
    event.headers.force === true
  ) {
    await mergeEntityInDb(event);
    await mongoose.connection.close();
    return successResponse(204, {
      'Content-type': 'text/plain',
    });
  }

  const entity = JSON.parse(event.body);
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);

  const { schemaExists, schema } = await getEntitySchema(event);
  if (schemaExists) {
    const response = await getEntity(event);
    const oldEntity = _.get(
      JSON.parse(response.body),
      `${pathSegments[pathSegments.length - 2]}[0]`,
    );
    delete oldEntity._id;
    delete oldEntity.__embedded;
    const mergedEntity = mergeObjects(oldEntity, entity);
    validateEntitiesWithSchema([mergedEntity], schema);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  await mergeEntityInDb(event);
  await mongoose.connection.close();
  return successResponse(204, {
    'Content-type': 'text/plain',
  });
};

const mergeEntityWrapper = async (event) => {
  try {
    return await mergeEntity(event);
  } catch (error) {
    await mongoose.connection.close();
    if (error.statusCode !== undefined) {
      return errorResponseFromError(error);
    }
    return errorResponse(
      500,
      { 'Content-type': 'text/plain' },
      'Unexpected error happened. Please try again.',
    );
  }
};

module.exports = {
  mergeEntityWrapper,
  mergeEntity,
  getQueryParams,
  addId,
};
