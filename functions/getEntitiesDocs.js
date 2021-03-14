const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

const structure = {};
const responseStructureGlobal = { entities: [] };

const updateStructure = (entities, path) => {
  entities.forEach((entity) => {
    if (typeof entity === 'object' && entity !== null) {
      if (!_.has(structure, path)) {
        _.set(structure, path, {});
      }

      Object.entries(entity).forEach((entry) => {
        const [key, value] = entry;
        if (Array.isArray(value)) {
          const newPath = `${path}.${key}`;
          updateStructure(value, newPath);
        }
      });
    }
  });
};

const getEntitiesStructure = (entities) => {
  Object.entries(entities).forEach((entry) => {
    const [key, value] = entry;
    updateStructure(value, key);
  });

  return structure;
};

const generateResponseStructure = (entry, path, entityIndex) => {
  const [entityName, entityValue] = entry;
  if (_.isEmpty(entityValue)) {
    const subEntities = _.get(responseStructureGlobal, path);
    _.set(responseStructureGlobal, path, [...subEntities, entityName]);
  } else {
    const subEntities = _.get(responseStructureGlobal, path);
    const subEntity = {};
    subEntity[`${entityName}`] = [];
    _.set(responseStructureGlobal, path, [...subEntities, subEntity]);
    Object.entries(entityValue).forEach((subEntry, subEntityIndex) => {
      const newPath = `${path}[${entityIndex}].${entityName}`;
      generateResponseStructure(subEntry, newPath, subEntityIndex);
    });
  }
};

const convertStructureToResponse = (rawStructure) => {
  Object.entries(rawStructure).forEach((entry, entityIndex) => {
    generateResponseStructure(entry, 'entities', entityIndex);
  });

  return responseStructureGlobal;
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
  const responseStructure = convertStructureToResponse(entitiesStructure);

  return successResponse(200, responseStructure);
};

module.exports = {
  getEntitiesDocs,
};
