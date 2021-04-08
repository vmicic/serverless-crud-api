const { BadRequestError } = require('../../errors/BadRequestError');

/* eslint-disable no-underscore-dangle */
const parseJson = (body) => {
  try {
    return JSON.parse(body);
  } catch (error) {
    error.message = 'Invalid body.';
    error.statusCode = 400;
    throw error;
  }
};

const validateBodyWithoutSchema = (body) => {
  if (!Array.isArray(Object.values(body)[0])) {
    const error = new Error(
      'Please provide entity with this structure { NAME: [{}, {}, {}] }',
    );
    error.statusCode = 400;
    throw error;
  }
};

const validateBodyWithSchema = (body) => {
  if (!('__meta' in body)) {
    throw new BadRequestError(400, 'Invalid body.');
  }

  if (Object.keys(body.__meta).length !== 1) {
    throw new BadRequestError(400, 'Properties in __meta are invalid.');
  }

  if (
    // eslint-disable-next-line operator-linebreak
    !('type' in body.__meta && body.__meta.type) &&
    !('force' in body.__meta && body.__meta.force)
  ) {
    throw new BadRequestError(400, 'Property __meta is invalid.');
  }
};

const validateProperties = (body) => {
  if (Object.keys(body).length !== 1 && Object.keys(body).length !== 2) {
    throw new BadRequestError(400, 'Invalid body.');
  }

  if (Object.keys(body).length === 1) {
    validateBodyWithoutSchema(body);
  }

  if (Object.keys(body).length === 2) {
    validateBodyWithSchema(body);
  }
};

const validateInput = (event) => {
  const body = parseJson(event.body);
  validateProperties(body);
};

module.exports = {
  validateInput,
  validateProperties,
  validateBodyWithSchema,
  validateBodyWithoutSchema,
  parseJson,
};
