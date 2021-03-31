const successResponse = (statusCode, headers, body) => ({
  statusCode,
  body,
  headers,
});

const errorResponse = (statusCode, headers, body) => ({
  statusCode,
  body,
  headers,
});

const errorResponseFromError = (error) => ({
  statusCode: error.statusCode,
  body: error.message,
  headers: { 'Content-type': 'text/plain' },
});

module.exports = { successResponse, errorResponse, errorResponseFromError };
