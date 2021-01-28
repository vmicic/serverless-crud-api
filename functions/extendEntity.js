const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
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

  const { username, env } = getUsernameAndEnv(event.path);
  const segments = getSegmentsWithoutUsernameAndEnv(event.path);
  const entitiesToAdd = event.body;

  addIdForObjects(entitiesToAdd);

  const query = {
    username,
  };

  const identifiers = [];
  const entityArrayFilters = [];
  const pushObject = {};
  const entityIdentifier = 'entityIdentifier';
  let pushSelector = `environments.$[envIdentifier].entities.$[${entityIdentifier}]`;
  segments.forEach((segment, i) => {
    if (i % 2 === 0) {
      if (i + 1 !== segments.length) {
        const identifier = `${segment}Identifier`;
        identifiers.push(identifier);
        pushSelector = `${pushSelector}.${segment}.$[${identifier}]`;
      } else {
        pushSelector = `${pushSelector}.${segment}`;
      }
    } else {
      const entityArrayFilter = {};
      const entityArrayFilterSelector = `${identifiers.slice(-1).pop()}._id`;
      entityArrayFilter[entityArrayFilterSelector] = mongoose.Types.ObjectId(
        segment,
      );
      entityArrayFilters.push(entityArrayFilter);
    }
  });

  pushObject[pushSelector] = { $each: entitiesToAdd };

  const firstEntityFilter = {};
  const firstEntityFilterSelector = `${entityIdentifier}.${segments[0]}`;
  firstEntityFilter[firstEntityFilterSelector] = { $exists: true };

  await User.findOneAndUpdate(
    query,
    {
      $push: pushObject,
    },
    {
      arrayFilters: [{ 'envIdentifier.name': env }, firstEntityFilter].concat(
        entityArrayFilters,
      ),
      useFindAndModify: false,
    },
  ).exec();

  await mongoose.connection.close();
};

module.exports = {
  extendEntity,
};
