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
    queryTemplate.push({ $replaceRoot: { newRoot: '$environments.entities' } });
  } else {
    queryTemplate.push({
      $replaceRoot: {
        newRoot: queryTemplate[queryTemplate.length - 2].$unwind,
      },
    });
  }

  return queryTemplate;
};

const getEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, env } = getUsernameAndEnv(event.path);
  const segments = getSegmentsWithoutUsernameAndEnv(event.path);

  let lastSegment;
  const segmentLengthOdd = segments.length % 2 === 1;
  if (segmentLengthOdd) {
    lastSegment = segments.pop();
  }

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

  if (doc.length === 0) {
    return [];
  }

  if (segmentLengthOdd) {
    return doc[0][lastSegment];
  }
  return doc[0];
};

module.exports = {
  getEntity,
};
