// Final review by Omareth
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const bus = require('./lib/events');

for (const eventName of ['created', 'updated', 'deleted']) {
  bus.on(eventName, async ({ resource, id }) => {
    try {
      await fs.mkdir(path.dirname(config.LOG_FILE), { recursive: true });
      const line = `${new Date().toISOString()} ${eventName} ${resource} #${id}\n`;
      await fs.appendFile(config.LOG_FILE, line, 'utf8');
    } catch (error) {
      console.error('Could not write activity log:', error);
    }
  });
}
