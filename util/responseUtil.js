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

module.exports = { successResponse, errorResponse };
