const mongoose = require('mongoose');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
const { getUserModel } = require('../models/user.js');
const { successResponse } = require('../util/responseUtil');
require('dotenv').config();
/* eslint-disable no-underscore-dangle */
const getProjectQuery = (array, params) => {
  const filterObject = {};
  filterObject.input = `$${array}`;
  filterObject.as = 'item';
  const conditions = [];

  Object.entries(params).forEach((entry) => {
    const [key, value] = entry;
    let condition = {};
    if (+value) {
      condition = { $eq: [`$$item.${key}`, +value] };
    } else {
      condition = { $eq: [`$$item.${key}`, value] };
    }
    conditions.push(condition);
  });
  filterObject.cond = { $and: conditions };
  const projectObj = {};
  projectObj[array] = { $filter: filterObject };

  return projectObj;
};

const getEntityDbQuery = (entity, environment) => {
  const matchObj = {};
  matchObj[`environments.${environment}`] = { $exists: true };

  const queryTemplate = [];
  queryTemplate.push({ $match: matchObj });
  queryTemplate.push({
    $replaceRoot: { newRoot: `$environments.${environment}` },
  });

  const projectObj = {};
  projectObj[entity] = 1;
  projectObj._id = 0;
  queryTemplate.push({
    $project: projectObj,
  });

  return queryTemplate;
};

const getEntityByQueryParamsDbQuery = (entity, environment, queryParams) => {
  const queryTemplate = [];
  const matchObject = {};
  const environmentSelector = `environments.${environment}`;
  matchObject[environmentSelector] = { $exists: true };
  queryTemplate.push({ $match: matchObject });

  const selector = `environments.${environment}.${entity}`;
  queryTemplate.push({ $project: getProjectQuery(selector, queryParams) });
  queryTemplate.push({ $replaceRoot: { newRoot: `$${environmentSelector}` } });

  return queryTemplate;
};

const getNestedEntitiesByQueryParamsDbQuery = (
  pathSegments,
  environment,
  queryParams,
) => {
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
      const matchObj = {};
      matchObj[`${selector}._id`] = mongoose.Types.ObjectId(segment);
      queryTemplate.push({ $match: matchObj });
      queryTemplate.push();
    }
  });

  const lastSegment = pathSegments.slice(-1).pop();

  if (queryParams === null) {
    queryTemplate.push({ $replaceRoot: { newRoot: `$${selector}` } });

    const projectObj = {};
    projectObj._id = 0;
    projectObj[lastSegment] = 1;
    queryTemplate.push({ $project: projectObj });

    return queryTemplate;
  }

  queryTemplate.push({
    $project: getProjectQuery(`${selector}.${lastSegment}`, queryParams),
  });
  queryTemplate.push({ $replaceRoot: { newRoot: `$${selector}` } });

  return queryTemplate;
};

const getEntityByIdDbQuery = (pathSegments, environment) => {
  const queryTemplate = [];
  const matchObject = {};
  const environmentSelector = `environments.${environment}`;
  matchObject[environmentSelector] = { $exists: true };
  queryTemplate.push({ $match: matchObject });

  let selector = `environments.${environment}.${pathSegments[0]}`;

  if (pathSegments.length === 2) {
    const itemId = mongoose.Types.ObjectId(pathSegments[1]);
    const queryParams = { _id: itemId };

    queryTemplate.push({ $project: getProjectQuery(selector, queryParams) });
    queryTemplate.push({
      $replaceRoot: { newRoot: `$${environmentSelector}` },
    });
    return queryTemplate;
  }
  pathSegments.forEach((segment, i) => {
    if (i === 0) {
      queryTemplate.push({ $unwind: `$${selector}` });
      // if at id segment
    } else if (i % 2 === 1) {
      if (i + 1 !== pathSegments.length) {
        const matchObj = {};
        matchObj[`${selector}._id`] = mongoose.Types.ObjectId(segment);
        queryTemplate.push({ $match: matchObj });
        queryTemplate.push();
      }
    } else if (i + 2 !== pathSegments.length) {
      selector = `${selector}.${segment}`;
      queryTemplate.push({ $unwind: `$${selector}` });
    } else {
      selector = `${selector}.${segment}`;
    }
  });

  const itemId = mongoose.Types.ObjectId(pathSegments.slice(-1).pop());
  const queryParams = { _id: itemId };

  queryTemplate.push({ $project: getProjectQuery(selector, queryParams) });
  queryTemplate.push({
    $replaceRoot: { newRoot: queryTemplate[queryTemplate.length - 3].$unwind },
  });

  return queryTemplate;
};

const getDbQuery = (pathSegments, environment, queryParams) => {
  if (pathSegments.length === 1) {
    if (queryParams !== null) {
      return getEntityByQueryParamsDbQuery(
        pathSegments[0],
        environment,
        queryParams,
      );
    }
    return getEntityDbQuery(pathSegments[0], environment);
  }
  if (pathSegments.length % 2 === 0) {
    return getEntityByIdDbQuery(pathSegments, environment);
  }

  return getNestedEntitiesByQueryParamsDbQuery(
    pathSegments,
    environment,
    queryParams,
  );
};

const getEntity = async (event) => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { queryStringParameters } = event;

  const query = getDbQuery(
    [...pathSegments],
    environment,
    queryStringParameters,
  );

  const agreagateQuery = [
    { $match: { username } },
    { $unwind: '$environments' },
  ].concat(query);

  const User = getUserModel();
  const doc = await User.aggregate(agreagateQuery).exec();
  await mongoose.connection.close();
  return successResponse(200, doc[0]);
};

module.exports = {
  getEntity,
  getEntityDbQuery,
  getEntityByQueryParamsDbQuery,
  getEntityByIdDbQuery,
  getNestedEntitiesByQueryParamsDbQuery,
  getProjectQuery,
  getDbQuery,
};
