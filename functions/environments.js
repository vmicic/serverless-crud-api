const mongoose = require('mongoose');
const { getEnvironmentModel } = require('../models/environment.js');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');

const createEnv = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const environmentName = event.body;
  const { username } = event.pathParameters;

  const Environment = getEnvironmentModel();
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
  callback(null, { statusCode: 201 });
};

const getEnv = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, environment } = event.pathParameters;

  const query = { username, 'environments.name': environment };
  const User = getUserModel();
  const doc = await User.findOne(query, 'environments.$').exec();

  await mongoose.connection.close();
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(doc.environments[0].entities),
    headers: { 'Content-Type': 'application/json' },
  });
};

module.exports = {
  createEnv,
  getEnv,
};
