const successResponse = (statusCode, message) => ({
  statusCode,
  body: JSON.stringify(message),
});

const errorResponse = (statusCode, message) => ({
  statusCode,
  body: message,
});

module.exports = { successResponse, errorResponse };
