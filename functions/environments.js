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
  const result = await User.updateOne(query, update).exec();
  await mongoose.connection.close();

  if (result.nModified === 0) {
    return errorResponse(
      400,
      'Environment already exists or username not found.',
    );
  }
  return successResponse(201, event);
};

const getEnv = async (event) => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, environment } = event.pathParameters;

  const query = { username };
  const environmentSelector = `environments.${environment}`;
  query[environmentSelector] = { $exists: true };

  const User = getUserModel();
  const doc = await User.findOne(query, 'environments.$').exec();
  await mongoose.connection.close();

  if (doc == null) {
    return errorResponse(404, 'Request environment not found.');
  }
  return successResponse(200, doc.environments[0][environment]);
};

module.exports = {
  createEnv,
  getEnv,
};
