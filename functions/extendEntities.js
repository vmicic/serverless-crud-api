const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');

/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const addIdForObjects = (array) => {
  if (Array.isArray(array)) {
    array.forEach((element) => {
      if (typeof element === 'object' && element !== null) {
        element._id = mongoose.Types.ObjectId();
        Object.keys(element).forEach((field) => {
          if (Array.isArray(element[field])) {
            addIdForObjects(element[field]);
          }
        });
      }
    });
  }
};

const getFirstFilter = (env) => {
  const filter = {};
  const filterSelector = `envId.${env}`;
  filter[filterSelector] = { $exists: true };
  return filter;
};

const getSelectorAndFilters = (pathSegments, startSelector) => {
  const filters = [];
  let selector = startSelector;

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

const addToExistingEntity = (env, pathSegments, entities) => {
  let arrayFilters = [getFirstFilter(env)];

  const { selector, filters } = getSelectorAndFilters(
    pathSegments,
    `environments.$[envId].${env}`,
  );

  arrayFilters = arrayFilters.concat(filters);

  const push = {};
  push[selector] = { $each: entities };

  const update = { $push: push };
  const options = { arrayFilters, useFindAndModify: false };
  return { update, options };
};

const replaceEntity = (env, pathSegments, bodyPayload) => {
  let arrayFilters = [getFirstFilter(env)];

  const { selector, filters } = getSelectorAndFilters(
    pathSegments,
    `environments.$[envId].${env}`,
  );
  arrayFilters = arrayFilters.concat(filters);

  const set = {};
  set[selector] = bodyPayload;

  const update = { $set: set };
  const options = { arrayFilters, useFindAndModify: false };
  return { update, options };
};

const getQueryParams = (environment, pathSegments, bodyPayload) => {
  if (pathSegments.length % 2 === 1) {
    return addToExistingEntity(environment, pathSegments, bodyPayload);
  }

  return replaceEntity(environment, pathSegments, bodyPayload);
};

const extendEntity = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const bodyPayload = JSON.parse(event.body);

  if (pathSegments.length % 2 === 1) {
    addIdForObjects(bodyPayload);
  } else {
    console.log(bodyPayload);
    bodyPayload._id = mongoose.Types.ObjectId();
    console.log('Added if for one object');
  }

  addIdForObjects(bodyPayload);

  const query = {
    username,
  };

  const { update, options } = getQueryParams(
    environment,
    pathSegments,
    bodyPayload,
  );

  const User = getUserModel();
  await User.findOneAndUpdate(query, update, options).exec();

  await mongoose.connection.close();
  callback(null, { statusCode: 201 });
};

module.exports = {
  extendEntity,
  getSelectorAndFilters,
};
