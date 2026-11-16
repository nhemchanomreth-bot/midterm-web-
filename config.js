const path = require('path');
const fs = require('fs');

try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  LOG_FILE: process.env.LOG_FILE || path.join(__dirname, 'activity.log'),
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, 'data')
};
