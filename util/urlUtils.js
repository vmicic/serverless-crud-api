const getUrlSegments = (url) => {
  const fullPath = url;
  const sliceFrom = 'api/';
  const startIndex = fullPath.indexOf(sliceFrom);
  if (startIndex === -1) {
    return [];
  }

  const slicedPath = fullPath.slice(startIndex + sliceFrom.length);
  return slicedPath.split('/');
};

const getSegmentsWithoutUsernameAndEnv = (url) => {
  const segments = getUrlSegments(url);
  if (segments === undefined || segments.length === 0) {
    return [];
  }

  return segments.slice(2);
};

module.exports = {
  getUrlSegments,
  getSegmentsWithoutUsernameAndEnv,
};
