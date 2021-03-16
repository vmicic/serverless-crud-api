# serverless-crud-api

- `brew install node`
- `brew tap mongodb/brew`
- `brew install mongodb-community`
- `brew services start mongodb-community`
- `npm -g install serverless`


In project root:

- create .env file
- create env variable MONDODB_URI with local mongodb path as value
- `npm install`
- `sls offline`

### create/update requests:

- create environment:  
`curl --location --request PUT 'http://localhost:3000/dev/api/ghost' --header 'Content-Type: text/plain' --data-raw 'dev'`

- create entity:  
`curl --location --request PUT 'http://localhost:3000/dev/api/ghost/dev' --header 'Content-Type: application/json' --data-raw '{
    "users": [{
      "name": "Jacob",
      "age": 39
  }, {
      "name": "John",
      "age": 38
  }]
}'`

- update entity:  
`curl --location --request PUT 'http://localhost:3000/dev/api/ghost/dev/users/6024e2ef7a2360aa6522e9ef' --header 'Content-Type: application/json' --data-raw '{
    "name": "John"
}'`


- update entity with merge:  
`curl --location --request PATCH 'http://localhost:3000/dev/api/ghost/dev/users/6024e2ef7a2360aa6522e9ef' --header 'Content-Type: application/json' --data-raw '{"lastname": "Grant"}'`

- add entity members:  
`curl --location --request PUT 'http://localhost:3000/dev/api/ghost/dev/users' --header 'Content-Type: application/json' --data-raw '[
    {
        "name": "Jane",
        "age": 50
    },
    {
        "name": "Nicole",
        "lastname": "Porter"
    }
]'`


### get requests:

- get all environments:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/envs'`

- get environment:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev'`

- get all entities in environment:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/entities'`

- get nested entities in environment:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/entities/users/comments'`

- get an entity:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users'`

- get an entity with pagination:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users?page=1&per_page=3'`

- get entity with query params:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users?age=39'`

- get entity with multiple query params:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users?age=39&name=Jacob'`

- get a single entity:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users/6024e08dc57c6aa4cc60afd6'`

- get a entity field:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users/6024e76b7a2360aa6522ea01/posts'`


### delete requests:

- delete entity:  
`curl --location --request DELETE 'http://localhost:3000/dev/api/ghost/dev/users'`

- delete entity member:  
`curl --location --request DELETE 'http://localhost:3000/dev/api/ghost/dev/users/6024e6407a2360aa6522e9f7'`

- delete with query prop:  
`curl --location --request DELETE 'http://localhost:3000/dev/api/ghost/dev/users?name=Tom'`

- delete with multiple query prop:  
`curl --location --request DELETE 'http://localhost:3000/dev/api/ghost/dev/users?name=Tom&age=39'`

- delete entity field:  
`curl --location --request DELETE 'http://localhost:3000/dev/api/ghost/dev/users/6024e7057a2360aa6522e9fd/posts'`
