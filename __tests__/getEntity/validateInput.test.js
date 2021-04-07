const { validateIds } = require('../../functions/getEntity/validateInput');

describe('validate ids', () => {
  test('ids valid', () => {
    const path = '/api/ghost/dev/users';
    validateIds(path);
  });

  test('invalid id', () => {
    const path = 'api/ghost/dev/users/123';

    expect(() => {
      validateIds(path);
    }).toThrow('Id in path is invalid.');
  });

  test('valida id with multiple entities', () => {
    const path = '/api/ghost/dev/users/60190d729f5f54d4b2950f66/comments';
    validateIds(path);
  });

  test('invalid id with multiple entities', () => {
    const path = '/api/ghost/dev/users/60190d729f5f54d4b2950f6/posts';
    expect(() => {
      validateIds(path);
    }).toThrow('Id in path is invalid.');
  });
});
