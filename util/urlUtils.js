const getUrlSegments = (url) => {
  const fullPath = url;
  const sliceFrom = 'api/';
  const startIndex = fullPath.indexOf(sliceFrom);
  const slicedPath = fullPath.slice(startIndex + sliceFrom.length);
  return slicedPath.split('/');
};

const getUsername = (url) => {
  const segments = getUrlSegments(url);
  const username = segments[0];
  return username;
};

const getUsernameAndEnv = (url) => {
  const segments = getUrlSegments(url);
  const username = segments[0];
  const env = segments[1];
  return { username, env };
};

module.exports = { getUsername, getUsernameAndEnv, getUrlSegments };
