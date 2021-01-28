const mongoose = require('mongoose');
const { Environment } = require('../models/environment.js');
const { User } = require('../models/user.js');
const { getUsername, getUsernameAndEnv } = require('../util/urlUtils.js');
const { mongodbUri } = require('../url-config');

const createEnv = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const environmentName = event.body;
  const username = getUsername(event.path);

  const environment = new Environment({
    name: environmentName,
    entities: [],
  });

  const query = {
    username,
    'environments.name': { $ne: environmentName },
  };

  await User.findOneAndUpdate(
    query,
    { $push: { environments: environment } },
    { useFindAndModify: false },
  ).exec();
  await mongoose.connection.close();
};

const getEnv = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, env } = getUsernameAndEnv(event.path);

  const query = { username, 'environments.name': env };
  const doc = await User.findOne(query, 'environments.$').exec();
  await mongoose.connection.close();
  return doc.environments[0].entities;
};

module.exports = {
  createEnv,
  getEnv,
};
