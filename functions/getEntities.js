const mongoose = require('mongoose');
const { mongodbUri } = require('../url-config');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
const { getUserModel } = require('../models/user.js');

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

const findEntity = (entity, environment) => {
  const queryTemplate = [];
  const matchObj = {};
  matchObj[`environments.${environment}`] = { $exists: true };
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

const findEntityByQueryParams = (entity, queryParams, environment) => {
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

const findNestedEntities = (pathSegments, queryParams, environment) => {
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

const findEntityById = (pathSegments, environment) => {
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

const getQueryParams = (pathSegments, queryStringParameters, environment) => {
  if (pathSegments.length === 1) {
    if (queryStringParameters !== null) {
      return findEntityByQueryParams(
        pathSegments.pop(),
        queryStringParameters,
        environment,
      );
    }
    return findEntity(pathSegments.pop(), environment);
  }
  if (pathSegments.length % 2 === 0) {
    return findEntityById(pathSegments, environment);
  }

  return findNestedEntities(pathSegments, queryStringParameters, environment);
};

const getEntity = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { queryStringParameters } = event;

  const queryTemplate = getQueryParams(
    [...pathSegments],
    queryStringParameters,
    environment,
  );

  const agregateTemplate = [
    { $match: { username } },
    { $unwind: '$environments' },
  ].concat(queryTemplate);

  const User = getUserModel();
  const doc = await User.aggregate(agregateTemplate).exec();
  await mongoose.connection.close();
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(doc[0]),
    headers: { 'Content-Type': 'application/json' },
  });
};

module.exports = {
  getEntity,
};
