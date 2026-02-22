/**
 * Single handler for POST /api/request and GET /api/requests.
 * Uses in-memory store; if KV_REST_API_URL + KV_REST_API_TOKEN are set, uses Redis for persistence across Vercel instances.
 */
const MAX_REQUESTS = 500;
const STORE_KEY = 'concierge_store';
const store = { requests: [], totalRequestCount: 0 };

function parsePath(req) {
  const url = req.url || '';
  const pathname = url.split('?')[0] || '';
  const query = (url.split('?')[1] || '').split('&').reduce(function (o, p) {
    const kv = p.split('=');
    if (kv[0]) o[kv[0]] = decodeURIComponent(kv[1] || '');
    return o;
  }, {});
  return query.path || pathname.replace(/.*\//, '') || '';
}

function redisGet() {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) return Promise.resolve(null);
  const url = base.replace(/\/$/, '') + '/get/' + encodeURIComponent(STORE_KEY);
  return fetch(url, { headers: { Authorization: 'Bearer ' + token } })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      try {
        return data.result != null ? JSON.parse(data.result) : null;
      } catch (e) {
        return null;
      }
    })
    .catch(function () { return null; });
}

function redisSet(data) {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) return Promise.resolve();
  const url = base.replace(/\/$/, '') + '/set/' + encodeURIComponent(STORE_KEY);
  return fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'text/plain' },
    body: JSON.stringify(data),
  }).catch(function () {});
}

function getStore() {
  return redisGet().then(function (s) {
    if (s && Array.isArray(s.requests)) {
      store.requests = s.requests;
      store.totalRequestCount = s.totalRequestCount || 0;
    }
    return store;
  });
}

function saveStore() {
  return redisSet({ requests: store.requests, totalRequestCount: store.totalRequestCount });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const path = parsePath(req);

  if ((path === 'request' || path.endsWith('request')) && req.method === 'POST') {
    try {
      await getStore();
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      store.totalRequestCount += 1;
      const payload = {
        ...body,
        request_number: store.totalRequestCount,
        id: body.id || Date.now().toString(36),
        at: body.at || new Date().toISOString(),
      };
      store.requests.push(payload);
      if (store.requests.length > MAX_REQUESTS) store.requests.shift();
      await saveStore();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).json({
        ok: true,
        id: payload.id,
        request_number: store.totalRequestCount,
        total_requests: store.totalRequestCount,
      });
    } catch (e) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(400).json({ ok: false, error: 'Invalid JSON' });
    }
    return;
  }

  if ((path === 'requests' || path.endsWith('requests')) && req.method === 'GET') {
    try {
      await getStore();
      const body = JSON.stringify({ requests: store.requests || [] });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
      res.status(200).end(body);
    } catch (e) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(500).json({ requests: [], error: 'Server error' });
    }
    return;
  }

  res.status(404).json({ requests: [] });
};
