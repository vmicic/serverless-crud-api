const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { mongodbUri } = require('../url-config');

/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const addIdForObjects = (array) => {
  if (Array.isArray(array)) {
    array.forEach((element) => {
      if (typeof element === 'object' && element !== null) {
        element._id = mongoose.Types.ObjectId();
        Object.keys(element).forEach((field) => {
          if (Array.isArray(element[field])) {
            addIdForObjects(element[field]);
          }
        });
      }
    });
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
  };

  const setObject = {};
  setObject[`environments.$[envId].${environment}.${entityName}`] =
    entity[entityName];

  const filter = {};
  filter[`envId.${environment}`] = { $exists: true };

  const arrayFilters = [];
  arrayFilters.push(filter);

  const update = { $set: setObject };
  const options = {
    arrayFilters,
    useFindAndModify: false,
  };

  const User = getUserModel();
  await User.findOneAndUpdate(query, update, options).exec();
  await mongoose.connection.close();
  callback(null, { statusCode: 201 });
};

module.exports = {
  createEntity,
};
