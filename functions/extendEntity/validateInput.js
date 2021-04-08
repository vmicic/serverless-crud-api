const { validateIds } = require('../getEntity/validateInput');
const { parseJson } = require('../createEntity/validateInput');
const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');
const { BadRequestError } = require('../../errors/BadRequestError');

const validateBody = (body, path) => {
  const pathSegments = getSegmentsWithoutUsernameAndEnv(path);
  if (pathSegments.length % 2 === 1) {
    if (!Array.isArray(body)) {
      throw new BadRequestError(400, 'Expected array in body.');
    }
  } else {
    if (Array.isArray(body)) {
      throw new BadRequestError(400, 'Expected object got array in body.');
    }
    if (!(typeof body === 'object' && body !== null)) {
      throw new BadRequestError(400, 'Expected object in body.');
    }
  }
};

const validateInput = (event) => {
  validateIds(event.path);
  const body = parseJson(event.body);
  validateBody(body, event.path);
};

module.exports = { validateInput, validateBody };
