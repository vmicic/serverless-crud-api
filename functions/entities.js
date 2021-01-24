const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');

const getUrlSegments = (url) => {
  const fullPath = url;
  const sliceFrom = 'api/';
  const startIndex = fullPath.indexOf(sliceFrom);
  const slicedPath = fullPath.slice(startIndex + sliceFrom.length);
  return slicedPath.split('/');
};

const parseUrl = (url) => {
  const segments = getUrlSegments(url);
  const username = segments[0];
  const env = segments[1];
  return { username, env };
};

const createEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, env } = parseUrl(event.path);
  const { body } = event;
  const entityName = Object.keys(body)[0];

  Object.keys(body[entityName]).forEach((el) => {
    // eslint-disable-next-line no-underscore-dangle
    body[entityName][el]._id = mongoose.Types.ObjectId();
  });

  const query = {
    username,
    'environments.name': env,
  };

  await User.findOneAndUpdate(
    query,
    { $push: { 'environments.$.entities': body } },
    { useFindAndModify: false },
  ).exec();
  await mongoose.connection.close();
};

const getEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const segments = getUrlSegments(event.path);
  const username = segments[0];
  const env = segments[1];
  const entityName = segments[2];

  const query = {
    username: 'ghost',
    'environments.name': 'prod',
    'entities.songs.name': 'Hey Dude',
  };
  const doc = await User.findOne(query).exec();
  console.log(doc);

  await mongoose.connection.close();
};

module.exports = {
  createEntity,
  getEntity,
};
