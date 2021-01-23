const mongoose = require('mongoose');

const successResponse = (event, message) => ({
  statusCode: 200,
  body: JSON.stringify(
    {
      message,
      input: event,
    },
    null,
    2,
  ),
});

const errorResponse = (event, message) => ({
  statusCode: 500,
  body: JSON.stringify(
    {
      message,
      input: event,
    },
    null,
    2,
  ),
});

const hello = async (event) => {
  try {
    await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
  } catch (error) {
    return errorResponse(event, 'Error!');
  }
  return successResponse(event, 'Success!');
};

module.exports = { hello, successResponse, errorResponse };
