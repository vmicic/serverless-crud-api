const {
  getUrlSegments,
  getSegmentsWithoutUsernameAndEnv,
} = require('../util/urlUtils');

test('splits all url segments', () => {
  const str = '/api/ghost/dev/users';
  const segments = getUrlSegments(str);
  expect(segments[0]).toMatch('ghost');
  expect(segments[1]).toMatch('dev');
  expect(segments[2]).toMatch('users');
  expect(segments.length).toBe(3);
});

test("split all url segments with no 'api/' in url", () => {
  const str = '-apighost1devyusers';
  const segments = getUrlSegments(str);
  expect(segments.length).toBe(0);
});

test('split all segments without username and env', () => {
  const str = '/api/ghost/dev/users';
  const segments = getSegmentsWithoutUsernameAndEnv(str);
  expect(segments[0]).toMatch('users');
  expect(segments.length).toBe(1);
});

test('split all segments without username and env', () => {
  const str = '/api/ghost/dev/users/60190d729f5f54d4b2950f66/posts';
  const segments = getSegmentsWithoutUsernameAndEnv(str);
  expect(segments[0]).toMatch('users');
  expect(segments[1]).toMatch('60190d729f5f54d4b2950f66');
  expect(segments[2]).toMatch('posts');
  expect(segments.length).toBe(3);
});

test("split all segments without username and env, with no 'api/' in url", () => {
  const str = '-apighost1devyusers';
  const segments = getUrlSegments(str);
  expect(segments.length).toBe(0);
});
