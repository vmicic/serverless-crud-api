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

const createEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, env } = parseUrl(event.path);
  const { body } = event;
  const entityName = Object.keys(body)[0];

  addIdForObjects(body[entityName]);

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

  const elemMatchQuery = { name: env };
  const entityNameQuery = 'entities.'.concat(entityName);
  elemMatchQuery[entityNameQuery] = { $exists: true };
  const query = {
    username,
    environments: {
      $elemMatch: elemMatchQuery,
    },
  };

  const doc = await User.findOne(query, 'environments.entities.$').exec();
  await mongoose.connection.close();
  return doc.environments[0].entities[0];
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

  const entityNameSelector = `entity.${entityName}`;
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

module.exports = {
  createEntity,
  getEntity,
  extendEntity,
};
