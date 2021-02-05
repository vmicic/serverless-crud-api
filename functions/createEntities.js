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

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = {
    username,
  };

  const setObject = {};
  // eslint-disable-next-line operator-linebreak
  setObject[`environments.$[envId].${environment}.${entityName}`] =
    entity[entityName];
  const update = { $set: setObject };

  const filter = {};
  filter[`envId.${environment}`] = { $exists: true };
  const arrayFilters = [];
  arrayFilters.push(filter);
  const options = {
    arrayFilters,
    useFindAndModify: false,
  };

  const User = getUserModel();
  const result = await User.updateOne(query, update, options).exec();
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
