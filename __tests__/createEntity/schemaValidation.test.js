const {
  validateFieldExistsInEntity,
  validateType,
  validateEntitiesWithSchema,
  validateNumberOfFields,
  ifFieldExistsInEntity,
  validateEntityAndGetNumberOfFields,
} = require('../../functions/createEntity/schemaValidation');

describe('validate field exists in schema', () => {
  test('exists', () => {
    const field = 'name';
    const entity = { name: 'John' };

    validateFieldExistsInEntity(field, entity);
  });

  test('doesnt exist', () => {
    const field = 'age';
    const entity = { name: 'John' };

    expect(() => {
      validateFieldExistsInEntity(field, entity);
    }).toThrow('Entity does not contain age field.');
  });
});

describe('validate number of fields', () => {
  test('more fields existing', () => {
    const entity = { name: 'john', rating: 5 };
    const expectedFieldsCount = 1;

    expect(() => {
      validateNumberOfFields(entity, expectedFieldsCount);
    });
  });

  test('no error', () => {
    const entity = { name: 'john', rating: 5 };
    const expectedFieldsCount = 2;

    expect(() => {
      validateNumberOfFields(entity, expectedFieldsCount);
    });
  });

  test('no error, array as field', () => {
    const entity = { name: 'john', ratings: [{ rating: 5 }] };
    const expectedFieldsCount = 2;

    expect(() => {
      validateNumberOfFields(entity, expectedFieldsCount);
    });
  });
});

describe('if field exists in entity no optional', () => {
  test('field doesnt exist', () => {
    const schemaFieldNameType = ['name', 'string'];
    const entity = { rating: 5 };

    expect(() => {
      ifFieldExistsInEntity(schemaFieldNameType, entity);
    }).toThrow('Entity does not contain name field');
  });

  test('field exist wrong type, no error', () => {
    const schemaFieldNameType = ['name', 'string'];
    const entity = { name: 5 };

    ifFieldExistsInEntity(schemaFieldNameType, entity);
  });

  test('field exist right type, no error', () => {
    const schemaFieldNameType = ['name', 'string'];
    const entity = { name: 'hello' };

    ifFieldExistsInEntity(schemaFieldNameType, entity);
  });

  test('field doesnt exists sub-entity', () => {
    const schemaFieldNameType = [
      'comments',
      { text: 'string', rating: 'number' },
    ];
    const entity = { name: 'hello' };

    expect(() => {
      ifFieldExistsInEntity(schemaFieldNameType, entity);
    }).toThrow('Entity does not contain comments field');
  });
});

describe('if field exists in entity, optional', () => {
  test('optional string field doesnt exist', () => {
    const schemaFieldNameType = ['name', 'string?'];
    const entity = { rating: 5 };

    ifFieldExistsInEntity(schemaFieldNameType, entity);
    const fieldExists = ifFieldExistsInEntity(schemaFieldNameType, entity);
    expect(fieldExists).toBeFalsy();
  });

  test('optional object field doesnt exist', () => {
    const schemaFieldNameType = ['name', 'object?'];
    const entity = { rating: 5 };

    ifFieldExistsInEntity(schemaFieldNameType, entity);
    const fieldExists = ifFieldExistsInEntity(schemaFieldNameType, entity);
    expect(fieldExists).toBeFalsy();
  });

  test('optional object field doesnt exist', () => {
    const schemaFieldNameType = ['name', 'object?'];
    const entity = { rating: 5 };

    const fieldExists = ifFieldExistsInEntity(schemaFieldNameType, entity);
    expect(fieldExists).toBeFalsy();
  });

  test('optional number field exist', () => {
    const schemaFieldNameType = ['rating', 'number?'];
    const entity = { rating: 5 };

    const fieldExists = ifFieldExistsInEntity(schemaFieldNameType, entity);
    expect(fieldExists).toBeTruthy();
  });
});

