require('dotenv').config();

const AWS = require('aws-sdk');
const Sequelize = require('sequelize');
const request = require('request');
const util = require('util');
const interval = require('interval-promise');

const { AWS_SECRET_KEY, AWS_ACCESS_KEY, AWS_REGION, AWS_TOPIC_ARN, DATABASE_URL } = process.env;

const sns = new AWS.SNS({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: AWS_REGION,
});

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: true,
  }
});

const Collection = sequelize.define('collections', {
  id: {
    primaryKey: true, 
    type: Sequelize.BIGINT,
  },
  data: {
    type: Sequelize.JSONB,
  }
}, {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}
);

const Execution = sequelize.define('executions', {
    id: {
      primaryKey: true, 
      type: Sequelize.BIGINT
    },
    collection_id: {
      type: Sequelize.BIGINT,
    },
    execution_time: {
      type: Sequelize.INTEGER
    },
    requests_per_second: {
      type: Sequelize.INTEGER
    },
    result: {
      type: Sequelize.JSONB
    }
  }, {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

function doRequests(executionTime, requestsPerSecond, data) {
  const result = [];
  let number_of_intervals = 0;
  const add = (response, options) => {
    const endpoint = result.find(o => o.url == options.url);
    if (endpoint) {
      if (!response) {
        endpoint.errors += 1;
      }
      else {
        const statusCode = endpoint.responses.find(o => o.status_code == response.statusCode);
        if (statusCode) {
          statusCode.number_of_requests += 1;
          statusCode.elapsed_time += response.elapsedTime;
        } else {
          result[url].responses.push({
            status_code: response.statusCode,
            number_of_requests: 1,
            elapsed_time: response.elapsedTime,
          });
        }
      }
    } else {
      result.push({
        url: options.url,
        errors: 0,
        responses: [{
          status_code: response.statusCode,
          number_of_requests: 1,
          elapsed_time: response.elapsedTime,
        }]
      })
    }
  }
  const requestParams = (endpoint) => {
    return {
      url: endpoint.request.url.raw,
      method: endpoint.request.method,
      headers: endpoint.request.header,
      body: endpoint.request.body,
      json: true,
      time: true,
      timeout: 5000,
    };
  }
  const start = () => {
    return new Promise((resolve, reject) => {
      const requestPromises = []
      for (let i = 0; i < requestsPerSecond; i++) {
        requestPromises.push(
          new Promise((resolve, reject) => {
            const endpoint = data[Math.floor(Math.random() * data.length)];
            const options = requestParams(endpoint);
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

const executionId = parseInt(process.argv.slice(2));

Execution.findById(executionId).then(execution => {
  const requestsPerSecond = execution.get('requests_per_second');
  const executionTime = execution.get('execution_time');
  const collectionId = execution.get('collection_id');
  Collection.findById(collectionId).then(collection => {
    const data = JSON.parse(collection.get('data'));
    console.log('execution_time', executionTime);
    console.log('requests_per_second', requestsPerSecond);
    doRequests(executionTime, requestsPerSecond, data).then((result) => {
      console.log(util.inspect(result, { showHidden: false, depth: null }));
      const params = {
        Message: JSON.stringify(result),
        TopicArn: AWS_TOPIC_ARN,
        Subject: executionId.toString(),
      };
      sns.publish(params, (err, data) => {
        if (err) console.log(err, err.stack);
        else console.log(data);
      });
    })
  });
});
