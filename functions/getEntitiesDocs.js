const mongoose = require('mongoose');
const _ = require('lodash');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
require('dotenv').config();

var structure = [];

// const getAllSubEntities = (entities) => {
//   let isObjectInArray = false;
//   let subEntities = [];

//   entities.forEach((entity) => {
//     if (typeof entity === 'object' && entity !== null) {
//       isObjectInArray = true;
//       Object.entries(entity).forEach((entry) => {
//         const [key, value] = entry;
//         if (Array.isArray(value)) {
//           const {
//             isObjectInArray: isObjectInSubArray,
//             subEntities: subEntitiesInSu bArray,
//           } = getAllSubEntities(value);

//           if (isObjectInSubArray) {
//             console.log(`${key} has some objects in array`);
//             console.log(`Subentities of ${key}`);
//             console.log(subEntitiesInSubArray);
//             if (subEntitiesInSubArray.length === 0) {
//               subEntities = [...subEntities, key];
//             }
//           }
//         }
//       });
//     }
//   });

//   return { isObjectInArray, subEntities };
// };

// svaki el => check if obj => svaki property => if array => recursive

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

// {
//   entities: [
//     { users: ['comments', 'orders'] },
//     {
//       repos: [
//         'issues',
//         'discussions',
//         'commits',
//         { settings: ['actions', 'webhooks'] },
//       ],
//     },
//   ],
// }

const convertStructureToResponse = (structure) => {
  const response = { entities: [] };

  return structure;
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
