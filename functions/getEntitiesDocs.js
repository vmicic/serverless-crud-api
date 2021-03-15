const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
require('dotenv').config();

const updateStructure = (entities, path, structure) => {
  entities.forEach((entity) => {
    if (typeof entity === 'object' && entity !== null) {
      // if entity wasn't added to structure
      if (!_.has(structure, path)) {
        _.set(structure, path, {});
      }

      // check all fields of entity, and if it has sub entities, update structure
      Object.entries(entity).forEach((entry) => {
        const [key, value] = entry;
        if (Array.isArray(value)) {
          const newPath = `${path}.${key}`;
          updateStructure(value, newPath, structure);
        }
      });
    }
  });
};

const getEntitiesStructure = (entities) => {
  const structure = {};
  Object.entries(entities).forEach((entry) => {
    const [key, value] = entry;
    updateStructure(value, key, structure);
  });

  return structure;
};

const getResponseStructure = (entity, path, entityIndex, responseStructure) => {
  const [entityName, entityValue] = entity;
  // if entity doesn't have sub entities, only add it to array
  if (_.isEmpty(entityValue)) {
    const subEntities = _.get(responseStructure, path);
    _.set(responseStructure, path, [...subEntities, entityName]);
  } else {
    // if entity has sub entities add it as object, and add all of it's sub entities
    const subEntities = _.get(responseStructure, path);
    const subEntity = {};
    subEntity[`${entityName}`] = [];
    _.set(responseStructure, path, [...subEntities, subEntity]);
    Object.entries(entityValue).forEach((subEntry, subEntityIndex) => {
      const newPath = `${path}[${entityIndex}].${entityName}`;
      getResponseStructure(
        subEntry,
        newPath,
        subEntityIndex,
        responseStructure,
      );
    });
  }
};

const convertStructureToResponse = (rawStructure) => {
  const responseStructure = { entities: [] };
  Object.entries(rawStructure).forEach((entry, entityIndex) => {
    getResponseStructure(entry, 'entities', entityIndex, responseStructure);
  });

  return responseStructure;
};

const getResponse = (entitiesStructure, path) => {
  const pathSegments = getSegmentsWithoutUsernameAndEnv(path);
  pathSegments.shift();
  const structurePath = pathSegments.join('.');
  if (structurePath === '') {
    const responseStructure = convertStructureToResponse(entitiesStructure);
    return successResponse(200, responseStructure);
  }
  try {
    const responseStructure = convertStructureToResponse(
      _.get(entitiesStructure, structurePath),
    );
    return successResponse(200, responseStructure);
  } catch (error) {
    return errorResponse(400, 'Invalid entities path.');
  }
};

const getEntitiesDocs = async (event) => {
  const { username, environment } = event.pathParameters;

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = { username };
  const environmentSelector = `environments.${environment}`;
  query[environmentSelector] = { $exists: true };

  const User = getUserModel();
  let doc;
  try {
    doc = await User.findOne(query, 'environments.$').exec();
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }
  await mongoose.connection.close();

  const entities = doc.environments[0][environment];
  const entitiesStructure = getEntitiesStructure(entities);
  return getResponse(entitiesStructure, event.path);
};

module.exports = {
  getEntitiesDocs,
  getResponse,
  convertStructureToResponse,
  getResponseStructure,
  getEntitiesStructure,
};
