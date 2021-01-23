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

const environmentSchema = new mongoose.Schema({
  name: String,
  entities: [],
});

const userSchema = new mongoose.Schema({
  username: String,
  environments: [environmentSchema],
});

const createEnv = async (environmentName) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const conn = mongoose.connection;

    const Environment = conn.model("Environment", environmentSchema);

    const User = conn.model("User", userSchema);

    const environment = new Environment({
      name: environmentName,
      entities: [],
    });

    const query = {
      username: "ghost",
      "environments.name": { $ne: environmentName },
    };

    User.findOneAndUpdate(
      query,
      { $push: { environments: environment } },
      { useFindAndModify: false },
      function (err) {
        console.log(err);
        if (err) return handleError(err);
      }
    );
  } catch (error) {
    return errorResponse(environmentName, "Error!");
  }
  return successResponse(environmentName, "Success!");
};

module.exports = { createEnv, successResponse, errorResponse };
