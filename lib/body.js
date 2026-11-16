const MAX_BYTES = 1024 * 1024; // 1MB limit against DoS

// Remove keys that could pollute Object.prototype
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    delete value.__proto__;
    delete value.constructor;
    delete value.prototype;
    for (const key of Object.keys(value)) value[key] = sanitize(value[key]);
  }
  return value;
}

module.exports = function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', chunk => {
      if (tooLarge) return; // keep draining, but stop storing
      size += chunk.length;
      if (size > MAX_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        const error = new Error('Request body is too large');
        error.statusCode = 413;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try {
        const data = sanitize(JSON.parse(raw));
        if (data === null || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object');
        resolve(data);
      } catch {
        const error = new Error('Request body must be a valid JSON object');
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
};
