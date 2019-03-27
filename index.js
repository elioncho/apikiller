require('dotenv').config();

const _ = require('lodash');
const inquirer = require('inquirer');
const request = require('request');
const requestPromise = require('request-promise');

const Postman = require('./postman/index');

const { POSTMAN_API_KEY } = process.env;

const postmanClient = Postman(POSTMAN_API_KEY);

const EXECUTION_STATES = {
  sleep: 'sleep',
  running: 'running',
  complete: 'complete'
}

const Result = () => {
  const responses = [];
  let errors = 0;
  const success = (response) => {
    const savedResponse = _.find(responses, (element) => element.statusCode == response.statusCode);
    if (_.isEmpty(savedResponse)) {
      responses.push({
        statusCode: response.statusCode,
        numberOfResponses: 1,
      })
    } else savedResponse.numberOfResponses += 1;
  };
  const fail = () => errors += 1;
  const show = () => ({ responses: responses, errors: errors });
  return { fail, show, success, };
};

const Execution = (requestsPerSecond, options, result) => {
  let state = EXECUTION_STATES.sleep;
  const requests = [];
  const isComplete = () => state == EXECUTION_STATES.complete;
  const complete = () => state = EXECUTION_STATES.complete;
  const run = () => state = EXECUTION_STATES.running;
  for (let i = 0; i < requestsPerSecond; i++) {
    requests.push(
      requestPromise(options)
        .then((response) => result.success(response))
        .catch((error) => result.fail())
    );
  }
  const start = (callback) => {
    run();
    return Promise.all(requests)
      .then(() => complete())
      .then(() => callback());
  };
  return { isComplete, start, }
}

function doRequests(executionTime, requestsPerSecond, endpointData) {
  const executions = [];
  const params = {
    url: endpointData.request.url.raw,
    method: endpointData.request.method,
    headers: endpointData.request.header,
    body: endpointData.request.body,
    json: true,
    time: true,
    timeout: 5000,
    resolveWithFullResponse: true,
    simple: false,
  }; 

  const result = Result();
  for (let i = 0; i < executionTime; i++) {
    const execution = Execution(requestsPerSecond, params, result);
    executions.push(execution);
  }

  const isComplete = (element, index, array) => element.isComplete();

  let timeInterval = 0;
  const interval = setInterval(() => {
    const execution = executions[timeInterval];
    execution.start(() => {
      if (executions.every(isComplete)) return console.log(result.show());
    });
    if (++timeInterval == executionTime) clearInterval(interval);
  }, 1000);
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
            return doRequests(executionTime, requestsPerSecond, endpointData);
          })
        })
      })
    })
  })