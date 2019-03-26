const Collections = require('./collections');

const Postman = (apiKey) => {
  const collections = Collections(apiKey);
  return {
    collections,
  }
}

module.exports = Postman;