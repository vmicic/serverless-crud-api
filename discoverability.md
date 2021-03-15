## Discoverability

Service uses its own implementation of [HATEOAS](https://en.wikipedia.org/wiki/HATEOAS) so that end users can easily query and traverse through entities.

This page explains entity discoverability. If you want to know about API discoverability, i.e. how anyone can learn about your API without having any docs for it, check out API Docs.

For example:

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
The request:

1. `curl -L localhost:3000/ghost/dev/users/12345`

The response:

```js
{
  "__xid": 12345,
  "name": "Jane",
  "age": 38,
  "__embedded": {
    "self": "/users/12345",
    "comments": "/users/12345/comments"
  }
}
```

Within response there is special `__embedded` property with which you can get path to sub-entities or path to entity itself or any other data depending on what you queried.

If you create another sub-entity (children) this will be automatically updated:

`curl -X PUT -d '{ "orders": [] }' -L localhost:3000/ghost/dev/users/12345`

Now we'll have richer `__embedded` with "orders":

The request:

`curl -L localhost:3000/ghost/dev/users/12345`

The response:

```js
{
  "__xid": 12345,
  "name": "Jane",
  "age": 38,
  "__embedded": {
    "self": "/users/12345",
    "comments": "/users/12345/comments",
    "orders": "/users/12345/orders"
  }
}
```

## API Docs

You don't need to write any documentation for your users. API Docs, aka API discoverability keeps documentation of your API dynamically maintained.

There are few fixed endpoints:

### /envs

```sh
curl -L localhost:3000/ghost/envs
```

This will give you response like:

```js
{
  "envs": ["dev", "prd", "test"]
}
```

### /entities

Entites are hierarchically structured, meaning you can target specific ones down the tree. For example in this request we have `users` and `repos` entities, each having deeper sub-entities.

```sh
curl -L localhost:3000/ghost/{env}/entities
```

```js
{
  "entities": [
    "users": [
      "comments",
      "orders"
    ],
    "repos": [
      "issues",
      "discussions",
      "commits",
      "settings": [
        "actions",
        "webhooks"
      ]
    ]
  ]
}
```


To get `settings` list you would send following request:

```sh
curl -L localhost:3000/ghost/{env}/entities/repos/settings
```

Response:

```js
{
  "entities": [
    "actions",
    "webhooks"
  ]
}
```

## Pagination

Discoverability extends to pagination of entities. Instead of getting total amount of entities, in this case `planets`, you can chunk them. Embedded results you'll get are:

1. `self` `[string]` Link to current page
1. `next` `[string | null]` Link to next page
1. `previous` `[string | null]` Link to previous page
1. `first` `[string]` Link to first page
1. `last` `[string]` Link to last page
1. `amount` `[number]` Number of current amount of entities
1. `current_page` `[number]` Current page number
1. `total` `[number]` Total amount of entities
1. `per_page` `[number]` How many entities per page

Pagination is constructed in the following format: `localhost:3000/ghost/{env}/{{entity}+}?page=[number]&per_page=[number]`

For example in `dev` environment:

1. Query 10 users per page: `localhost:3000/ghost/dev/users?page=1&per_page=10`
1. Query 30 user orders per page: `localhost:3000/ghost/dev/users/orders?page=1&per_page=30`

> Remember that results depend on how you set `per_page` parameter. All further results will depend on it.

### Examples

This example represents database of 8 planets which are paginated by 3.

```js
{
  "planets": [{
      name: "Mercury",
    }, {
      name: "Venus",
    }, {
      name: "Earth"
    }, {
      name: "Mars"
    }, {
      name: "Jupiter"
    }, {
      name: "Saturn"
    }, {
      name: "Uranus"
    }, {
      name: "Neptune"
  }]
}
```

Request first page, initiate pagination: `curl -L localhost:3000/ghost/dev/planets?page=1&per_page=3`

```js
{
  "planets": [{
      name: "Mercury",
    }, {
      name: "Venus",
    }, {
      name: "Earth",
  }],
  "__embedded": {
    self: "/planets?page=1&per_page=3",
    next: "/planets?page=2&per_page=3",
    first: "/planets?page=1&per_page=3",
    last: "/planets?page=3&per_page=3",
    amount: 3,
    current_page: 1,
    total: 8,
    per_page: 3,
  }
}
```

Second page: `curl -L localhost:3000/ghost/dev/planets?page=2&per_page=3`

```js
{
  "planets": [{
      name: "Mars",
    }, {
      name: "Jupiter",
    }, {
      name: "Saturn",
  }],
  "__embedded": {
    self: "/planets?page=2&per_page=3",
    next: "/planets?page=3&per_page=3",
    previous: "/planets?page=1&per_page=3",
    first: "/planets?page=1&per_page=3",
    last: "/planets?page=3&per_page=3",
    amount: 3,
    current_page: 2,
    total: 8,
    per_page: 3,
  }
}
```

Last, third page: `curl -L localhost:3000/ghost/dev/planets?page=3&per_page=3`

```js
{
  "planets": [{
      name: "Uranus",
    }, {
      name: "Neptune",
    }],
  "__embedded": {
    self: "/planets?page=3&per_page=3",
    previous: "/planets?page=2&per_page=3",
    first: "/planets?page=1&per_page=3",
    last: "/planets?page=3&per_page=3",
    amount: 2,
    current_page: 3,
    total: 8,
    per_page: 3,
  }
}
```
