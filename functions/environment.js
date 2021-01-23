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
    const User = conn.model(
      "User",
      new mongoose.Schema({ username: String, environments: [String] })
    );
    const query = { username: "ghost" };
    User.findOneAndUpdate(
      query,
      { $push: { environments: data } },
      { useFindAndModify: false },
      function (err) {
        if (err) return handleError(err);
      }
    );
  } catch (error) {
    return errorResponse(data, "Error!");
  }
  return successResponse(data, "Success!");
};

module.exports = { createEnv, successResponse, errorResponse };
