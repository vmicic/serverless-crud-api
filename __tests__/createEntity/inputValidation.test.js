/* eslint-disable operator-linebreak */
const {
  parseJson,
  validateBodyWithoutSchema,
  validateBodyWithSchema,
  validateProperties,
  validateInput,
} = require('../../functions/createEntity/inputValidation');

test('parse json invalid str', () => {
  const str =
    '"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}],"moreUser":[]}';
  expect(() => {
    parseJson(str);
  }).toThrow('Invalid body.');
});

test('parse json without problems', () => {
  const str =
    '{"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}]}';
  parseJson(str);
});

test('validate body without schema, provided object insted of array', () => {
  const body = { name: 'john' };

  expect(() => {
    validateBodyWithoutSchema(body);
  }).toThrow(
    'Please provide entity with this structure { NAME: [{}, {}, {}] }',
  );
});

test('validate body without schema, no errors', () => {
  const body = { users: [{ name: 'john' }, { name: 'michael' }] };

  validateBodyWithoutSchema(body);
});

test('validate body with schema, no meta in body', () => {
  const body = { users: [{ name: 'john' }, { name: 'michael' }], neta: {} };

  expect(() => {
    validateBodyWithSchema(body);
  }).toThrow('Property __meta has to be in body.');
});

test('validate body with schema, type in meta but false', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { type: false },
  };

  expect(() => {
    validateBodyWithSchema(body);
  }).toThrow('Property __meta is invalid.');
});

test('validate body with schema, force in meta but false', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { force: false },
  };

  expect(() => {
    validateBodyWithSchema(body);
  }).toThrow('Property __meta is invalid.');
});

test('validate body with schema, type in meta, no error', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { type: true },
  };

  validateBodyWithSchema(body);
});

test('validate body with schema, force in meta, no error', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { force: true },
  };

  validateBodyWithSchema(body);
});

test('validate properties, body keys length not valid', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { type: true },
    extra: {},
  };

  expect(() => {
    validateProperties(body);
  }).toThrow('Invalid body.');
});

test('validate properties, body keys length not valid', () => {
  const body = {};

  expect(() => {
    validateProperties(body);
  }).toThrow('Invalid body.');
});

test('validate properties, provided object insted of array', () => {
  const body = { name: 'john' };

  expect(() => {
    validateProperties(body);
  }).toThrow(
    'Please provide entity with this structure { NAME: [{}, {}, {}] }',
  );
});

test('validate properties, no errors', () => {
  const body = { users: [{ name: 'john' }, { name: 'michael' }] };

  validateProperties(body);
});

test('validate properties, no meta in body', () => {
  const body = { users: [{ name: 'john' }, { name: 'michael' }], neta: {} };

  expect(() => {
    validateProperties(body);
  }).toThrow('Property __meta has to be in body.');
});

test('validate properties, type in meta but false', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { type: false },
  };

  expect(() => {
    validateProperties(body);
  }).toThrow('Property __meta is invalid.');
});

test('validate properties, force in meta but false', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { force: false },
  };

  expect(() => {
    validateProperties(body);
  }).toThrow('Property __meta is invalid.');
});

test('validate properties, type in meta, no error', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { type: true },
  };

  validateProperties(body);
});

test('validate properties, force in meta, no error', () => {
  const body = {
    users: [{ name: 'john' }, { name: 'michael' }],
    __meta: { force: true },
  };

  validateProperties(body);
});

test('validate input, invalid str', () => {
  const str =
    '"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}],"moreUser":[]}';
  const event = { body: str };
  expect(() => {
    validateInput(event);
  }).toThrow('Invalid body.');
});

test('validate input without problems', () => {
  const str =
    '{"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}]}';
  const event = { body: str };
  validateInput(event);
});

test('validate input, provided object insted of array', () => {
  const event = { body: '{"name":"john"}' };

  expect(() => {
    validateInput(event);
  }).toThrow(
    'Please provide entity with this structure { NAME: [{}, {}, {}] }',
  );
});

test('validate input, no errors', () => {
  const event = {
    body:
      '{"users":[{"name":"Rom","age":39},{"name":"Mark","age":39},{"name":"John","age":38}]}',
  };

  validateInput(event);
});

test('validate input, no meta in body', () => {
  const event = {
    body:
      '{ "users": [{ "name": "john" }, { "name": "michael" }], "neta": {} }',
  };

  expect(() => {
    validateInput(event);
  }).toThrow('Property __meta has to be in body.');
});

test('validate input, type in meta but false', () => {
  const event = {
    body:
      '{ "users": [{ "name": "john" }, { "name": "michael" }], "__meta": {"type": false} }',
  };

  expect(() => {
    validateInput(event);
  }).toThrow('Property __meta is invalid.');
});

test('validate input, force in meta but false', () => {
  const event = {
    body:
      '{ "users": [{ "name": "john" }, { "name": "michael" }], "__meta": {"force": false} }',
  };

  expect(() => {
    validateInput(event);
  }).toThrow('Property __meta is invalid.');
});

test('validate input, type in meta but false', () => {
  const event = {
    body:
      '{ "users": [{ "name": "john" }, { "name": "michael" }], "__meta": {"type": true} }',
  };

  validateInput(event);
});

test('validate input, type in meta but false', () => {
  const event = {
    body:
      '{ "users": [{ "name": "john" }, { "name": "michael" }], "__meta": {"force": true} }',
  };

  validateInput(event);
});

test('validate input, body keys length not valid', () => {
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

test('validate input, body keys length not valid', () => {
  const event = { body: JSON.stringify({}) };

  expect(() => {
    validateInput(event);
  }).toThrow('Invalid body.');
});

test('validate input, provided object insted of array', () => {
  const event = { body: JSON.stringify({ name: 'john' }) };

  expect(() => {
    validateProperties(event);
  }).toThrow(
    'Please provide entity with this structure { NAME: [{}, {}, {}] }',
  );
});

test('validate input, no errors', () => {
  const event = {
    body: JSON.stringify({ users: [{ name: 'john' }, { name: 'michael' }] }),
  };

  validateInput(event);
});

test('validate input, no meta in body', () => {
  const event = {
    body: JSON.stringify({
      users: [{ name: 'john' }, { name: 'michael' }],
      neta: {},
    }),
  };

  expect(() => {
    validateInput(event);
  }).toThrow('Property __meta has to be in body.');
});

test('validate input, type in meta but false', () => {
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

test('validate input, force in meta but false', () => {
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

test('validate input, type in meta, no error', () => {
  const event = {
    body: JSON.stringify({
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { type: true },
    }),
  };

  validateInput(event);
});

test('validate input, force in meta, no error', () => {
  const event = {
    body: JSON.stringify({
      users: [{ name: 'john' }, { name: 'michael' }],
      __meta: { force: true },
    }),
  };

  validateInput(event);
});
