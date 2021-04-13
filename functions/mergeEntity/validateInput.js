const { validateIds } = require('../getEntity/validateInput');
const { parseJson } = require('../createEntity/validateInput');
const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');
const { BadRequestError } = require('../../errors/BadRequestError');

const validateBody = (body) => {
  if (Array.isArray(body)) {
    throw new BadRequestError(400, 'Expected object got array in body.');
  }
  if (!(typeof body === 'object' && body !== null)) {
    throw new BadRequestError(400, 'Expected object in body.');
  }
};

const validatePath = (path) => {
  const pathSegments = getSegmentsWithoutUsernameAndEnv(path);

  if (pathSegments.length % 2 !== 0) {
    throw new BadRequestError(400, 'Invalid path.');
  }
};

const validateInput = (event) => {
  validateIds(event.path);
  validatePath(event.path);
  const body = parseJson(event.body);
  validateBody(body);
};

module.exports = { validateInput, validateBody };
