const { spawn } = require('child_process');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const port = 3999;
const baseUrl = `http://127.0.0.1:${port}`;
const dataDir = path.join(os.tmpdir(), `library-api-check-${process.pid}`);
const checks = [];
let server;

function record(name, passed) {
  checks.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
}

async function startServer() {
  server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, LOG_FILE: path.join(dataDir, 'activity.log') },
    stdio: 'ignore'
  });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error('Server exited before becoming ready');
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server did not start on port 3999');
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await new Promise(resolve => server.once('exit', resolve));
}

async function request(method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function main() {
  await fs.rm(dataDir, { recursive: true, force: true });
  await startServer();

  const home = await request('GET', '/');
  record('GET / returns the API welcome', home.status === 200 && Array.isArray(home.body.resources));
  const empty = await request('GET', '/books');
  record('First run works without data files', empty.status === 200 && empty.body.length === 0);

  const badJson = await fetch(`${baseUrl}/books`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  record('Invalid JSON returns 400', badJson.status === 400);
  const missing = await request('GET', '/unknown');
  record('Unknown route returns 404', missing.status === 404);
  const unsupported = await request('PATCH', '/books');
  record('Unsupported method returns 405', unsupported.status === 405);

  const invalidBook = await request('POST', '/books', { name: '  ' });
  record('Book requires a non-empty name', invalidBook.status === 400);
  const book = await request('POST', '/books', { name: 'Dune', note: 'Science fiction' });
  record('Book can be created', book.status === 201 && book.body.id === 1);
  const member = await request('POST', '/members', { name: 'Ari', phone: '555-0100' });
  record('Member can be created', member.status === 201 && member.body.id === 1);
  const badLoan = await request('POST', '/loans', { itemId: 99, personId: member.body.id });
  record('Loan checks that the book exists', badLoan.status === 400);

  const loan = await request('POST', '/loans', { itemId: book.body.id, personId: member.body.id });
  record('Loan can be created', loan.status === 201 && loan.body.endedAt === null);
  const conflict = await request('POST', '/loans', { itemId: book.body.id, personId: member.body.id });
  record('Active book loan returns 409', conflict.status === 409);
  const ended = await request('PUT', `/loans/${loan.body.id}/end`);
  record('Loan can be ended', ended.status === 200 && ended.body.endedAt !== null);
  const secondLoan = await request('POST', '/loans', { itemId: book.body.id, personId: member.body.id });
  record('Book can be loaned again after return', secondLoan.status === 201);

  await stopServer();
  await startServer();
  const persisted = await request('GET', '/books/1');
  record('Records survive a server restart', persisted.status === 200 && persisted.body.name === 'Dune');
  await stopServer();
  await new Promise(resolve => setTimeout(resolve, 100));
  const activity = await fs.readFile(path.join(dataDir, 'activity.log'), 'utf8');
  record('Changes are written to activity.log', activity.includes('created books #1') && activity.includes('updated loans #1'));
}

main()
  .catch(error => {
    console.error('Self-check could not complete:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer();
    await fs.rm(dataDir, { recursive: true, force: true });
  })
  .then(() => {
    const failed = checks.filter(check => !check.passed);
    if (failed.length) process.exitCode = 1;
  });
