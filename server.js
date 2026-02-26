/**
 * Minimal server for Concierge Platform
 * - Serves static files (index.html)
 * - POST /api/request receives guest requests (for hotel backend integration)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3002;
const ROOT = __dirname;

const STAFF_ID = process.env.STAFF_ID || 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'concierge';

let totalRequestCount = 0;
const requestsStore = [];
const MAX_REQUESTS = 500;

function serveFile(res, filePath, contentType) {
  const target = path.join(ROOT, filePath || 'index.html');
  fs.readFile(target, (err, data) => {
    if (err) {
      console.error('[serveFile]', err.message, target);
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = (req.url ? req.url.split('?')[0] : '/').replace(/\/$/, '') || '/';

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const staffId = (data.staffId || '').trim();
        const password = data.password || '';
        const ok = staffId === STAFF_ID && password === STAFF_PASSWORD;
        const token = ok ? 'staff-' + Date.now() + '-' + Math.random().toString(36).slice(2) : null;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(ok ? { ok: true, token } : { ok: false }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/request') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        totalRequestCount += 1;
        const now = new Date().toISOString();
        payload.request_number = totalRequestCount;
        payload.id = payload.id || Date.now().toString(36);
        payload.at = payload.at || now;
        payload.status = 'sent';
        payload.status_updated_at = now;
        requestsStore.push(payload);
        if (requestsStore.length > MAX_REQUESTS) requestsStore.shift();
        console.log('[Concierge] Request #' + totalRequestCount + ':', payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id: payload.id, request_number: totalRequestCount, total_requests: totalRequestCount }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'PATCH' && pathname === '/api/request') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const id = data.id;
        const status = (data.status || '').toLowerCase().replace(/\s+/g, '_');
        const allowed = ['sent', 'read', 'on_the_way', 'completed'];
        if (!id || !allowed.includes(status)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid id or status' }));
          return;
        }
        const reqItem = requestsStore.find((r) => String(r.id) === String(id));
        if (!reqItem) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Request not found' }));
          return;
        }
        const now = new Date().toISOString();
        reqItem.status = status;
        reqItem.status_updated_at = now;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id: reqItem.id, status: reqItem.status, status_updated_at: now }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ total_requests: totalRequestCount }));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/requests') {
    try {
      const body = JSON.stringify({ requests: requestsStore });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
      });
      res.end(body);
    } catch (e) {
      console.error('[api/requests]', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ requests: [], error: 'Server error' }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/request') {
    const q = (req.url || '').split('?')[1] || '';
    const params = new URLSearchParams(q);
    const id = params.get('id');
    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing id' }));
      return;
    }
    const reqItem = requestsStore.find((r) => String(r.id) === String(id));
    if (!reqItem) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ request: reqItem }));
    return;
  }

  if (req.method === 'GET') {
    if (pathname === '/' || pathname === '') {
      serveFile(res, 'qr.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/index.html') {
      serveFile(res, 'index.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/qr.html') {
      serveFile(res, 'qr.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/staff.html' || pathname === '/staff') {
      serveFile(res, 'staff.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/requestcomplete.html') {
      serveFile(res, 'requestcomplete.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/requeststatus.html') {
      serveFile(res, 'requeststatus.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/guest.html' || pathname === '/guest') {
      serveFile(res, 'guest.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/stafflogin.html' || pathname === '/stafflogin') {
      serveFile(res, 'stafflogin.html', 'text/html; charset=utf-8');
      return;
    }
    // Static HTML fallback
    const htmlMatch = pathname.match(/^\/([a-z0-9_-]+\.html)$/i);
    if (htmlMatch) {
      serveFile(res, htmlMatch[1], 'text/html; charset=utf-8');
      return;
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Concierge platform: http://localhost:${PORT}`);
  console.log('QR code should point to this URL (add ?room=301 for room-specific links).');
});
