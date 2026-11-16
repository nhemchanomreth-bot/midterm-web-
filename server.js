// Core setup by Omareth
const http = require('http');
const config = require('./config');
require('./activity');
const router = require('./router');
const send = require('./lib/send');

const resources = [
  require('./resources/books'),
  require('./resources/members'),
  require('./resources/loans')
];

const server = http.createServer((req, res) => {
  router(req, res).catch(error => {
    console.error(error);
    if (!res.headersSent) send(res, 500, { error: 'Internal server error' });
    else res.destroy();
  });
});

// Pre-load every data file into memory before accepting requests
Promise.all(resources.map(resource => resource.load()))
  .then(() => server.listen(config.PORT, () => console.log(`Library API listening on port ${config.PORT}`)))
  .catch(error => {
    console.error('Could not load data files:', error);
    process.exit(1);
  });
