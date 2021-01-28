const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
  getUsernameAndEnv,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

const getReturnValue = (doc, pathSegments) => {
  if (doc.length === 0) {
    return [];
  }

  if (pathSegments.length % 2 === 0) {
    return doc[0];
  }

  return doc[0][pathSegments.slice(-1).pop()];
};

const getSearchParamsQuery = (searchParams) => {
  return [
    { $unwind: '$environments.entities.posts' },
    { $match: { 'environments.entities.posts.content': 'great post' } },
    { $match: { 'environments.entities.posts.rating': 5.0 } },
  ];
};

const getQueryParams = (segments, searchParams) => {
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
    const matchCondition = {};
    const entitySelector = `environments.entities.${lastSegment}`;
    matchCondition[entitySelector] = { $exists: true };
    queryTemplate.push({ $match: matchCondition });

    if (searchParams) {
      queryTemplate = queryTemplate.concat(getSearchParamsQuery(searchParams));
    }
    queryTemplate.push({
      $replaceRoot: { newRoot: '$environments.entities' },
    });
  } else {
    queryTemplate.push({
      $replaceRoot: {
        newRoot: queryTemplate[queryTemplate.length - 2].$unwind,
      },
    });
  }

  return queryTemplate;
};
const isNumeric = (str) => {
  if (typeof str !== 'string') return false;
  return !Number.isNaN(str);
};

const getEntity = async (event) => {
  const numStr = '5.10da';
  console.log(isNumeric(numStr));
  console.log(+numStr);

  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const url = new URL(event.path);
  const { username, env } = getUsernameAndEnv(url.pathname);
  const pathSegments = getSegmentsWithoutUsernameAndEnv(url.pathname);
  const searchParams = url.searchParams;
  console.log(searchParams);

  const queryTemplate = getQueryParams([...pathSegments], searchParams);
  console.log(queryTemplate);

  const agregateTemplate = [
    { $match: { username } },
    {
      $unwind: '$environments',
    },
    { $match: { 'environments.name': env } },
    { $unwind: '$environments.entities' },
  ].concat(queryTemplate);
  const doc = await User.aggregate(agregateTemplate).exec();
  console.log(doc);
  await mongoose.connection.close();
  // return getReturnValue(doc, pathSegments);
};

module.exports = {
  getEntity,
};

// { $match: { 'environments.entities.posts': { $exists: true } } },
// { $unwind: '$environments.entities.posts' },
// { $match: { 'environments.entities.posts.content': 'great post' } },
// { $match: { 'environments.entities.posts.rating': 5.0 } },
// { $replaceRoot: { newRoot: '$environments.entities' } },
