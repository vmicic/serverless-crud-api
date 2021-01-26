const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
  getUsernameAndEnv,
  getUrlSegments,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

const getEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const segments = getUrlSegments(event.path);
  const username = segments[0];
  const env = segments[1];
  const entityName = segments[2];

  const elemMatchQuery = { name: env };
  const entityNameQuery = `entities.${entityName}`;
  elemMatchQuery[entityNameQuery] = { $exists: true };
  const query = {
    username,
    environments: {
      $elemMatch: elemMatchQuery,
    },
  };

  const doc = await User.findOne(query, 'environments.entities.$').exec();
  await mongoose.connection.close();
  return doc.environments[0].entities[0];
};

const getQueryParams = (segments) => {
  const queryTemplate = [];
  segments.forEach((segment, i) => {
    if (i % 2 === 0) {
      if (i + 1 !== segments.length) {
        if (queryTemplate.length === 0) {
          const unwindString = `$environments.entities.${segments[i]}`;
          queryTemplate.push({ $unwind: unwindString });
        } else {
          const unwindString = `${
            queryTemplate[queryTemplate.length - 2].$unwind
          }.${segments[i]}`;
          queryTemplate.push({ $unwind: unwindString });
        }
      }
    } else if (i % 2 === 1) {
      if (queryTemplate.length === 1) {
        const matchCondition = {};
        const matchQueryString = `environments.entities.${segments[i - 1]}._id`;
        matchCondition[matchQueryString] = mongoose.Types.ObjectId(segments[i]);
        queryTemplate.push({ $match: matchCondition });
      } else {
        const matchCondition = {};
        const matchQueryString = `${queryTemplate[
          queryTemplate.length - 1
        ].$unwind.substring(1)}._id`;
        matchCondition[matchQueryString] = mongoose.Types.ObjectId(segments[i]);
        queryTemplate.push({ $match: matchCondition });
      }
    }
  });

  queryTemplate.push({
    $replaceRoot: { newRoot: queryTemplate[queryTemplate.length - 2].$unwind },
  });

  return queryTemplate;
};

const getReturnValue = (doc, segments) => {
  if (doc.length !== 0) {
    if (segments.length % 2 === 0) {
      return doc[0];
    }
    return doc[0][segments.slice(-1).pop()];
  }
  return [];
};

const complexQuery = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, env } = getUsernameAndEnv(event.path);
  const segments = getSegmentsWithoutUsernameAndEnv(event.path);

  const queryTemplate = getQueryParams(segments);

  const agregateTemplate = [
    { $match: { username } },
    {
      $unwind: '$environments',
    },
    { $match: { 'environments.name': env } },
    { $unwind: '$environments.entities' },
  ].concat(queryTemplate);
  const doc = await User.aggregate(agregateTemplate).exec();
  await mongoose.connection.close();
  return getReturnValue(doc, segments);
};

module.exports = {
  getEntity,
  complexQuery,
};
