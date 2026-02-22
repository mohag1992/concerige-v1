if (typeof global.requestsStore === 'undefined') global.requestsStore = [];

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ requests: [] });
    return;
  }
  try {
    const requests = global.requestsStore || [];
    const body = JSON.stringify({ requests });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
    res.status(200).end(body);
  } catch (e) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ requests: [], error: 'Server error' });
  }
};
