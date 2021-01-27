const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
  getUrlSegments,
  getUsernameAndEnv,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

/* eslint-disable no-param-reassign */
const addIdForObjects = (content) => {
  if (Array.isArray(content)) {
    content.forEach((el) => {
      addIdForObjects(el);
    });
  } else if (typeof content === 'object' && content !== null) {
    Object.keys(content).forEach((el) => {
      if (Array.isArray(content[el])) {
        addIdForObjects(content[el]);
      } else if (typeof content[el] === 'object' && content[el] !== null) {
        addIdForObjects(content[el]);
      }
    });
    // eslint-disable-next-line no-underscore-dangle
    content._id = mongoose.Types.ObjectId();
  }
};

const extendEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const segments = getUrlSegments(event.path);
  const username = segments[0];
  const env = segments[1];
  const entityName = segments[2];

  const { body } = event;

  addIdForObjects(body);

  const query = {
    username,
  };

  const envIdentifier = 'env';
  const entitiesArrayIdentifier = 'entity';

  const entitySelector = `environments.$[${envIdentifier}].entities.$[${entitiesArrayIdentifier}].${entityName}`;
  const pushObject = {};
  pushObject[entitySelector] = { $each: body };

  const envNameSelector = `${envIdentifier}.name`;
  const envNameObject = {};
  envNameObject[envNameSelector] = env;

  const entityNameSelector = `${entitiesArrayIdentifier}.${entityName}`;
  const entityNameObject = {};
  entityNameObject[entityNameSelector] = { $exists: true };

  const arrayFilters = [];
  arrayFilters.push(envNameObject);
  arrayFilters.push(entityNameObject);

  await User.findOneAndUpdate(
    query,
    {
      $push: pushObject,
    },
    {
      arrayFilters,
      useFindAndModify: false,
    },
  ).exec();

  await mongoose.connection.close();
};

const extendEntityDeep = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, env } = getUsernameAndEnv(event.path);
  const segments = getSegmentsWithoutUsernameAndEnv(event.path);
  const entitiesToAdd = event.body;

  const query = {
    username,
  };

  addIdForObjects(entitiesToAdd);

  console.log(entitiesToAdd);

  await User.findOneAndUpdate(
    query,
    {
      $push: {
        'environments.$[envIdentifier].entities.$[entity].posts.$[post].comments': {
          $each: entitiesToAdd,
        },
      },
    },
    {
      arrayFilters: [
        { 'envIdentifier.name': env },
        { 'entity.posts': { $exists: true } },
        { 'post._id': mongoose.Types.ObjectId('600da6dc10376f7420890000') },
      ],
      useFindAndModify: false,
    },
  ).exec();

  await mongoose.connection.close();
};

module.exports = {
  extendEntity,
  extendEntityDeep,
};
