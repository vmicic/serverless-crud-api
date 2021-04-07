const mongoose = require('mongoose');
const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');

const validateIds = (path) => {
  const pathSegments = getSegmentsWithoutUsernameAndEnv(path);
  try {
    pathSegments.forEach((segment, i) => {
      if (i % 2 === 1) {
        mongoose.Types.ObjectId(segment);
      }
    });
  } catch (error) {
    error.message = 'Id in path is invalid.';
    error.statusCode = 400;
    throw error;
  }
};

const validateInput = (event) => {
  validateIds(event.path);
};

module.exports = { validateInput, validateIds };
