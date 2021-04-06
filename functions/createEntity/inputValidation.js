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
    const error = new Error('Invalid body.');
    error.statusCode = 400;
    throw error;
  }

  if (Object.keys(body.__meta).length !== 1) {
    const error = new Error('Properties in __meta are invalid.');
    error.statusCode = 400;
    throw error;
  }

  if (
    // eslint-disable-next-line operator-linebreak
    !('type' in body.__meta && body.__meta.type) &&
    !('force' in body.__meta && body.__meta.force)
  ) {
    const error = new Error('Property __meta is invalid.');
    error.statusCode = 400;
    throw error;
  }
};

const validateProperties = (body) => {
  if (Object.keys(body).length !== 1 && Object.keys(body).length !== 2) {
    const error = new Error('Invalid body.');
    error.statusCode = 400;
    throw error;
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