describe('validate type', () => {
  test('valid type', () => {
    const name = 'John';
    const fieldTypeInSchema = 'string';

    validateType(name, fieldTypeInSchema);
  });

  test('valid type array', () => {
    const friends = [{ name: 'John' }];
    const fieldTypeInSchema = 'array';

    validateType(friends, fieldTypeInSchema);
  });

  test('invalid, expect array got object', () => {
    const user = { name: 'John' };
    const fieldTypeInSchema = 'array';

    expect(() => {
      validateType(user, fieldTypeInSchema);
    }).toThrow('Expected array got object.');
  });

  test('invalid, expect number got objects', () => {
    const user = { name: 'John' };
    const fieldTypeInSchema = 'number';

    expect(() => {
      validateType(user, fieldTypeInSchema);
    }).toThrow('Expected number got object.');
  });

  test('invalid, expect number got string', () => {
    const name = 'John';
    const fieldTypeInSchema = 'number';

    expect(() => {
      validateType(name, fieldTypeInSchema);
    }).toThrow('Expected number got string.');
  });
});

describe('validate entity with schema no optional types', () => {
  test('number of keys dont match', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [{ name: 'John', age: 20, lastname: 'Robinson' }];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity contains fields not existing in schema.');
  });

  test('entity does not contain mandatory field', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [
      { name: 'John', age: 30 },
      { name: 'Michale', lastname: 'Thompson' },
    ];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity does not contain age field.');
  });

  test('field type mismatch', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [{ name: 'John', age: 'two' }];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Expected number got string.');
  });

  test('no error, no nested entities', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [{ name: 'John', age: 20 }];

    validateEntitiesWithSchema(entities, schema);
  });

  test('no error entity with properties with same name, no nested entities', () => {
    const schema = { name: 'string', age: 'number' };
    const entities = [
      { name: 'John', age: 20 },
      // eslint-disable-next-line no-dupe-keys
      { name: 'Michale', age: 20, name: 'Sebastian' },
    ];

    validateEntitiesWithSchema(entities, schema);
  });

  test('number of keys dont match, nested entities', () => {
    const schema = {
      name: 'string',
      comments: { text: 'string', rating: 'number' },
    };
    const entities = [
      { name: 'John', comments: [{ text: 'hello', rating: 5, reply: 'hey' }] },
    ];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity contains fields not existing in schema.');
  });

  test('field doesnt exist in schema, nested entities', () => {
    const schema = {
      name: 'string',
      comments: { text: 'string' },
    };
    const entities = [{ name: 'John', comments: [{ rating: 5 }] }];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity does not contain text field.');
  });

  test('field mismatch, nested entities', () => {
    const schema = { name: 'string', comments: { rating: 'number' } };
    const entities = [{ name: 'John', comments: [{ rating: 'hello' }] }];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Expected number got string.');
  });

  test('no error,  nested entities', () => {
    const schema = { name: 'string', comments: { text: 'string' } };
    const entities = [
      {
        name: 'John',
        comments: [{ text: 'hello' }, { text: 'this is comment' }],
      },
    ];

    validateEntitiesWithSchema(entities, schema);
  });
});

describe('validate entities with schema, optional fields', () => {
  test('number of fields dont match, more keys', () => {
    const schema = { name: 'string?', age: 'number' };
    const entities = [{ name: 'John', age: 20, lastname: 'Robinson' }];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity contains fields not existing in schema.');
  });

  test('entity doesnt contain mandatory field', () => {
    const schema = { name: 'string?', age: 'number' };
    const entities = [
      { name: 'John', age: 30 },
      { name: 'Michale', lastname: 'Thompson' },
    ];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity does not contain age field.');
  });
  test('field doesnt exist in schema', () => {
    const schema = { name: 'string?', age: 'number' };
    const entities = [
      { name: 'John', age: 30 },
      { name: 'Michale', lastname: 'Thompson', age: 20 },
    ];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity contains fields not existing in schema.');
  });
  test('field type mismatch', () => {
    const schema = { name: 'string?', age: 'number' };
    const entities = [{ name: 'John', age: 'two' }];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Expected number got string.');
  });

  test('no error, no nested entities', () => {
    const schema = { name: 'string?', age: 'number?' };
    const entities = [{ name: 'John', age: 20 }];

    validateEntitiesWithSchema(entities, schema);
  });
  test('field doesnt exist in schema, nested entities', () => {
    const schema = {
      name: 'string?',
      comments: { text: 'string' },
    };
    const entities = [{ name: 'John', comments: [{ rating: 5 }] }];

    expect(() => {
      validateEntitiesWithSchema(entities, schema);
    }).toThrow('Entity does not contain text field.');
  });
  test('no errors nested entities', () => {
    const schema = { name: 'string?', comments: { text: 'string?' } };
    const entities = [
      {
        name: 'John',
        comments: [{ text: 'hello' }, { text: 'this is comment' }],
      },
    ];

    validateEntitiesWithSchema(entities, schema);
  });
});

