const mongoose = require('mongoose');
const { getUserModel } = require('../../models/user.js');
const { successResponse, errorResponse } = require('../../util/responseUtil');

const getEntity = (body) => {
  const parsedBody = JSON.parse(body);
  const entityName = Object.keys(parsedBody).find(
    (field) => field !== '__meta',
  );

  const entitySchema = parsedBody[entityName];
  return { entitySchema, entityName };
};

const getUpdate = async (query, environment, entitySchema, entityName) => {
  let update = { entitySchemas: {} };
  update.entitySchemas[environment] = {};

  const User = getUserModel();
  const document = await User.findOne(query).select({ entitySchemas: 1 });

  const oldEntitySchemas = document.entitySchemas;
  if (oldEntitySchemas === undefined) {
    update = { entitySchemas: {} };
    update.entitySchemas[environment] = {};
    update.entitySchemas[environment][entityName] = entitySchema;
  } else {
    update.entitySchemas = oldEntitySchemas;
    if (environment in update.entitySchemas) {
      update.entitySchemas[environment][entityName] = entitySchema;
    } else {
      update.entitySchemas[environment] = {};
      update.entitySchemas[environment][entityName] = entitySchema;
    }
  }

  return update;
};

const getResponse = (result) => {
  if (result.nModified === 0) {
    return errorResponse(
      404,
      {
        'Content-type': 'text/plain',
      },
      'Unable to create requested entity.',
    );
  }

  return successResponse(201, {
    'Content-type': 'text/plain',
  });
};

const createEntitySchema = async (event) => {
  const { entitySchema, entityName } = getEntity(event.body);
  const { username, environment } = event.pathParameters;

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = { username };
  const update = await getUpdate(query, environment, entitySchema, entityName);
  const User = getUserModel();
  let result;

  try {
    result = await User.updateOne(query, update);
  } catch (error) {
    await mongoose.connection.close();
  }

  return getResponse(result);
};

module.exports = { createEntitySchema };
