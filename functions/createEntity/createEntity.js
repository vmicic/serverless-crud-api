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
  let expectedType = fieldTypeInSchema;

  const lastCharInFieldType = fieldTypeInSchema.slice(-1);
  if (lastCharInFieldType === '?') {
    expectedType = fieldTypeInSchema.slice(0, -1);
  }

  if (receivedType === 'object') {
    if (expectedType === 'array') {
      if (!Array.isArray(value)) {
        throw new BadRequestError(417, 'Expected array got object.');
      }
    } else {
      throw new BadRequestError(417, `Expected ${expectedType} got object.`);
    }

    return true;
  }

  if (receivedType !== expectedType) {
    throw new BadRequestError(
      417,
      `Expected ${expectedType} got ${receivedType}.`,
    );
  }

  return true;
};

const validateFieldExistsInSchema = (field, entity) => {
  if (!(field in entity)) {
    throw new BadRequestError(417, `Entity does not contain ${field} field.`);
  }
};

const ifFieldExists = (schemaFieldNameType, entity) => {
  const [fieldName, fieldType] = schemaFieldNameType;
  // if field is not sub-entity
  if (typeof fieldType !== 'object') {
    const lastCharInFieldType = fieldType.slice(-1);
    if (lastCharInFieldType === '?') {
      return fieldName in entity;
    }

    if (fieldName in entity) {
      return true;
    }

    throw new BadRequestError(
      417,
      `Entity does not contain ${fieldName} field.`,
    );
  }

  // if field is sub-entity just verify that it exists
  validateFieldExistsInSchema(fieldName, entity);

  return true;
};

const validateEntityWithSchema = (entities, schema) => {
  entities.forEach((entity) => {
    let expectedNumberOfProperties = 0;
    Object.entries(schema).forEach((schemaFieldNameType) => {
      const [fieldName, fieldType] = schemaFieldNameType;

      const fieldExists = ifFieldExists(schemaFieldNameType, entity);
      expectedNumberOfProperties = fieldExists
        ? expectedNumberOfProperties + 1
        : expectedNumberOfProperties;

      if (typeof fieldType === 'object') {
        validateEntityWithSchema(entity[fieldName], fieldType);
      } else if (fieldExists) {
        validateType(entity[fieldName], fieldType);
      }
    });

    const numberOfUniqueProperties = new Set(Object.keys(entity)).size;
    if (numberOfUniqueProperties !== expectedNumberOfProperties) {
      throw new BadRequestError(
        417,
        'Number of fields in entity is not correct.',
      );
    }
  });
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
    validateEntityWithSchema(body[entityName], schema);
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
  validateFieldExistsInSchema,
  validateType,
  validateEntityWithSchema,
  createEntityInDb,
};
