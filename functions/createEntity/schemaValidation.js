const { BadRequestError } = require('../../errors/BadRequestError.js');

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

module.exports = {
  validateFieldExistsInEntity,
  validateType,
  validateEntitiesWithSchema,
  validateNumberOfFields,
  ifFieldExistsInEntity,
  validateEntityAndGetNumberOfFields,
};
