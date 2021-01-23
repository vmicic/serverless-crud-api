const mongoose = require('mongoose');

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

const environmentSchema = new mongoose.Schema({
  name: String,
  entities: []
});

const userSchema = new mongoose.Schema({
  username: String,
  environments: [environmentSchema]
});

const createEnv = async (event) => {
  let environmentName = event;

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const conn = mongoose.connection;

    const Environment = conn.model('Environment', environmentSchema);

    const User = conn.model('User', userSchema);

    const environment = new Environment({
      name: environmentName,
      entities: []
    });

    const query = {
      username: 'ghost',
      'environments.name': { $ne: environmentName }
    };

    User.findOneAndUpdate(
      query,
      { $push: { environments: environment } },
      { useFindAndModify: false },
      function callback(err) {
        if (err) return console.log(err);
        return 0;
      }
    );
  } catch (error) {
    return errorResponse(environmentName, 'Error!');
  }
  return successResponse(environmentName, 'Success!');
};

const getEnv = async (event) => {
  var environmentName = event;

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const conn = mongoose.connection;

  const User = conn.model('User', userSchema);

  const query = { username: 'ghost', 'environments.name': environmentName };
  const doc = await User.findOne(query).exec();

  const environment = doc.environments.filter(function callback(el) {
    return el.name === environmentName;
  });

  const entities = environment[0].entities;
  return entities;
};

module.exports = {
  createEnv,
  getEnv,
  successResponse,
  errorResponse
};
