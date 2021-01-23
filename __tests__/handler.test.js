const handler = require('../handler');

test('success response returns status code 200 ok', () => {
  expect(handler.successResponse({}, 'Success!').statusCode).toBe(200);
});