describe('validate entity and get number of fields, no optional fields', () => {
  test('invalid type, got string expected number', () => {
    const schema = { rating: 'number', name: 'string', male: 'boolean' };
    const entity = { rating: '2', name: 'John', male: true };

    expect(() => {
      validateEntityAndGetNumberOfFields(entity, schema);
    }).toThrow('Expected number got string.');
  });

  test('invalid type, got boolean expected object', () => {
    const schema = { rating: 'object', name: 'string', male: 'boolean' };
    const entity = { rating: true, name: 'John', male: true };

    expect(() => {
      validateEntityAndGetNumberOfFields(entity, schema);
    }).toThrow('Expected object got boolean.');
  });

  test('invalid type, got array expected string', () => {
    const schema = { rating: 'string', name: 'string', male: 'boolean' };
    const entity = { rating: [{ text: 'hello' }], name: 'John', male: true };

    expect(() => {
      validateEntityAndGetNumberOfFields(entity, schema);
    }).toThrow('Expected string got array.');
  });

  test('valid types', () => {
    const schema = { rating: 'string', name: 'string', male: 'boolean' };
    const entity = { rating: 'text', name: 'John', male: true };

    const fieldsCount = validateEntityAndGetNumberOfFields(entity, schema);
    expect(fieldsCount).toBe(3);
  });
});

describe('validate entity and get number of fields, optional fields', () => {
  test('invalid type, got string expected number', () => {
    const schema = { rating: 'number?', name: 'string', male: 'boolean' };
    const entity = { rating: '2', name: 'John', male: true };

    expect(() => {
      validateEntityAndGetNumberOfFields(entity, schema);
    }).toThrow('Expected number got string.');
  });

  test('invalid type, got boolean expected object', () => {
    const schema = { rating: 'object?', name: 'string', male: 'boolean' };
    const entity = { rating: true, name: 'John', male: true };

    expect(() => {
      validateEntityAndGetNumberOfFields(entity, schema);
    }).toThrow('Expected object got boolean.');
  });

  test('invalid type, got array expected string', () => {
    const schema = { rating: 'string?', name: 'string?', male: 'boolean' };
    const entity = { rating: [{ text: 'hello' }], name: 'John', male: true };

    expect(() => {
      validateEntityAndGetNumberOfFields(entity, schema);
    }).toThrow('Expected string got array.');
  });

  test('valid types, all existing', () => {
    const schema = { rating: 'string?', name: 'string', male: 'boolean' };
    const entity = { rating: 'text', name: 'John', male: true };

    const fieldsCount = validateEntityAndGetNumberOfFields(entity, schema);
    expect(fieldsCount).toBe(3);
  });

  test('valid types, one optional not existing', () => {
    const schema = { rating: 'string?', name: 'string?', male: 'boolean' };
    const entity = { rating: 'text', male: true };

    const fieldsCount = validateEntityAndGetNumberOfFields(entity, schema);
    expect(fieldsCount).toBe(2);
  });

  test('valid types, optional not existing', () => {
    const schema = { rating: 'string?', name: 'string?', male: 'boolean' };
    const entity = { male: true };

    const fieldsCount = validateEntityAndGetNumberOfFields(entity, schema);
    expect(fieldsCount).toBe(1);
  });
});
