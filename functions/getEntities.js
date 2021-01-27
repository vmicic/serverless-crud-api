const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
  getUsernameAndEnv,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

const getQueryParams = (segments) => {
  const queryTemplate = [];
  segments.forEach((segment, i) => {
    if (i % 2 === 0) {
      if (i + 1 !== segments.length) {
        if (queryTemplate.length === 0) {
          queryTemplate.push({
            $unwind: `$environments.entities.${segment}`,
          });
        } else {
          queryTemplate.push({
            $unwind: `${
              queryTemplate[queryTemplate.length - 2].$unwind
            }.${segment}`,
          });
        }
      }
    } else if (i % 2 === 1) {
      if (queryTemplate.length === 1) {
        const matchCondition = {};
        matchCondition[
          `environments.entities.${segments[i - 1]}._id`
        ] = mongoose.Types.ObjectId(segment);
        queryTemplate.push({ $match: matchCondition });
      } else {
        const matchCondition = {};
        matchCondition[
          `${queryTemplate[queryTemplate.length - 1].$unwind.substring(1)}._id`
        ] = mongoose.Types.ObjectId(segment);
        queryTemplate.push({ $match: matchCondition });
      }
    }
  });

  // for queries with no nested entities
  if (queryTemplate.length < 2) {
    queryTemplate.push({ $replaceRoot: { newRoot: '$environments.entities' } });
  } else {
    queryTemplate.push({
      $replaceRoot: {
        newRoot: queryTemplate[queryTemplate.length - 2].$unwind,
      },
    });
  }

  console.log(queryTemplate);

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

const getEntity = async (event) => {
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
  console.log(doc);
  await mongoose.connection.close();
  return getReturnValue(doc, segments);
};

module.exports = {
  getEntity,
};
