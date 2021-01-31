const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');

const baseSelector = 'environments.$[envId].entities.$[entityId]';

const getFirstArrayFilters = (env, segment) => {
  const filterSelector = `entityId.${segment}`;
  const filter = {};
  filter[filterSelector] = { $exists: true };
  const arrayFilters = [{ 'envId.name': env }, filter];
  return arrayFilters;
};

const deleteFieldTemplate = (env, pathSegments) => {
  let unsetSelector = baseSelector;

  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      unsetSelector = `${unsetSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      const filter = {};
      const idSelector = `${pathSegments[i - 1]}Id._id`;
      unsetSelector = `${unsetSelector}.$[${pathSegments[i - 1]}Id]`;
      filter[idSelector] = id;
      arrayFilters.push(filter);
    }
  });

  const unsetObject = {};
  unsetObject[unsetSelector] = '';

  const updateTemplate = { $unset: unsetObject };
  const optionsTemplate = { arrayFilters };

  return {
    updateTemplate,
    optionsTemplate,
  };
};

const deleteNestedEntitySearchParams = (
  env,
  pathSegments,
  queryStringParameters,
) => {
  let pullSelector = baseSelector;

  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      pullSelector = `${pullSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      const filter = {};
      const filterSelector = `${pathSegments[i - 1]}Id._id`;
      pullSelector = `${pullSelector}.$[${pathSegments[i - 1]}Id]`;
      filter[filterSelector] = id;
      arrayFilters.push(filter);
    }
  });

  const pullObject = {};
  pullObject[pullSelector] = {};

  Object.entries(queryStringParameters).forEach((entry) => {
    const [key, value] = entry;
    if (+value) {
      pullObject[pullSelector][key] = +value;
    } else {
      pullObject[pullSelector][key] = value;
    }
  });

  const updateTemplate = {
    $pull: pullObject,
  };
  const optionsTemplate = { arrayFilters };

  return { updateTemplate, optionsTemplate };
};

const deleteEntityTemplate = (env, pathSegments) => {
  const entityCondition = {};
  entityCondition[pathSegments[0]] = { $exists: true };

  const updateTemplate = {
    $pull: { 'environments.$[envId].entities': entityCondition },
  };

  const optionsTemplate = {
    arrayFilters: [{ 'envId.name': env }],
  };

  return { updateTemplate, optionsTemplate };
};

const deleteEntityWithSearchParams = (
  env,
  pathSegments,
  queryStringParameters,
) => {
  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);
  const pullObject = {};
  const pullSelector = `${baseSelector}.${pathSegments[0]}`;
  pullObject[pullSelector] = {};

  Object.entries(queryStringParameters).forEach((entry) => {
    const [key, value] = entry;
    if (+value) {
      pullObject[pullSelector][key] = +value;
    } else {
      pullObject[pullSelector][key] = value;
    }
  });

  const updateTemplate = {
    $pull: pullObject,
  };
  const optionsTemplate = { arrayFilters };

  return { updateTemplate, optionsTemplate };
};

const deleteElementOfArrayTemplate = (env, pathSegments) => {
  const pullObject = {};
  let pullSelector = baseSelector;

  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);

  pathSegments.forEach((segment, i) => {
    if (i % 2 === 0) {
      pullSelector = `${pullSelector}.${segment}`;
    }

    if (i % 2 === 1) {
      const id = mongoose.Types.ObjectId(segment);
      if (i + 1 === pathSegments.length) {
        pullObject[pullSelector] = { _id: id };
      } else {
        const filter = {};
        const idSelector = `${pathSegments[i - 1]}Id._id`;
        pullSelector = `${pullSelector}.$[${pathSegments[i - 1]}Id]`;
        filter[idSelector] = id;
        arrayFilters.push(filter);
      }
    }
  });

  const updateTemplate = { $pull: pullObject };
  const optionsTemplate = { arrayFilters };

  return { updateTemplate, optionsTemplate };
};

const getTemplates = (env, pathSegments, queryStringParameters) => {
  if (pathSegments.length === 1) {
    if (queryStringParameters !== null) {
      return deleteEntityWithSearchParams(
        env,
        pathSegments,
        queryStringParameters,
      );
    }
    return deleteEntityTemplate(env, pathSegments);
  }

  if (pathSegments.length % 2 === 1) {
    if (queryStringParameters !== null) {
      return deleteNestedEntitySearchParams(
        env,
        pathSegments,
        queryStringParameters,
      );
    }
    return deleteFieldTemplate(env, pathSegments);
  }

  return deleteElementOfArrayTemplate(env, pathSegments);
};

const deleteEntity = async (event, context, callback) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(event);

  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { queryStringParameters } = event;

  const query = {
    username,
  };
  const { updateTemplate, optionsTemplate } = getTemplates(
    environment,
    pathSegments,
    queryStringParameters,
  );

  console.log(updateTemplate);
  console.log(optionsTemplate);

  await User.updateOne(query, updateTemplate, optionsTemplate);
  await mongoose.connection.close();
  callback(null, { statusCode: 200 });
};

module.exports = { deleteEntity };
