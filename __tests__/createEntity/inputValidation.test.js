/* eslint-disable operator-linebreak */
const {
  parseJson,
  validateBodyWithoutSchema,
  validateBodyWithSchema,
  validateProperties,
  validateInput,
} = require('../../functions/createEntity/inputValidation');

describe('parse json', () => {
  test('invalid str', () => {
    const str =
      '"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}],"moreUser":[]}';
    expect(() => {
      parseJson(str);
    }).toThrow('Invalid body.');
  });

  test('no errors', () => {
    const str =
      '{"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}]}';
    parseJson(str);
  });
});

describe('validate body without schema', () => {
  test('provided object insted of array', () => {
    const body = { name: 'john' };

    expect(() => {
      validateBodyWithoutSchema(body);
    }).toThrow(
      'Please provide entity with this structure { NAME: [{}, {}, {}] }',
    );
  });

  test('no errors', () => {
    const body = { users: [{ name: 'john' }, { name: 'michael' }] };

    validateBodyWithoutSchema(body);
  });
});

describe('validate body with schema', () => {
  test('no meta in body', () => {
    const body = { users: [{ name: 'john' }, { name: 'michael' }], neta: {} };

    expect(() => {
      validateBodyWithSchema(body);
    }).toThrow('Invalid body.');
  });

  test('type in meta but false', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { type: false },
    };

    expect(() => {
      validateBodyWithSchema(body);
    }).toThrow('Property __meta is invalid.');
  });

  test('type in meta, no error', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { type: true },
    };

    validateBodyWithSchema(body);
  });

  test('force in meta but false', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { force: false },
    };

    expect(() => {
      validateBodyWithSchema(body);
    }).toThrow('Property __meta is invalid.');
  });

  test('force in meta, no error', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { force: true },
    };

    validateBodyWithSchema(body);
  });
  test('two keys in meta property', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { force: true, type: true },
    };

    expect(() => {
      validateBodyWithSchema(body);
    }).toThrow('Properties in __meta are invalid.');
  });
});

describe('validate properties', () => {
  test('body keys length not valid', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { type: true },
      extra: {},
    };

    expect(() => {
      validateProperties(body);
    }).toThrow('Invalid body.');
  });

  test('body keys length not valid', () => {
    const body = {};

    expect(() => {
      validateProperties(body);
    }).toThrow('Invalid body.');
  });

  test('provided object insted of array', () => {
    const body = { name: 'john' };

    expect(() => {
      validateProperties(body);
    }).toThrow(
      'Please provide entity with this structure { NAME: [{}, {}, {}] }',
    );
  });

  test('no errors', () => {
    const body = { users: [{ name: 'john' }, { name: 'michael' }] };

    validateProperties(body);
  });

  test('no meta in body', () => {
    const body = { users: [{ name: 'john' }, { name: 'michael' }], neta: {} };

    expect(() => {
      validateProperties(body);
    }).toThrow('Invalid body.');
  });

  test('type in meta but false', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { type: false },
    };

    expect(() => {
      validateProperties(body);
    }).toThrow('Property __meta is invalid.');
  });

  test('force in meta but false', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { force: false },
    };

    expect(() => {
      validateProperties(body);
    }).toThrow('Property __meta is invalid.');
  });

  test('type in meta, no error', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { type: true },
    };

    validateProperties(body);
  });

  test('force in meta, no error', () => {
    const body = {
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { force: true },
    };

    validateProperties(body);
  });
});

describe('validate input', () => {
  test('invalid str', () => {
    const str =
      '"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}],"moreUser":[]}';
    const event = { body: str };
    expect(() => {
      validateInput(event);
    }).toThrow('Invalid body.');
  });

  test('body keys length not valid', () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { type: true },
        extra: {},
      }),
    };

    expect(() => {
      validateInput(event);
    }).toThrow('Invalid body.');
  });

  test('body keys length not valid', () => {
    const event = { body: JSON.stringify({}) };

    expect(() => {
      validateInput(event);
    }).toThrow('Invalid body.');
  });

  test('provided object insted of array', () => {
    const event = { body: JSON.stringify({ name: 'john' }) };

    expect(() => {
      validateProperties(event);
    }).toThrow(
      'Please provide entity with this structure { NAME: [{}, {}, {}] }',
    );
  });

  test('no errors', () => {
    const event = {
      body: JSON.stringify({ users: [{ name: 'john' }, { name: 'michael' }] }),
    };

    validateInput(event);
  });

  test('type in meta but false', () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { type: false },
      }),
    };

    expect(() => {
      validateInput(event);
    }).toThrow('Property __meta is invalid.');
  });

  test('force in meta but false', () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { force: false },
      }),
    };

    expect(() => {
      validateInput(event);
    }).toThrow('Property __meta is invalid.');
  });

  test('type in meta, no error', () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { type: true },
      }),
    };

    validateInput(event);
  });

  test('force in meta, no error', () => {
    const event = {
      body: JSON.stringify({
        users: [{ name: 'john' }, { name: 'michael' }],
        __meta: { force: true },
      }),
    };

    validateInput(event);
  });
});
