const { validateIds } = require('../getEntity/validateInput');
const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');
const { BadRequestError } = require('../../errors/BadRequestError');

const parseJson = (body) => {
  try {
    return JSON.parse(body);
  } catch (error) {
    error.message = 'Invalid body.';
    error.statusCode = 400;
    throw error;
  }
};

const validateBody = (body, path) => {
  const pathSegments = getSegmentsWithoutUsernameAndEnv(path);
  if (pathSegments.length % 2 === 1) {
    if (!Array.isArray(body)) {
      throw new BadRequestError(400, 'Invalid body.');
    }
  } else {
    if (Array.isArray(body)) {
      throw new BadRequestError(400, 'Invalid body.');
    }
    if (!(typeof body === 'object' && body !== null)) {
      throw new BadRequestError(400, 'Invalid body.');
    }
  }
};

const validateInput = (event) => {
  const body = parseJson(event.body);
  validateBody(body, event.path);
  validateIds(event.path);
};

module.exports = { validateInput };
