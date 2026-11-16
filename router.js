// Routing logic by Omareth.
const send = require('./lib/send');
const readBody = require('./lib/body');
const resources = [
  require('./resources/books'),
  require('./resources/members'),
  require('./resources/loans')
];

async function route(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, { error: 'Invalid URL' });
  }
  if (pathname === '/') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return send(res, 405, { error: 'Method not allowed' });
    }
    return send(res, 200, { message: 'Library API', resources: resources.map(resource => resource.path) });
  }
  const resource = resources.find(item => pathname === item.path || pathname.startsWith(item.path + '/'));
  if (!resource) return send(res, 404, { error: 'Route not found' });
  try {
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
    const suffix = pathname.slice(resource.path.length).split('/').filter(Boolean);
    return await resource.handle(req, res, suffix, body);
  } catch (error) {
    if (error.statusCode) return send(res, error.statusCode, { error: error.message });
    console.error(error);
    return send(res, 500, { error: 'Internal server error' });
  }
}

module.exports = route;
