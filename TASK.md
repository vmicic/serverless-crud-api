This API is about dealing with custom entities within an environment. It should work as a [Lambda function](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html).

> Note: localhost here is just example, it should work both locally and as Lambda URL

Data is saved to local MongoDB instance, but on Lambda it can be saved to any remote MongoDB. If you need one please let me know.

Path is constructed as: localhost:port/api/{user}/{env}/{entities}+

In this iteration we will not have auth implemented, we will have default user and you can call it whatever you like. Maybe "ghost".

## Create user environments

To create user environments make PUT request to the root of API:

```js
const makeEnvironment = await fetch(
  'http://localhost:3000/api/ghost',
  { method: 'PUT' },
  { body: 'dev' }  // can be anything, usually it's dev, prd, test, stg
);
```

When environment is created, access it with: `http://localhost:3000/api/ghost/dev` 

Returns empty object at first: `{}`

## Entities

When environment is created you can add entities. They are defined by `{ NAME: [{}, {}, {}] }`:

```js
const users = {
  "users": [{
      name: 'Jane',
      age: 38,
    }, {
      name: 'Tom',
      age: 39,
  }]
};
const addUsers = fetch(
  'http://localhost:3000/api/ghost/dev', // for example in an environment called `dev`
  { method: 'PUT' },
  { body: users },
);
```

Now they are accessible: `GET http://localhost:3000/api/ghost/dev/users`.

To add to existing entity, for example using `curl` this time, instead of naming the entity just send an array:

`curl -X PUT '[{ "name": "Marry", "age": 25 }]' localhost:3000/api/ghost/dev/users`

#### If you send an object instead of an array...

```js
const shirt = {
  size: 'XL',
  quantity: 9999,
  quality: 4.8,
};
const addShirt = fetch(
  'http://localhost:3000/api/ghost/dev/shirts', // assume we already have an entity called `shirts`
  { method: 'PUT' },
  { body: shirt },
);
```

Now if you do a request:

`curl http://localhost:3000/api/ghost/dev/shirts`

You'll get:

```js
{
  "shirts": {
    "size": "XL",
    "quantity": 9999,
    "quality": 4.8,
  }
}
```

This is obviously not what we needed if we wanted to create an entity, so that's why you need to send an array even though it is an array of one item.

Of course it is acceptable to send an object but it is meant to extend entities (other objects).

For example we have a `songs` entity, and we want to extend a song with metadata:

```js
{
  "songs": [{
    "__xid": 45678,
    "name": "Hey Jude",
    "artist": "The Beatles"
  }]
}
```

Now we want to add the following metadata:

`curl -X PUT '{ "metadata": { "added": 1607360962242, "length": "7:11", "format": "mp3" } }' -L localhost:3000/api/ghost/dev/songs/45678`

Then after request:

`curl localhost:3000/api/ghost/dev/songs/45678`

We get:

```js
{
  "songs": [{
    "__xid": 45678,
    "name": "Hey Jude",
    "artist": "The Beatles",
    "metadata": {
      "added": 1607360962242,
      "length": "7:11",
      "format": "mp3"
    }
  }]
}
```

Now we can query for metadata: `curl localhost:3000/api/ghost/dev/songs/45678/metadata`.

This is different than creating entities, since they represent a collection rather than a single object.

## Basic Usage

Every entity in mongo database will generate its identifier `__xid`. It's used for RESTful querying by identifier. Even if your entity has "id" property it won't be used as identifier. This is to avoid confusion which property will be treated as identifier.

For example, if you have this array in your database you can query it by:

1. `curl localhost:3000/api/ghost/dev/users`
1. `curl localhost:3000/api/ghost/dev/users/12345`
1. `curl localhost:3000/api/ghost/dev/users/12345/comments`
1. `curl localhost:3000/api/ghost/dev/users/12345/comments/890`

```js
{
  "users": [{
    "__xid": 12345,
    "name": "Jane",
    "age": 38,
    "comments": [{
      "__xid": 890,
      "time": 1607201337351,
      "comment": "First comment"
    }]
  }, {
    "__xid": 45678,
    "name": "Ken",
    "age": 40,
  }]
}
```

### Query by prop

1. `curl localhost:3000/api/ghost/dev/users?name=Ken`
1. `curl localhost:3000/api/ghost/dev/users?age=38`

### PUT vs POST

If you want to create entities you can use both PUT or POST. To replace an entity you would use PUT. PUT needs identifier to update an entity.

1. `curl -X PUT -d 'age=37' localhost:3000/api/ghost/dev/users/12345`
1. `curl -X PUT -d 'comment=Second comment' localhost:3000/api/ghost/dev/users/12345/comments/890`

### PATCH

PATCH will also update entity but with merge:

1. `curl -X PATCH -d 'age=37' localhost:3000/api/ghost/dev/users/12345`

### DELETE

DELETE will delete one or more entity based on the query. If query matches more than one entity, all will be deleted.

1. `curl -X DELETE localhost:3000/api/ghost/dev/users/12345`
1. `curl -X DELETE localhost:3000/api/ghost/dev/users?age=38` (all of them which have age=38)
1. `curl -X DELETE localhost:3000/api/ghost/dev/users/12345/name` (delete `name` prop)
1. `curl -X DELETE localhost:3000/api/ghost/dev/users` (this will delete the whole entity)
