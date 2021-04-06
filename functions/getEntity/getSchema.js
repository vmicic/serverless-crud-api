const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../../models/user.js');
const { successResponse } = require('../../util/responseUtil');
const { getSegmentsWithoutUsernameAndEnv } = require('../../util/urlUtils');

const getResponse = (schema) => {
  if (schema === undefined) {
    return successResponse(
      200,
      { 'Content-type': 'application/json' },
      JSON.stringify({}),
    );
  }

  return successResponse(
    200,
    { 'Content-type': 'application/json' },
    JSON.stringify(schema),
  );
};

const getSchema = async (event) => {
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { username, environment } = event.pathParameters;

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = { username };
  query[`environments.${environment}`] = { $exists: true };

  const User = getUserModel();
  const document = await User.findOne(query).select({
    entitySchemas: 1,
  });

  pathSegments.pop();
  const path = `entitySchemas.${environment}.${pathSegments.join('.')}`;
  const schema = _.get(document, path);

  await mongoose.connection.close();
  return getResponse(schema);
};

module.exports = { getSchema };
