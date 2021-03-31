const parseJson = (body) => {
  try {
    return JSON.parse(body);
  } catch (error) {
    error.message = 'Invalid body';
    error.statusCode = 400;
    throw error;
  }
};

const validateProperties = (body) => {
  if (Object.keys(body).length !== 1 && Object.keys(body).length !== 2) {
    const error = new Error('Invalid body');
    error.statusCode = 400;
    throw error;
  }

  if (Object.keys(body).length === 2) {
    if (!('__meta' in body)) {
      const error = new Error('Property __meta has to be in body');
      error.statusCode = 400;
      throw error;
    }
  }
};

const validateInput = (event) => {
  const body = parseJson(event.body);
  validateProperties(body);
};

module.exports = { validateInput };
