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

const complexQuery = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { username, env } = getUsernameAndEnv(event.path);
  const segments = getSegmentsWithoutUsernameAndEnv(event.path);

  if (segments.length % 2 !== 0) {
  } else {
    const unwindMatch = [];
    segments.forEach((segment, i) => {
      if (i % 2 === 0) {
        if (unwindMatch.length === 0) {
          const unwindString = `$environments.entities.${segments[i]}`;
          unwindMatch.push({ $unwind: unwindString });
        } else {
          const unwindString = `${
            unwindMatch[unwindMatch.length - 2].$unwind
          }.${segments[i]}`;
          unwindMatch.push({ $unwind: unwindString });
        }
      } else if (i % 2 === 1) {
        if (unwindMatch.length === 1) {
          const matchCondition = {};
          const matchQueryString = `environments.entities.${
            segments[i - 1]
          }._id`;
          matchCondition[matchQueryString] = mongoose.Types.ObjectId(
            segments[i],
          );
          unwindMatch.push({ $match: matchCondition });
        } else {
          const matchCondition = {};
          const matchQueryString = `${unwindMatch[
            unwindMatch.length - 1
          ].$unwind.substring(1)}._id`;
          matchCondition[matchQueryString] = mongoose.Types.ObjectId(
            segments[i],
          );
          unwindMatch.push({ $match: matchCondition });
        }
      }
    });

    unwindMatch.push({
      $replaceRoot: { newRoot: unwindMatch[unwindMatch.length - 2].$unwind },
    });

    const agregateTemplate = [
      { $match: { username } },
      {
        $unwind: '$environments',
      },
      { $match: { 'environments.name': env } },
      { $unwind: '$environments.entities' },
    ].concat(unwindMatch);
    const doc = await User.aggregate(agregateTemplate).exec();
    await mongoose.connection.close();
    if (doc.length !== 0) {
      return doc[0];
    }
    return [];
  }
};

module.exports = {
  getEntity,
  complexQuery,
};
