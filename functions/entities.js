const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const { getUsernameAndEnv } = require('../util/urlUtils');

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

  const { username, env } = getUsernameAndEnv(event.path);
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

module.exports = {
  createEntity,
};
