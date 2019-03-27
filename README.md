# Apikiller
Simpe and easy to use load testing tool for your Postman collections. Apikiller lets you perform load testing at any of your Postman Collection endpoints. You can configure the load test execution time and the amount of requests per second.

## Requirements

- [Node](https://nodejs.org/en/)

## Setup
```
git clone git@github.com:elioncho/apikiller.git
cd apikiller
npm install
cp .env.example .env
```

Set up your Postman Api Key in the .env file.
For more information on your Postman Api Key, click [here](https://docs.api.getpostman.com/?#intro).

## Running

```
node index.js
```

Follow the instructions prompted at you.
