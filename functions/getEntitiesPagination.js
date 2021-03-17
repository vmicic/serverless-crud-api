/* eslint-disable operator-linebreak */
/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
require('dotenv').config();

const isPagination = (pathSegments, queryStringParameters) => {
  if (pathSegments.length % 2 !== 1) {
    return false;
  }

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

const getEntityDbQuery = (entity, environment, queryParams) => {
  const queryTemplate = [];
  const match = {};
  match[`environments.${environment}`] = { $exists: true };
  queryTemplate.push({ $match: match });

  const project = {};
  const entityFullPath = `environments.${environment}.${entity}`;
  project[entityFullPath] = 1;
  project._id = 0;
  project.sizeOfArray = { $size: `$${entityFullPath}` };
  queryTemplate.push({
    $project: project,
  });

  queryTemplate.push({ $unwind: `$${entityFullPath}` });

  const page = +queryParams.page;
  const perPage = +queryParams.per_page;
  const skip = (page - 1) * perPage;
  queryTemplate.push({ $skip: skip });
  queryTemplate.push({ $limit: perPage });

  return queryTemplate;
};

const getNestedEntityDbQuery = (pathSegments, environment, queryParams) => {
  const queryTemplate = [];
  let selector = `environments.${environment}`;
  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      if (i + 1 !== pathSegments.length) {
        selector = `${selector}.${segment}`;
        queryTemplate.push({ $unwind: `$${selector}` });
      }
      // if at id segment
    } else if (i % 2 === 1) {
      const match = {};
      match[`${selector}._id`] = mongoose.Types.ObjectId(segment);
      queryTemplate.push({ $match: match });
      queryTemplate.push();
    }
  });

  const lastSegment = pathSegments.slice(-1).pop();
  const entityFullPath = `${selector}.${lastSegment}`;

  const project = {};
  project[entityFullPath] = 1;
  project._id = 0;
  project.sizeOfArray = { $size: `$${entityFullPath}` };
  queryTemplate.push({ $project: project });

  queryTemplate.push({ $unwind: `$${entityFullPath}` });

  const page = +queryParams.page;
  const perPage = +queryParams.per_page;
  const skip = (page - 1) * perPage;
  queryTemplate.push({ $skip: skip });
  queryTemplate.push({ $limit: perPage });

  return queryTemplate;
};

const getDbQuery = (pathSegments, environment, queryParams) => {
  if (pathSegments.length === 1) {
    return getEntityDbQuery(pathSegments[0], environment, queryParams);
  }

  return getNestedEntityDbQuery(pathSegments, environment, queryParams);
};

const replaceRoot = (doc, pathSegments, env) => {
  const sizeOfArray = +doc[0].sizeOfArray;
  const newRootDoc = {};
  const entity = pathSegments.slice(-1).pop();
  newRootDoc[entity] = [];

  if (pathSegments.length === 1) {
    doc.forEach((singleEntity) => {
      newRootDoc[entity] = [
        ...newRootDoc[entity],
        singleEntity.environments[env][entity],
      ];
    });
    newRootDoc.sizeOfArray = sizeOfArray;

    return newRootDoc;
  }

  let entityFullPath = '';
  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      if (entityFullPath === '') {
        entityFullPath = segment;
      } else {
        entityFullPath = `${entityFullPath}.${segment}`;
      }
    }
  });

  doc.forEach((singleEntity) => {
    newRootDoc[entity] = [
      ...newRootDoc[entity],
      _.get(singleEntity, `environments.${env}.${entityFullPath}`),
    ];
  });

  newRootDoc.sizeOfArray = sizeOfArray;
  return newRootDoc;
};

const convertToPaginationResponse = (doc, pathSegments, queryParams) => {
  const paginationDoc = doc;
  const page = +queryParams.page;
  const perPage = +queryParams.per_page;

  const embedded = {};
  const queryString = `?page=${page}&per_page=${perPage}`;
  const entityPath = `/${pathSegments.join('/')}`;
  embedded.self = `${entityPath}${queryString}`;

  const { sizeOfArray } = doc;
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

  const entity = pathSegments.slice(-1)[0];
  embedded.ammount = doc[entity].length;

  embedded.current_page = page;
  embedded.total = sizeOfArray;
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
    return errorResponse(400, { 'Content-type': 'text/plain' }, 'Bad request.');
  }
  await mongoose.connection.close();

  if (doc.length === 0) {
    return errorResponse(
      400,
      { 'Content-type': 'text/plain' },
      "Requested page doesn't exist.",
    );
  }

  const newRootDoc = replaceRoot(doc, pathSegments, environment);
  const paginationResponse = convertToPaginationResponse(
    newRootDoc,
    pathSegments,
    queryStringParameters,
  );

  return successResponse(
    200,
    { 'Content-type': 'application/json' },
    JSON.stringify(paginationResponse),
  );
};

module.exports = {
  isPagination,
  getPaginationResponse,
  getEntityDbQuery,
  getNestedEntityDbQuery,
  getDbQuery,
  convertToPaginationResponse,
  replaceRoot,
};
