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
    throw new BadRequestError(
      400,
      'Please provide entity with this structure { NAME: [{}, {}, {}] }',
    );
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
    !('type' in body.__meta && body.__meta.type === true) &&
    !('force' in body.__meta && body.__meta.force === true)
  ) {
    throw new BadRequestError(400, 'Property __meta is invalid.');
  }

  if ('force' in body.__meta && body.__meta.force === true) {
    const entityName = Object.keys(body).find((key) => key !== '__meta');
    if (!Array.isArray(body[entityName])) {
      throw new BadRequestError(
        400,
        'Please provide entity with this structure { NAME: [{}, {}, {}] }',
      );
    }
  }

  if ('type' in body.__meta && body.__meta.type === true) {
    const entityName = Object.keys(body).find((key) => key !== '__meta');

    if (Array.isArray(body[entityName])) {
      throw new BadRequestError(400, 'Please provide object as schema.');
    }

    if (!(typeof body[entityName] === 'object' && body[entityName] !== null)) {
      throw new BadRequestError(400, 'Please provide object as schema.');
    }
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
