const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../../models/user.js');
const { successResponse, errorResponse } = require('../../util/responseUtil');
const { validateEntitiesWithSchema } = require('./schemaValidation');
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

const getEntitySchema = async (event) => {
  const body = JSON.parse(event.body);
  const { username, environment } = event.pathParameters;
  const entityName = Object.keys(body)[0];

  const query = {
    username,
  };

  const entityPath = `entitySchemas.${environment}.${entityName}`;
  query[entityPath] = { $exists: true };

  const User = getUserModel();
  const document = await User.findOne(query);

  if (document !== null) {
    const schema = _.get(document, entityPath);
    return { schemaExists: true, schema };
  }

  return { schemaExists: false };
};

const createEntityInDb = async (body, event) => {
  const { username, environment } = event.pathParameters;
  const entityName = Object.keys(body).find((key) => key !== '__meta');

  addIdForObjects(body[entityName]);
  const query = { username };
  const update = getUpdate(environment, entityName, body);
  const options = getOptions(environment);

  const User = getUserModel();
  return User.updateOne(query, update, options);
};

const getResponse = (result) => {
  if (result.n === 0) {
    return errorResponse(
      404,
      {
        'Content-type': 'text/plain',
      },
      'Username not found.',
    );
  }
  if (result.nModified === 0) {
    return errorResponse(
      404,
      {
        'Content-type': 'text/plain',
      },
      'Environment not found.',
    );
  }

  return successResponse(201, {
    'Content-type': 'text/plain',
  });
};

const createEntity = async (event) => {
  const body = JSON.parse(event.body);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // if we are forcing creation of entity without schema check
  if ('__meta' in body && 'force' in body.__meta && body.__meta.force) {
    const result = await createEntityInDb(body, event);
    await mongoose.connection.close();
    return getResponse(result);
  }

  const { schemaExists, schema } = await getEntitySchema(event);
  if (schemaExists) {
    const entityName = Object.keys(body).find((key) => key !== '__meta');
    validateEntitiesWithSchema(body[entityName], schema);
  }

  const result = await createEntityInDb(body, event);
  await mongoose.connection.close();
  return getResponse(result);
};

module.exports = {
  createEntity,
  addIdForObjects,
  getUpdate,
  getOptions,
  getEntitySchema,
  createEntityInDb,
};
