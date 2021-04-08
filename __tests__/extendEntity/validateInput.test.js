const { validateBody } = require('../../functions/extendEntity/validateInput');

describe('validate body', () => {
  test('expect array in body', () => {
    const path = '/api/ghost/dev/users';
    const body = { name: 'Tommy' };

    expect(() => {
      validateBody(body, path);
    }).toThrow('Expected array in body.');
  });

  test('expect object got array', () => {
    const path = '/api/ghost/dev/users/userId';
    const body = [{ name: 'Tommy' }];

    expect(() => {
      validateBody(body, path);
    }).toThrow('Expected object got array in body.');
  });

  test('expect object got string', () => {
    const path = '/api/ghost/dev/users/userId';
    const body = 'rangom string';

    expect(() => {
      validateBody(body, path);
    }).toThrow('Expected object in body.');
  });

  test('valid body', () => {
    const path = '/api/ghost/dev/users';
    const body = [{ name: 'Tommy' }];

    validateBody(body, path);
  });

  test('valid body', () => {
    const path = '/api/ghost/dev/users/userId';
    const body = { name: 'Tommy' };

    validateBody(body, path);
  });
});
