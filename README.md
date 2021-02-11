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

# requests:

- create environment:  
`curl --location --request PUT 'http://localhost:3000/dev/api/ghost' --header 'Content-Type: text/plain' --data-raw 'dev'`


- get environment:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev'`

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

- get an entity:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users' --header 'Content-Type: application/json' --data-raw '{"age": 10}'`

- get entity with query params:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users?age=39'`

- get entity with multiple query params:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users?age=39&name=Jacob'`

- get a single entity:  
`curl --location --request GET 'http://localhost:3000/dev/api/ghost/dev/users/6024e08dc57c6aa4cc60afd6'`
