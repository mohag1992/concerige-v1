/**
 * Edge function: shared in-memory store so staff sees guest requests on Vercel without Redis.
 * Call POST /api/concierge-edge?path=request (guest) and GET /api/concierge-edge?path=requests (staff).
 */
export const config = { runtime: 'edge' };

const MAX_REQUESTS = 500;

// Module-level store: persists in same isolate so POST and GET can share state
let moduleStore = { requests: [], totalRequestCount: 0 };

function getStore() {
  if (typeof globalThis.__conciergeStore !== 'undefined') {
    return globalThis.__conciergeStore;
  }
  globalThis.__conciergeStore = moduleStore;
  return moduleStore;
}

function parsePath(url) {
  try {
    const u = new URL(url);
    const path = u.searchParams.get('path') || '';
    return path || u.pathname.replace(/.*\//, '') || '';
  } catch (e) {
    return '';
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'X-Concierge-Edge': '1',
    },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const path = parsePath(req.url);
  const store = getStore();

  if ((path === 'request' || path.endsWith('request')) && req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}));
      store.totalRequestCount += 1;
      const payload = {
        ...body,
        request_number: store.totalRequestCount,
        id: body.id || Date.now().toString(36),
        at: body.at || new Date().toISOString(),
      };
      store.requests.push(payload);
      if (store.requests.length > MAX_REQUESTS) store.requests.shift();
      return jsonResponse({
        ok: true,
        id: payload.id,
        request_number: store.totalRequestCount,
        total_requests: store.totalRequestCount,
      });
    } catch (e) {
      return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
    }
  }

  if ((path === 'requests' || path.endsWith('requests')) && req.method === 'GET') {
    return jsonResponse({ requests: store.requests || [] });
  }

  return jsonResponse({ requests: [] }, 404);
}
