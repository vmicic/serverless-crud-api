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

const addToExistingEntity = (environment, pathSegments, entities) => {
  const ids = [];
  const filters = [];
  const pushObject = {};
  const entityId = 'entityId';
  let pushSelector = `environments.$[envId].entities.$[${entityId}]`;
  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      if (i + 1 !== pathSegments.length) {
        const identifier = `${segment}Id`;
        ids.push(identifier);
        pushSelector = `${pushSelector}.${segment}.$[${identifier}]`;
      } else {
        pushSelector = `${pushSelector}.${segment}`;
      }
    } else {
      const filter = {};
      const filterSelector = `${ids.slice(-1).pop()}._id`;
      filter[filterSelector] = mongoose.Types.ObjectId(segment);
      filters.push(filter);
    }
  });

  pushObject[pushSelector] = { $each: entities };

  const update = {
    $push: pushObject,
  };

  const firstFilter = {};
  const firstFilterSelector = `${entityId}.${pathSegments[0]}`;
  firstFilter[firstFilterSelector] = { $exists: true };

  const options = {
    arrayFilters: [{ 'envId.name': environment }, firstFilter].concat(filters),
    useFindAndModify: false,
  };

  return { update, options };
};

const getQueryParams = (environment, pathSegments, entities) => {
  if (pathSegments.length % 2 === 1) {
    return addToExistingEntity(environment, pathSegments, entities);
  }

  // console.log('Adding field');
  // return addFieldToEntity(environment, pathSegments, entities);
};

const extendEntity = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const entities = JSON.parse(event.body);

  addIdForObjects(entities);

  const query = {
    username,
  };

  const { update, options } = getQueryParams(
    environment,
    pathSegments,
    entities,
  );

  const User = getUserModel();
  await User.findOneAndUpdate(query, update, options).exec();

  await mongoose.connection.close();
  callback(null, { statusCode: 201 });
};

module.exports = {
  extendEntity,
};
