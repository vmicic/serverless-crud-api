const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

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
  let doc;
  try {
    doc = await User.findOne(query, 'environments.$').exec();
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }
  await mongoose.connection.close();

  if (doc == null) {
    return errorResponse(404, 'Request environment not found.');
  }
  return successResponse(200, doc.environments[0][environment]);
};

const getEnvs = async (event) => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username } = event.pathParameters;
  const query = { username };
  const User = getUserModel();
  let doc;
  try {
    const envs = [];
    doc = await User.findOne(query).exec();
    doc.environments.forEach((env) => {
      Object.entries(env).forEach((entry) => {
        const [key] = entry;
        envs.push(key);
      });
    });
    await mongoose.connection.close();
    return successResponse(200, { envs });
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }
};

module.exports = {
  getEnv,
  getEnvs,
};
