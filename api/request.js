const MAX_REQUESTS = 500;
if (typeof global.requestsStore === 'undefined') global.requestsStore = [];
if (typeof global.totalRequestCount === 'undefined') global.totalRequestCount = 0;

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    global.totalRequestCount += 1;
    const payload = {
      ...body,
      request_number: global.totalRequestCount,
      id: body.id || Date.now().toString(36),
      at: body.at || new Date().toISOString(),
    };
    global.requestsStore.push(payload);
    if (global.requestsStore.length > MAX_REQUESTS) global.requestsStore.shift();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({
      ok: true,
      id: payload.id,
      request_number: global.totalRequestCount,
      total_requests: global.totalRequestCount,
    });
  } catch (e) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }
};
