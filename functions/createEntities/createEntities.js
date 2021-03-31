const mongoose = require('mongoose');
const { getUserModel } = require('../../models/user.js');
const { validateInput } = require('./inputValidation');
const { createEntitySchema } = require('./createEntitySchema');
const {
  successResponse,
  errorResponse,
  errorResponseFromError,
} = require('../../util/responseUtil');
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

const createEntityOrEntitySchema = async (event) => {
  try {
    validateInput(event);
  } catch (error) {
    return errorResponseFromError(error);
  }
  const body = JSON.parse(event.body);

  if ('__meta' in body) {
    return createEntitySchema(event);
  }

  const { username, environment } = event.pathParameters;

  const entityName = Object.keys(body)[0];
  addIdForObjects(body[entityName]);

  const query = { username };
  const update = getUpdate(environment, entityName, body);
  const options = getOptions(environment);

  console.log(update);
  console.log(options);

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
    return errorResponse(
      400,
      {
        'Content-type': 'text/plain',
      },
      'Please try again.',
    );
  }
  await mongoose.connection.close();
  if (result.nModified === 0) {
    return errorResponse(
      404,
      {
        'Content-type': 'text/plain',
      },
      'Unable to create requested entity.',
    );
  }

  return successResponse(201, {
    'Content-type': 'text/plain',
  });
};

module.exports = {
  createEntityOrEntitySchema,
  addIdForObjects,
};
