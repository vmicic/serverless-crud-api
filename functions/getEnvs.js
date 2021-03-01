const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

const getEnvs = async (event) => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username } = event.pathParameters;
  const query = { username };
  const User = getUserModel();
  let doc;
  try {
    const envs = [];
    doc = await User.findOne(query).exec();
    doc.environments.forEach((env) => {
      Object.entries(env).forEach((entry) => {
        const [key] = entry;
        envs.push(key);
      });
    });
    return successResponse(200, { envs });
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }
};

module.exports = { getEnvs };
