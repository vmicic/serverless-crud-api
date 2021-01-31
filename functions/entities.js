const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');

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

const createEntity = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, environment } = event.pathParameters;
  const entity = JSON.parse(event.body);
  const entityName = Object.keys(entity)[0];

  addIdForObjects(entity[entityName]);

  const query = {
    username,
    'environments.name': environment,
  };

  query[`environments.entities.${entityName}`] = { $exists: false };

  const User = getUserModel();
  await User.findOneAndUpdate(
    query,
    { $push: { 'environments.$.entities': entity } },
    { useFindAndModify: false },
  ).exec();
  await mongoose.connection.close();
  callback(null, { statusCode: 201 });
};

module.exports = {
  createEntity,
};
