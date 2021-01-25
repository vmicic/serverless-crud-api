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

module.exports = { getUsername, getUrlSegments };
