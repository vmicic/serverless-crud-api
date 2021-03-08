/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

const isPagination = (queryStringParameters) => {
  if (queryStringParameters === null || queryStringParameters === undefined) {
    return false;
  }

  if (Object.keys(queryStringParameters).length !== 2) {
    return false;
  }

  if ('page' in queryStringParameters && 'per_page' in queryStringParameters) {
    return true;
  }

  return false;
};

const getEntityDbQuery = (entity, environment) => {
  const matchObj = {};
  matchObj[`environments.${environment}`] = { $exists: true };

  const queryTemplate = [];
  queryTemplate.push({ $match: matchObj });
  queryTemplate.push({
    $replaceRoot: { newRoot: `$environments.${environment}` },
  });

  const project = {};
  project[entity] = 1;
  project._id = 0;
  project.sizeOfArray = { $size: `$${entity}` };
  queryTemplate.push({
    $project: project,
  });

  return queryTemplate;
};

const getDbQuery = (pathSegments, environment, queryParams) => {
  if (pathSegments.length === 1) {
    if (queryParams !== null) {
      //   return getEntityByQueryParamsDbQuery(
      //     pathSegments[0],
      //     environment,
      //     queryParams,
      //   );
    }
    return getEntityDbQuery(pathSegments[0], environment);
  }
  if (pathSegments.length % 2 === 0) {
    // return getEntityByIdDbQuery(pathSegments, environment);
  }

  //   return getNestedEntitiesByQueryParamsDbQuery(
  //     pathSegments,
  //     environment,
  //     queryParams,
  //   );
};

const convertToPaginationResponse = (doc, pathSegments, queryParams) => {
  const paginationDoc = doc[0];

  const embedded = { total: doc[0].sizeOfArray };
  const queryString = `?page=${queryParams.page}&per_page=${queryParams.per_page}`;
  const entityPath = `/${pathSegments.join('/')}`;
  embedded.self = `${entityPath}${queryString}`;
  if (+queryParams.page !== 1) {
    embedded.previous = `?page=${queryParams.page - 1}&per_page=${
      queryParams.per_page
    }`;
  }
  paginationDoc.__embedeed = embedded;

  delete paginationDoc.sizeOfArray;

  return paginationDoc;
};

const getPaginationResponse = async (
  username,
  environment,
  pathSegments,
  queryParams,
) => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = [{ $match: { username } }, { $unwind: '$environments' }].concat(
    getDbQuery(pathSegments, environment, queryParams),
  );

  //   [
  //     { $match: { 'environments.dev': { $exists: true } } },
  //     { $replaceRoot: { newRoot: '$environments.dev' } },
  //     {
  //       $project: { users: 1, _id: 0, sizeOfArray: { $size: '$users' } },
  //     },
  //   ],

  const User = getUserModel();
  let doc;
  try {
    doc = await User.aggregate(query).exec();
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }
  await mongoose.connection.close();
  const paginationResponse = convertToPaginationResponse(
    doc,
    pathSegments,
    queryParams,
  );

  return successResponse(200, paginationResponse);
};

module.exports = {
  isPagination,
  getPaginationResponse,
};
