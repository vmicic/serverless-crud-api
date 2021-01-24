const mongoose = require('mongoose');
const { Environment } = require('../models/environment.js');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');

const createEnv = async (event) => {
  const environmentName = event;
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const environment = new Environment({
    name: environmentName,
    entities: [],
  });

  const query = {
    username: 'ghost',
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
  const environmentName = event;

  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = { username: 'ghost', 'environments.name': environmentName };
  const doc = await User.findOne(query).exec();

  const environment = doc.environments.filter(
    (el) => el.name === environmentName,
  );

  const { entities } = environment[0];
  await mongoose.connection.close();
  return entities;
};

module.exports = {
  createEnv,
  getEnv,
};
