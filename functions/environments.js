const mongoose = require('mongoose');
const { Environment } = require('../models/environment.js');
const { User } = require('../models/user.js');

const uri = 'mongodb://localhost:27017/serverless-crud';

const successResponse = (event, message) => ({
  statusCode: 200,
  body: JSON.stringify(
    {
      message,
      input: event
    },
    null,
    2
  )
});

const errorResponse = (event, message) => ({
  statusCode: 500,
  body: JSON.stringify(
    {
      message,
      input: event
    },
    null,
    2
  )
});

const createEnv = async (event) => {
  let environmentName = event;
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const environment = new Environment({
      name: environmentName,
      entities: []
    });

    const query = {
      username: 'ghost',
      'environments.name': { $ne: environmentName }
    };

    await User.findOneAndUpdate(
      query,
      { $push: { environments: environment } },
      { useFindAndModify: false }
    );
  } catch (error) {
    return errorResponse(environmentName, 'Error!');
  }

  mongoose.connection.close();
  return successResponse(environmentName, 'Success!');
};

const getEnv = async (event) => {
  var environmentName = event;

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const query = { username: 'ghost', 'environments.name': environmentName };
  const doc = await User.findOne(query).exec();

  const environment = doc.environments.filter(function callback(el) {
    return el.name === environmentName;
  });

  const entities = environment[0].entities;
  mongoose.connection.close();
  return entities;
};

module.exports = {
  createEnv,
  getEnv,
  successResponse,
  errorResponse
};
