// resources/members.js - Members (PERSON) resource (owner: Phirom Sok)
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const bus = require('../lib/events');
const send = require('../lib/send');

const resourceName = 'members';
const resourcePath = '/members';
const filePath = () => path.join(config.DATA_DIR, 'members.json');
const sequencePath = () => path.join(config.DATA_DIR, 'members.json.sequence');

let cache = null; // in-memory copy of members.json

// Read the JSON file once. If it does not exist yet (ENOENT) start with an empty list.
async function loadData() {
  if (cache) return cache.slice();
  try {
    const data = JSON.parse(await fs.readFile(filePath(), 'utf8'));
    if (!Array.isArray(data)) throw new Error('members.json must contain a JSON array');
    cache = data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    cache = [];
  }
  return cache.slice();
}

// Write the list to the JSON file and refresh the cache.
async function saveData(records) {
  await fs.mkdir(config.DATA_DIR, { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(records, null, 2) + '\n');
  cache = records.slice();
}

// Persistent counter: ids are never reused, even after deletes and restarts.
async function nextId(records) {
  await fs.mkdir(config.DATA_DIR, { recursive: true });
  let lastIssued = 0;
  try {
    lastIssued = Number(await fs.readFile(sequencePath(), 'utf8')) || 0;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const highest = records.reduce((max, row) => Math.max(max, row.id), 0);
  const id = Math.max(lastIssued, highest) + 1;
  await fs.writeFile(sequencePath(), String(id), 'utf8');
  return id;
}

// Used by loans.js to check that a record exists.
async function findById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return null;
  return (await loadData()).find(record => record.id === numericId) || null;
}

function validName(body) {
  return typeof body.name === 'string' && body.name.trim() !== '';
}

async function handle(req, res, parts, body) {
  const hasId = parts.length >= 1;
  const id = hasId ? Number(parts[0]) : null;
  if (hasId && (!Number.isInteger(id) || id < 1 || parts.length > 1)) {
    return send(res, 404, { error: 'Record not found' });
  }
  const records = await loadData();

  // GET /members
  if (req.method === 'GET' && !hasId) return send(res, 200, records);

  // POST /members
  if (req.method === 'POST' && !hasId) {
    if (!validName(body)) return send(res, 400, { error: 'name is required' });
    const newId = await nextId(records);
    const record = { id: newId, name: body.name.trim() };
    if (body.phone !== undefined) record.phone = body.phone;
    records.push(record);
    await saveData(records);
    bus.emit('created', { resource: resourceName, id: newId });
    return send(res, 201, record);
  }

  if (!['GET', 'PUT', 'DELETE'].includes(req.method) || !hasId) {
    res.setHeader('Allow', hasId ? 'GET, PUT, DELETE' : 'GET, POST');
    return send(res, 405, { error: 'Method not allowed' });
  }

  const index = records.findIndex(record => record.id === id);
  if (index < 0) return send(res, 404, { error: 'Record not found' });

  // GET /members/:id
  if (req.method === 'GET') return send(res, 200, records[index]);

  // PUT /members/:id
  if (req.method === 'PUT') {
    if (!validName(body)) return send(res, 400, { error: 'name is required' });
    const updated = { ...records[index], name: body.name.trim() };
    if (body.phone !== undefined) updated.phone = body.phone;
    records[index] = updated;
    await saveData(records);
    bus.emit('updated', { resource: resourceName, id });
    return send(res, 200, updated);
  }

  // DELETE /members/:id
  records.splice(index, 1);
  await saveData(records);
  bus.emit('deleted', { resource: resourceName, id });
  return send(res, 200, { deleted: id });
}

module.exports = { path: resourcePath, handle, findById, load: loadData };
