const mongoose = require('mongoose');
const { User } = require('../models/user.js');
const { mongodbUri } = require('../url-config');
const {
  getUsernameAndEnv,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

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

const deleteNestedEntitySearchParams = (env, pathSegments, searchParams) => {
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

  searchParams.forEach((value, key) => {
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

const deleteEntityWithSearchParams = (env, pathSegments, searchParams) => {
  const arrayFilters = getFirstArrayFilters(env, pathSegments[0]);
  const pullObject = {};
  const pullSelector = `${baseSelector}.${pathSegments[0]}`;
  pullObject[pullSelector] = {};
  searchParams.forEach((value, key) => {
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

const getTemplates = (env, pathSegments, searchParams) => {
  if (pathSegments.length === 1) {
    if (searchParams.keys().next().done === false) {
      return deleteEntityWithSearchParams(env, pathSegments, searchParams);
    }
    return deleteEntityTemplate(env, pathSegments);
  }

  if (pathSegments.length % 2 === 1) {
    if (searchParams.keys().next().done === false) {
      return deleteNestedEntitySearchParams(env, pathSegments, searchParams);
    }
    return deleteFieldTemplate(env, pathSegments);
  }

  return deleteElementOfArrayTemplate(env, pathSegments);
};

const deleteEntity = async (event) => {
  await mongoose.connect(mongodbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const url = new URL(event.path);
  const { username, env } = getUsernameAndEnv(url.pathname);
  const pathSegments = getSegmentsWithoutUsernameAndEnv(url.pathname);
  const { searchParams } = url;

  const query = {
    username,
  };
  const { updateTemplate, optionsTemplate } = getTemplates(
    env,
    pathSegments,
    searchParams,
  );

  await User.updateOne(query, updateTemplate, optionsTemplate);
  await mongoose.connection.close();
};

module.exports = { deleteEntity };
