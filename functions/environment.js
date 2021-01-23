const mongoose = require("mongoose");

const uri = "mongodb://localhost:27017/serverless-crud";

const successResponse = (event, message) => ({
  statusCode: 200,
  body: JSON.stringify(
    {
      message,
      input: event,
    },
    null,
    2
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
    2
  ),
});

const createEnv = async (data) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const conn = mongoose.connection;
    const Environment = conn.model(
      "Environment",
      new mongoose.Schema({ name: String })
    );
    const environment = new Environment({ name: data });
    environment.save(function (err) {
      if (err) {
        return console.error(err);
      }
    });
  } catch (error) {
    return errorResponse(data, "Error!");
  }
  return successResponse(data, "Success!");
};

module.exports = { createEnv, successResponse, errorResponse };
