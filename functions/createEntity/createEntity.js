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
    } else if (Array.isArray(value)) {
      throw new BadRequestError(417, `Expected ${expectedType} got array.`);
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

const validateFieldExistsInEntity = (field, entity) => {
  if (!(field in entity)) {
    throw new BadRequestError(417, `Entity does not contain ${field} field.`);
  }
};

const ifFieldExistsInEntity = (schemaFieldNameType, entity) => {
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
  validateFieldExistsInEntity(fieldName, entity);

  return true;
};

const validateNumberOfFields = (entity, expectedFieldsCount) => {
  const uniqueFieldsCount = new Set(Object.keys(entity)).size;
  if (uniqueFieldsCount !== expectedFieldsCount) {
    throw new BadRequestError(
      417,
      'Entity contains fields not existing in schema.',
    );
  }
};

const validateEntitiesWithSchema = (entities, schema) => {
  entities.forEach((entity) => {
    // eslint-disable-next-line no-use-before-define
    const fieldsCount = validateEntityAndGetNumberOfFields(entity, schema);
    validateNumberOfFields(entity, fieldsCount);
  });
};

const validateEntityAndGetNumberOfFields = (entity, schema) => {
  let fieldsCount = 0;
  Object.entries(schema).forEach((schemaFieldNameType) => {
    const [fieldName, fieldType] = schemaFieldNameType;

    const fieldExists = ifFieldExistsInEntity(schemaFieldNameType, entity);
    fieldsCount = fieldExists ? fieldsCount + 1 : fieldsCount;

    // if field is sub-entity
    if (typeof fieldType === 'object') {
      validateEntitiesWithSchema(entity[fieldName], fieldType);
    } else if (fieldExists) {
      validateType(entity[fieldName], fieldType);
    }
  });

  return fieldsCount;
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
  validateFieldExistsInEntity,
  validateType,
  validateEntitiesWithSchema,
  validateNumberOfFields,
  createEntityInDb,
  ifFieldExistsInEntity,
  validateEntityAndGetNumberOfFields,
};
