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

const createEnv = async (environment) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const conn = mongoose.connection;

    const User = conn.model(
      "User",
      new mongoose.Schema({ username: String, environments: [String] })
    );

    const query = { username: "ghost", environments: { $nin: environment } };
    User.findOneAndUpdate(
      query,
      { $push: { environments: environment } },
      { useFindAndModify: false },
      function (err) {
        if (err) return handleError(err);
      }
    );
  } catch (error) {
    return errorResponse(environment, "Error!");
  }
  return successResponse(environment, "Success!");
};

module.exports = { createEnv, successResponse, errorResponse };
