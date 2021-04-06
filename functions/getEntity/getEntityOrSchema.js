const mongoose = require('mongoose');

const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');
const {
  errorResponse,
  errorResponseFromError,
} = require('../../util/responseUtil');

const { getEntity } = require('./getEntity');
const { getSchema } = require('./getEntitySchema');

const getEntityOrSchema = async (event) => {
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const lastSegment = pathSegments.slice(-1).pop();
  if (lastSegment === '__describe') {
    return getSchema(event);
  }

  return getEntity(event);
};

const getEntityOrSchemaWrapper = async (event) => {
  try {
    return await getEntityOrSchema(event);
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
  getEntityOrSchemaWrapper,
  getEntityOrSchema,
};
