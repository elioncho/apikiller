require('dotenv').config();

const _ = require('lodash');
const inquirer = require('inquirer');
const request = require('request');

const Postman = require('./postman/index');

const { POSTMAN_API_KEY } = process.env;

const postmanClient = Postman(POSTMAN_API_KEY);

function doRequests(executionTime, requestsPerSecond, endpointData) {
  const result = {
    executionTime: executionTime,
    requestsPerSecond: requestsPerSecond,
    totalNumberOfRequests: executionTime * requestsPerSecond,
    responses: [],
    errors: 0
  };
  let number_of_intervals = 0;
  const add = (response, options) => {
    if (response) {
      const savedResponse = _.find(result.responses, (element) => { 
        return element.statusCode == element.statusCode;
      });
      if (_.isEmpty(savedResponse)) {
        result.responses.push({
          statusCode: response.statusCode,
          numberOfResponses: 1,
        })
      } else {
        savedResponse.numberOfResponses += 1;
      }
    } else {
      result.errors += 1;
    }
  }
  const requestParams = (endpointData) => ({
    url: endpointData.request.url.raw,
    method: endpointData.request.method,
    headers: endpointData.request.header,
    body: endpointData.request.body,
    json: true,
    time: true,
    timeout: 5000,
  })
  const start = () => {
    return new Promise((resolve, reject) => {
      const requestPromises = [];
      for (let i = 0; i < requestsPerSecond; i++) {
        requestPromises.push(
          new Promise((resolve, reject) => {
            const options = requestParams(endpointData);
            request(options, function(error, response, body) {
              add(response, options);
              resolve();
            });
          })
        );
      }
      Promise.all(requestPromises).then(() => {
        resolve();
      });
    })
  };
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      start().then(() => {
        if (++number_of_intervals == executionTime) {
          clearInterval(interval);
          resolve(result);
        }
      })
    }, 1000);
  })
}

postmanClient.collections.index()
  .then((response) => {
    const collections = response.collections.reduce((accumulator, currentValue) => {
      accumulator.push({ name: currentValue.name, value: currentValue.id });
      return accumulator;
    }, []);
    return inquirer.prompt([{
      type: 'list',
      name: 'collectionId',
      message: 'Select a collection...',
      choices: collections,
    }])
    .then((answers) => postmanClient.collections.show(answers.collectionId))
    .then((response) => {
      const endpoints = response.collection.item.reduce((accumulator, currentValue, currentIndex) => {
        accumulator.push({ name: currentValue.name, value: currentIndex });
        return accumulator;
      }, []);
      return inquirer.prompt([{
        type: 'list',
        name: 'index',
        message: 'Select an endpoint...',
        choices: endpoints,
      }])
      .then((answers) => {
        const index = answers.index;
        const endpointData = response.collection.item[index];
        return inquirer.prompt([{
          type: 'number',
          name: 'requestsPerSecond',
          message: 'How many requests per seconds?',
        }])
        .then((answers) => {
          const requestsPerSecond = answers.requestsPerSecond;
          return inquirer.prompt([{
            type: 'number',
            name: 'executionTime',
            message: 'For how much time (in seconds)?',
          }])
          .then((answers) => {
            const executionTime = answers.executionTime;
            return doRequests(executionTime, requestsPerSecond, endpointData)
              .then((response) => {
                console.log(response);
              })
          })
        })
      })
    })
  })