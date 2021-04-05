const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../../models/user.js');
const { successResponse, errorResponse } = require('../../util/responseUtil');
const { BadRequestError } = require('../../errors/BadRequestError.js');
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

const validateType = (value, fieldTypeInSchema) => {
  const receivedType = typeof value;

  if (receivedType === 'object') {
    if (fieldTypeInSchema === 'array') {
      if (!Array.isArray(value)) {
        throw new BadRequestError(417, 'Expected array got object.');
      }
    } else if (fieldTypeInSchema !== 'object') {
      throw new BadRequestError(
        417,
        `Expected ${fieldTypeInSchema} got object.`,
      );
    }

    return true;
  }

  if (receivedType !== fieldTypeInSchema) {
    throw new BadRequestError(
      417,
      `Expected ${fieldTypeInSchema} got ${receivedType}.`,
    );
  }

  return true;
};

const validateFieldExistsInSchema = (field, entity) => {
  if (!(field in entity)) {
    throw new BadRequestError(417, `Entity does not containe ${field} field.`);
  }
};

const getEntityName = (body) => {
  if (Object.keys(body).length === 1) {
    return Object.keys(body)[0];
  }

  return Object.keys(body).find((key) => key !== '__meta');
};

const validateEntityWithSchema = (entities, schema) => {
  entities.forEach((entity) => {
    if (Object.keys(entity).length !== Object.keys(schema).length) {
      throw new BadRequestError(
        417,
        'Number of fields in entity is not correct.',
      );
    }

    Object.entries(schema).forEach((schemaFieldNameType) => {
      const [fieldName, fieldType] = schemaFieldNameType;
      validateFieldExistsInSchema(fieldName, entity);

      if (typeof fieldType === 'object') {
        validateEntityWithSchema(entity[fieldName], fieldType);
      } else {
        validateType(entity[fieldName], fieldType);
      }
    });
  });
};

const createEntityInDb = async (body, event) => {
  const { username, environment } = event.pathParameters;
  const entityName = getEntityName(body);

  addIdForObjects(body[entityName]);
  const query = { username };
  const update = getUpdate(environment, entityName, body);
  const options = getOptions(environment);

  const User = getUserModel();
  return User.updateOne(query, update, options);
};

const getResponse = (result) => {
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

const createEntity = async (event) => {
  const body = JSON.parse(event.body);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { schemaExists, schema } = await getEntitySchema(event);
  if (schemaExists) {
    const entityName = getEntityName(body);
    validateEntityWithSchema(body[entityName], schema);
  }

  const result = await createEntityInDb(body, event);
  await mongoose.connection.close();

  return getResponse(result);
};

module.exports = { createEntity, addIdForObjects };
