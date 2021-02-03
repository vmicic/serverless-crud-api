const successResponse = (statusCode, bodyPayload) => {
  const response = {
    statusCode,
    body: JSON.stringify(bodyPayload),
  };

  return response;
};

module.exports = { successResponse };
