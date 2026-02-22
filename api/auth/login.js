const STAFF_ID = process.env.STAFF_ID || 'staff';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'concierge';

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
    const staffId = (body.staffId || '').trim();
    const password = body.password || '';
    const ok = staffId === STAFF_ID && password === STAFF_PASSWORD;
    const token = ok ? 'staff-' + Date.now() + '-' + Math.random().toString(36).slice(2) : null;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(ok ? { ok: true, token } : { ok: false });
  } catch (e) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(400).json({ ok: false });
  }
};
