/* eslint-disable operator-linebreak */
const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../../models/user.js');
const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');
const {
  successResponse,
  errorResponse,
  errorResponseFromError,
} = require('../../util/responseUtil');
const { validateInput } = require('./validateInput.js');
const {
  validateEntitiesWithSchema,
} = require('../createEntity/schemaValidation');
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

const addIds = (body, pathSegments) => {
  if (pathSegments.length % 2 === 1) {
    addIdForObjects(body);
  } else {
    body._id = mongoose.Types.ObjectId(pathSegments.slice(-1).pop());
    addIdForArrayInField(body);
  }
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

const getEntitySchema = async (event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);

  let entitiesStructure = [];
  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      entitiesStructure = [...entitiesStructure, segment];
    }
  });

  const query = {
    username,
  };

  const entityPath = `entitySchemas.${environment}.${entitiesStructure.join(
    '.',
  )}`;
  query[entityPath] = { $exists: true };

  const User = getUserModel();
  const document = await User.findOne(query);

  if (document !== null) {
    const schema = _.get(document, entityPath);
    return { schemaExists: true, schema };
  }

  return { schemaExists: false };
};

const getResponse = (result) => {
  if (result.n === 0) {
    return errorResponse(
      404,
      {
        'Content-type': 'text/plain',
      },
      'Username or environment not found.',
    );
  }

  return successResponse(204, {
    'Content-type': 'text/plain',
  });
};

const extendEntityInDb = async (body, event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);

  addIds(body, pathSegments);

  const query = { username };
  if (pathSegments.length === 1) {
    const entitySelector = `environments.${environment}.${pathSegments[0]}`;
    query[entitySelector] = { $exists: true };
  }
  const { update, options } = getQueryParams(environment, pathSegments, body);

  const User = getUserModel();
  return User.updateOne(query, update, options);
};

const extendEntity = async (event) => {
  validateInput(event);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const body = JSON.parse(event.body);
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);

  if (
    'headers' in event &&
    'force' in event.headers &&
    event.headers.force === 'true'
  ) {
    const result = await extendEntityInDb(body, event);
    await mongoose.connection.close();
    return getResponse(result);
  }

  const { schemaExists, schema } = await getEntitySchema(event);
  if (schemaExists) {
    if (pathSegments.length % 2 === 0) {
      validateEntitiesWithSchema([body], schema);
    } else {
      validateEntitiesWithSchema(body, schema);
    }
  }

  const result = await extendEntityInDb(body, event);
  await mongoose.connection.close();
  return getResponse(result);
};

const extendEntityWrapper = async (event) => {
  try {
    return await extendEntity(event);
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
  extendEntity,
  getSelectorAndFilters,
  addIdForObjects,
  addIdForArrayInField,
  addIds,
  replaceEntityQuery,
  addToExistingEntityQuery,
  idsInvalid,
  extendEntityWrapper,
  getEntitySchema,
};
