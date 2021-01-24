const { User } = require('../models/user.js');
const mongoose = require('mongoose');

const createEntity = async (event) => {
  const uri = 'mongodb://localhost:27017/serverless-crud';
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const fullPath = event.path;
  const sliceFrom = 'api/';
  const startIndex = fullPath.indexOf(sliceFrom);
  const slicedPath = fullPath.slice(startIndex + sliceFrom.length);

  const segments = slicedPath.split('/');
  if (segments.length === 2) {
    const username = segments[0];
    const env = segments[1];

    const body = event.body;
    const entityName = Object.keys(body)[0];

    Object.keys(body[entityName]).forEach((el) => {
      // eslint-disable-next-line no-underscore-dangle
      body[entityName][el]._id = mongoose.Types.ObjectId();
    });

    const query = {
      username: username,
      'environments.name': env
    };

    await User.findOneAndUpdate(
      query,
      { $push: { 'environments.$.entities': body } },
      { useFindAndModify: false }
    );
  }
  await mongoose.connection.close();
};

module.exports = {
  createEntity
};
