## Type Definitions

We can type our entities.

If we want to have types, we send a following example request for an entity called `routes`:

`curl -L localhost:3000/ghost/dev`

```js
{
  "routes": {
    "from": "string",
    "to": "string",
    "duration": "number",
    "distance": "number",
    "active": "boolean",
  },
  "__meta": {
    "type": true
  }
}
```

If you save an entity with the following data for example:

```js
{
  "routes": [{
    "from": "Berlin",
    "to": "Hamburg",
    "duration": 106,
    "distance": 282,
    "active": true,
  }]
}
```

Upon creation, this endpoint is also available for you to get the latest type definition:

`curl -L localhost:3000/ghost/dev/routes/__describe`

```js
{
  "from": "string",
  "to": "string",
  "duration": "number",
  "distance": "number",
  "active": "boolean",
}
```

(Empty object if type doesn't exist)

Naturally, you can also get definitions of sub-types:

`curl -L localhost:3000/ghost/dev/users/comments/__describe`

```js
{
  "comment": "string",
  "time": "number"
}
```

### Handling mismatch

If an entity doesn't match with its already created type definition, for example:

```js
{
  "routes": [{
    "from": 123, // here is number instead of string
    "to": "Hamburg",
    "duration": 106,
    "distance": 282,
    "active": true,
  }]
}
```

We should get an error. (417 or 422 for exmaple)

We can force adding the entity though, by adding metadata to the payload:

```js
{
  "routes": [{
    "from": "Berlin",
    "to": "Hamburg",
    "duration": 106,
    "distance": 282,
    "active": true,
  }],
  "__meta": {
    "force": true,
  }
}
```

### Nested (N-dimensional) entities should also work

```js
{
  "users": {
    "name": "string",
    "bio": "string",
    "comments": {
      "content": "string",
      "meta": {
        "datetime": "number"
      }
    }
  }
}
```

### Limitations to consider

Probably it will be expensive to check for each one or N-dimensional nested entity for type checking, we should consider using [lenses](https://ramdajs.com/docs/#lensPath).
