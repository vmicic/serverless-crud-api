const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

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

const getUpdate = (env, entityName, entity) => {
  const set = {};
  set[`environments.$[envId].${env}.${entityName}`] = entity[entityName];
  return { $set: set };
};

const getOptions = (env) => {
  const filter = {};
  filter[`envId.${env}`] = { $exists: true };
  const arrayFilters = [];
  arrayFilters.push(filter);
  return { arrayFilters, useFindAndModify: false };
};

const createEntity = async (event) => {
  const { username, environment } = event.pathParameters;
  let entity;

  try {
    entity = JSON.parse(event.body);
  } catch (error) {
    return errorResponse(400, 'Invalid body.');
  }
  if (Object.keys(entity).length !== 1) {
    return errorResponse(400, 'Invalid body.');
  }

  const entityName = Object.keys(entity)[0];
  addIdForObjects(entity[entityName]);

  const query = { username };
  const update = getUpdate(environment, entityName, entity);
  const options = getOptions(environment);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const User = getUserModel();
  let result;
  try {
    result = await User.updateOne(query, update, options);
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }
  await mongoose.connection.close();
  if (result.nModified === 0) {
    return errorResponse(404, 'Unable to create requested entity.');
  }

  return successResponse(201);
};

module.exports = {
  createEntity,
  addIdForObjects,
};
