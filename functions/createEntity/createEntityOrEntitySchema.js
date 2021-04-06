const mongoose = require('mongoose');
const { validateInput } = require('./inputValidation');
const { createEntitySchema } = require('./createEntitySchema');
const {
  errorResponseFromError,
  errorResponse,
} = require('../../util/responseUtil');
const { createEntity } = require('./createEntity');
require('dotenv').config();

const createEntityOrEntitySchema = async (event) => {
  validateInput(event);
  const body = JSON.parse(event.body);

  if ('__meta' in body) {
    // eslint-disable-next-line no-underscore-dangle
    if ('type' in body.__meta && body.__meta.type) {
      return createEntitySchema(event);
    }
  }

  return createEntity(event);
};

const createEntityOrEntitySchemaWrapper = async (event) => {
  try {
    return await createEntityOrEntitySchema(event);
  } catch (error) {
    await mongoose.connection.close();
    if (error.statusCode !== undefined) {
      return errorResponseFromError(error);
    }
    return errorResponse(
      500,
      { 'Content-type': 'text/plain' },
      'Unexpected error happened. Please try again.',
    );
  }
};

module.exports = {
  createEntityOrEntitySchema,
  createEntityOrEntitySchemaWrapper,
};
