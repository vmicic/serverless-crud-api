const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');

const getSearchParamsQuery = (baseSelectorStr, queryStringParameters) => {
  const queryPropTemplate = [];
  queryPropTemplate.push({
    $unwind: `$${baseSelectorStr}`,
  });

  Object.entries(queryStringParameters).forEach((entry) => {
    const [key, value] = entry;
    const matchObject = {};
    if (+value) {
      matchObject[`${baseSelectorStr}.${key}`] = +value;
    } else {
      matchObject[`${baseSelectorStr}.${key}`] = value;
    }
    queryPropTemplate.push({ $match: matchObject });
  });

  return queryPropTemplate;
};

const getQueryParams = (segments, queryStringParameters) => {
  const segmentLengthOdd = segments.length % 2 === 1;
  let lastSegment;
  if (segmentLengthOdd) {
    lastSegment = segments.pop();
  }

  let queryTemplate = [];
  segments.forEach((segment, i) => {
    if (i % 2 === 1) {
      const entityId = mongoose.Types.ObjectId(segment);
      const matchCondition = {};
      if (queryTemplate.length === 0) {
        queryTemplate.push({
          $unwind: `$environments.entities.${segments[i - 1]}`,
        });

        matchCondition[
          `environments.entities.${segments[i - 1]}._id`
        ] = entityId;
        queryTemplate.push({ $match: matchCondition });
      } else {
        queryTemplate.push({
          $unwind: `${queryTemplate[queryTemplate.length - 2].$unwind}.${
            segments[i - 1]
          }`,
        });

        matchCondition[
          `${queryTemplate[queryTemplate.length - 1].$unwind.substring(1)}._id`
        ] = entityId;
        queryTemplate.push({ $match: matchCondition });
      }
    }
  });

  // for queries with no nested entities
  if (queryTemplate.length === 0) {
    const entitySelector = `environments.entities.${lastSegment}`;

    if (queryStringParameters !== null) {
      queryTemplate = queryTemplate.concat(
        getSearchParamsQuery(entitySelector, queryStringParameters),
      );
    } else {
      queryTemplate.push({ $unwind: `$${entitySelector}` });
    }

    queryTemplate.push({
      $replaceRoot: { newRoot: `$${entitySelector}` },
    });
  } else {
    const entitySelector = `${
      queryTemplate[queryTemplate.length - 2].$unwind
    }.${lastSegment}`.substring(1);

    if (queryStringParameters !== null) {
      queryTemplate = queryTemplate.concat(
        getSearchParamsQuery(entitySelector, queryStringParameters),
      );
    }

    if (segmentLengthOdd) {
      queryTemplate.push(
        { $unwind: `$${entitySelector}` },
        {
          $replaceRoot: { newRoot: `$${entitySelector}` },
        },
      );
    } else {
      queryTemplate.push({
        $replaceRoot: {
          newRoot: `${queryTemplate[queryTemplate.length - 2].$unwind}`,
        },
      });
    }
  }

  return queryTemplate;
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
  );

  const agregateTemplate = [
    { $match: { username } },
    {
      $unwind: '$environments',
    },
    { $match: { 'environments.name': environment } },
    { $unwind: '$environments.entities' },
  ].concat(queryTemplate);
  const doc = await User.aggregate(agregateTemplate).exec();
  await mongoose.connection.close();
  callback(null, {
    statusCode: 200,
    body: JSON.stringify(doc),
    headers: { 'Content-Type': 'application/json' },
  });
};

module.exports = {
  getEntity,
};
