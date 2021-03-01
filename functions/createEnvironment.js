const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

const createEnv = async (event) => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const envName = event.body;
  if (!(typeof envName === 'string' || envName instanceof String)) {
    await mongoose.connection.close();
    return errorResponse(400, 'Environment name is not string.');
  }

  const { username } = event.pathParameters;

  const environmentQuery = {};
  environmentQuery[`environments.${envName}`] = { $exists: false };
  const query = {
    username,
  };
  query[`environments.${envName}`] = { $exists: false };

  const env = {};
  env[envName] = {};
  const update = {
    $push: { environments: env },
  };

  const User = getUserModel();
  let result;
  try {
    result = await User.updateOne(query, update).exec();
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }

  await mongoose.connection.close();

  if (result.nModified === 0) {
    return errorResponse(
      400,
      'Environment already exists or username not found.',
    );
  }
  return successResponse(201);
};

module.exports = {
  createEnv,
};
