const request = require('./requests');

const Collections = (apiKey) => ({
  index() {
    const options = {
      url: 'https://api.getpostman.com/collections',
      method: 'get',
    }
    return request(apiKey, options);
  },
  show(collection_id) {
    const options = {
      url: `https://api.getpostman.com/collections/${collection_id}`,
      method: 'get',
    }
    return request(apiKey, options);
  },
});

module.exports = Collections;