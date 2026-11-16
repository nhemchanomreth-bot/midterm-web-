// (owner: Manil)
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const books = require('./books');
const members = require('./members');
const bus = require('../lib/events');
const send = require('../lib/send');

const resourcePath = '/loans';
const filePath = () => path.join(config.DATA_DIR, 'loans.json');

let cache = null; // in-memory copy of loans.json

async function load() {
  if (cache) return cache.slice();
  try {
    const rows = JSON.parse(await fs.readFile(filePath(), 'utf8'));
    if (!Array.isArray(rows)) throw new Error('loans.json must contain a JSON array');
    cache = rows;
    return cache.slice();
  } catch (error) {
    if (error.code === 'ENOENT') {
      cache = [];
      return [];
    }
    throw error;
  }
}

async function save(rows) {
  await fs.mkdir(config.DATA_DIR, { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(rows, null, 2) + '\n');
  cache = rows.slice();
}

async function nextId(rows) {
  await fs.mkdir(config.DATA_DIR, { recursive: true });
  const sequencePath = path.join(config.DATA_DIR, 'loans.json.sequence');
  let lastIssued = 0;
  try {
    lastIssued = Number(await fs.readFile(sequencePath, 'utf8')) || 0;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const id = Math.max(lastIssued, rows.reduce((highest, row) => Math.max(highest, row.id), 0)) + 1;
  await fs.writeFile(sequencePath, String(id), 'utf8');
  return id;
}

async function findById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;
  return (await load()).find(row => row.id === numericId) || null;
}

async function handle(req, res, parts, body) {
  const id = parts.length ? Number(parts[0]) : null;
  const isEndRoute = parts.length === 2 && parts[1] === 'end';
  if (parts.length && (!Number.isInteger(id) || id < 1)) return send(res, 404, { error: 'Loan not found' });
  const rows = await load();

  if (req.method === 'GET' && !parts.length) return send(res, 200, rows);
  if (req.method === 'POST' && !parts.length) {
    if (!Number.isInteger(body.itemId) || !Number.isInteger(body.personId)) return send(res, 400, { error: 'itemId and personId must be numbers' });
    if (!await books.findById(body.itemId)) return send(res, 400, { error: 'Book does not exist' });
    if (!await members.findById(body.personId)) return send(res, 400, { error: 'Member does not exist' });
    if (rows.some(row => row.itemId === body.itemId && row.endedAt === null)) return send(res, 409, { error: 'Book is already on loan' });
    const id = await nextId(rows);
    const loan = { id, itemId: body.itemId, personId: body.personId, startedAt: new Date().toISOString(), endedAt: null };
    rows.push(loan);
    await save(rows);
    bus.emit('created', { resource: 'loans', id });
    return send(res, 201, loan);
  }

  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', parts.length ? 'GET, PUT, DELETE' : 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  }
  if (parts.length > 1 && !isEndRoute) return send(res, 404, { error: 'Route not found' });
  const index = rows.findIndex(row => row.id === id);
  if (index < 0) return send(res, 404, { error: 'Loan not found' });
  if (req.method === 'GET' && !isEndRoute) return send(res, 200, rows[index]);
  if (req.method === 'PUT' && isEndRoute) {
    if (rows[index].endedAt !== null) return send(res, 409, { error: 'Loan has already ended' });
    rows[index] = { ...rows[index], endedAt: new Date().toISOString() };
    await save(rows);
    bus.emit('updated', { resource: 'loans', id });
    return send(res, 200, rows[index]);
  }
  if (req.method === 'DELETE' && !isEndRoute) {
    rows.splice(index, 1);
    await save(rows);
    bus.emit('deleted', { resource: 'loans', id });
    return send(res, 200, { deleted: id });
  }
  res.setHeader('Allow', isEndRoute ? 'PUT' : 'GET, DELETE');
  return send(res, 405, { error: 'Method not allowed' });
}

module.exports = { path: resourcePath, handle, findById, load };
