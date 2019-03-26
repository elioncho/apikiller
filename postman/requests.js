'use-strict';

const request = require('request-promise');

const buildOptions = (apiKey, params) => {
  return Object.assign(
    {},
    params, {
      headers: {
        'X-Api-Key': apiKey,
      },
      json: true,
    }
  );
};

const Requests = (apiKey, params) => {
  const options = buildOptions(apiKey, params);
  return request(options);
};

module.exports = Requests;