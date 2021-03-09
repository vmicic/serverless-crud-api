/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
require('dotenv').config();

const isPagination = (queryStringParameters) => {
  if (queryStringParameters === null || queryStringParameters === undefined) {
    return false;
  }

  if (Object.keys(queryStringParameters).length !== 2) {
    return false;
  }

  if ('page' in queryStringParameters && 'per_page' in queryStringParameters) {
    if (
      Number.isInteger(+queryStringParameters.page) &&
      Number.isInteger(+queryStringParameters.per_page)
    ) {
      return true;
    }
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
  const page = +queryParams.page;
  const perPage = +queryParams.per_page;

  const embedded = {};
  const queryString = `?page=${page}&per_page=${perPage}`;
  const entityPath = `/${pathSegments.join('/')}`;
  embedded.self = `${entityPath}${queryString}`;

  const sizeOfArray = +doc[0].sizeOfArray;
  let pages;
  if (sizeOfArray % perPage === 0) {
    pages = sizeOfArray / perPage;
  } else {
    pages = Math.trunc(sizeOfArray / perPage) + 1;
  }
  if (pages !== page) {
    embedded.next = `${entityPath}?page=${page + 1}&per_page=${perPage}`;
  }

  if (page !== 1) {
    embedded.previous = `${entityPath}?page=${page - 1}&per_page=${
      queryParams.per_page
    }`;
  }

  embedded.first = `${entityPath}?page=1&per_page=${perPage}`;

  embedded.last = `${entityPath}?page=${pages}&per_page=${perPage}`;

  embedded.ammount = pages;

  embedded.current_page = page;
  embedded.total = doc[0].sizeOfArray;
  embedded.per_page = perPage;

  paginationDoc.__embedded = embedded;
  delete paginationDoc.sizeOfArray;

  return paginationDoc;
};

const getPaginationResponse = async (event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { queryStringParameters } = event;

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = [{ $match: { username } }, { $unwind: '$environments' }].concat(
    getDbQuery(pathSegments, environment, queryStringParameters),
  );

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
    queryStringParameters,
  );

  return successResponse(200, paginationResponse);
};

module.exports = {
  isPagination,
  getPaginationResponse,
};
