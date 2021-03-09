/* eslint-disable operator-linebreak */
/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose');
const { getUserModel } = require('../models/user.js');
const { successResponse, errorResponse } = require('../util/responseUtil');
const { getSegmentsWithoutUsernameAndEnv } = require('../util/urlUtils');
require('dotenv').config();

const isPagination = (pathSegments, queryStringParameters) => {
  if (pathSegments.length % 2 !== 1) {
    return false;
  }

  if (queryStringParameters === null || queryStringParameters === undefined) {
    return false;
  }

  if (Object.keys(queryStringParameters).length !== 2) {
    return false;
  }

  if ('page' in queryStringParameters && 'per_page' in queryStringParameters) {
    if (
      Number.isInteger(+queryStringParameters.page) &&
      Number.isInteger(+queryStringParameters.per_page)
    ) {
      return true;
    }
  }

  return false;
};

const getEntityDbQuery = (entity, environment, queryParams) => {
  const queryTemplate = [];
  const match = {};
  match[`environments.${environment}`] = { $exists: true };
  queryTemplate.push({ $match: match });

  const project = {};
  const entityFullPath = `environments.${environment}.${entity}`;
  project[entityFullPath] = 1;
  project._id = 0;
  project.sizeOfArray = { $size: `$${entityFullPath}` };
  queryTemplate.push({
    $project: project,
  });

  queryTemplate.push({ $unwind: `$${entityFullPath}` });

  const page = +queryParams.page;
  const perPage = +queryParams.per_page;
  const skip = (page - 1) * perPage;
  queryTemplate.push({ $skip: skip });

  queryTemplate.push({ $limit: perPage });

  return queryTemplate;
};

const getNestedEntityDbQuery = (pathSegments, environment, queryParams) => {};

const getDbQuery = (pathSegments, environment, queryParams) => {
  if (pathSegments.length === 1) {
    return getEntityDbQuery(pathSegments[0], environment, queryParams);
  }

  return getNestedEntityDbQuery(pathSegments, environment, queryParams);
};

const convertToPaginationResponse = (doc, pathSegments, queryParams) => {
  const paginationDoc = doc;
  const page = +queryParams.page;
  const perPage = +queryParams.per_page;

  const embedded = {};
  const queryString = `?page=${page}&per_page=${perPage}`;
  const entityPath = `/${pathSegments.join('/')}`;
  embedded.self = `${entityPath}${queryString}`;

  const { sizeOfArray } = doc;
  let pages;
  if (sizeOfArray % perPage === 0) {
    pages = sizeOfArray / perPage;
  } else {
    pages = Math.trunc(sizeOfArray / perPage) + 1;
  }
  if (pages !== page) {
    embedded.next = `${entityPath}?page=${page + 1}&per_page=${perPage}`;
  }

  if (page !== 1) {
    embedded.previous = `${entityPath}?page=${page - 1}&per_page=${
      queryParams.per_page
    }`;
  }

  embedded.first = `${entityPath}?page=1&per_page=${perPage}`;

  embedded.last = `${entityPath}?page=${pages}&per_page=${perPage}`;

  const entity = pathSegments.slice(-1)[0];
  embedded.ammount = doc[entity].length;

  embedded.current_page = page;
  embedded.total = sizeOfArray;
  embedded.per_page = perPage;

  paginationDoc.__embedded = embedded;
  delete paginationDoc.sizeOfArray;

  return paginationDoc;
};

const replaceRoot = (doc, pathSegments) => {
  if (pathSegments.length === 1) {
    const sizeOfArray = +doc[0].sizeOfArray;
    const newRootDoc = {};
    const entity = pathSegments[0];
    newRootDoc[entity] = [];
    doc.forEach((document) => {
      newRootDoc[entity] = [
        ...newRootDoc[entity],
        document.environments.dev.users,
      ];
    });
    newRootDoc.sizeOfArray = sizeOfArray;

    return newRootDoc;
  }

  return doc;
};

const getPaginationResponse = async (event) => {
  const { username, environment } = event.pathParameters;
  const pathSegments = getSegmentsWithoutUsernameAndEnv(event.path);
  const { queryStringParameters } = event;

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const query = [{ $match: { username } }, { $unwind: '$environments' }].concat(
    getDbQuery(pathSegments, environment, queryStringParameters),
  );

  // [
  //   { '$match': { username: 'ghost' } },
  //   { '$unwind': '$environments' },
  //   { '$match': { 'environments.dev': [Object] } },
  //   {
  //     '$project': { 'environments.dev.users': 1, _id: 0, sizeOfArray: [Object] }
  //   },
  //   { '$unwind': '$environments.dev.users' },
  //   { '$skip': 0 },
  //   { '$limit': 1 }
  // ]

  const tempQuery = [
    { $match: { username: 'ghost' } },
    { $unwind: '$environments' },
    { $unwind: '$environments.dev.users' },
    {
      $match: {
        'environments.dev.users._id': mongoose.Types.ObjectId(
          '604781c71df8723f0c36f4b9',
        ),
      },
    },
    {
      $project: {
        'environments.dev.users.comments': 1,
        _id: 0,
        sizeOfArray: { $size: '$environments.dev.users.comments' },
      },
    },
    { $unwind: '$environments.dev.users.comments' },
    { $skip: 0 },
    { $limit: 1 },
  ];

  const User = getUserModel();
  let doc;
  try {
    doc = await User.aggregate(tempQuery).exec();
  } catch (error) {
    await mongoose.connection.close();
    return errorResponse(400, 'Bad request.');
  }
  await mongoose.connection.close();

  console.log(doc);
  return successResponse(200, 'gj');

  if (doc.length === 0) {
    return successResponse(400, "Requested page doesn't exist.");
  }

  const newRootDoc = replaceRoot(doc, pathSegments);
  const paginationResponse = convertToPaginationResponse(
    newRootDoc,
    pathSegments,
    queryStringParameters,
  );

  return successResponse(200, paginationResponse);
};

module.exports = {
  isPagination,
  getPaginationResponse,
};
