const { User } = require('../models/user.js');
const { Environment } = require('../models/environment.js');
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
    const entities = body[entityName];
    //console.log(entities[0]);

    const query = {
      username: 'ghost',
      'environments.name': env
    };
    User.findOneAndUpdate(
      query,
      { $push: { 'environments.$.entities': body } },
      { useFindAndModify: false },
      function callback(err, doc) {
        if (err) return console.log(err);
        console.log('found');
        console.log(doc);
      }
    );
  }
};

module.exports = {
  createEntity
};
