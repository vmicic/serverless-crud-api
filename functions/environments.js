const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');

const createEnv = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const environmentName = event.body;
  const { username } = event.pathParameters;

  const query = {
    username,
  };

  const env = {};
  env[environmentName] = {};

  const User = getUserModel();
  await User.findOneAndUpdate(
    query,
    { $push: { environments: env } },
    { useFindAndModify: false },
  ).exec();
  await mongoose.connection.close();
};

const getEnv = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, environment } = event.pathParameters;

  const query = { username, 'environments.dev': { $exists: true } };
  const environmentSelector = `environments.${environment}`;
  query[environmentSelector] = { $exists: true };

  const User = getUserModel();
  const doc = await User.findOne(query, 'environments.$').exec();

  await mongoose.connection.close();
};

module.exports = {
  createEnv,
  getEnv,
};
