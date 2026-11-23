import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const GUESTS_KEY = 'ttv:guests';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function parseEntry(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

const STR_FIELDS = {
  date: 20,
  name: 80,
  cell: 40,
  email: 120,
  source: 120,
};

function sanitizeFull(body) {
  const out = {};
  for (const [field, max] of Object.entries(STR_FIELDS)) {
    out[field] = (body[field] || '').trim().slice(0, max);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'onboarded')) {
    out.onboarded = !!body.onboarded;
    out.onboardedTs = out.onboarded ? Date.now() : null;
  }
  return out;
}

function sanitizePartial(body) {
  const out = {};
  for (const [field, max] of Object.entries(STR_FIELDS)) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      out[field] = (body[field] || '').trim().slice(0, max);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'onboarded')) {
    out.onboarded = !!body.onboarded;
    out.onboardedTs = out.onboarded ? Date.now() : null;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const raw = (await redis.hgetall(GUESTS_KEY)) || {};
    const guests = Object.entries(raw)
      .map(([id, val]) => {
        const parsed = parseEntry(val);
        return parsed ? { id, ...parsed } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    return res.status(200).json({ ok: true, guests });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  if (req.method === 'POST') {
    const fields = sanitizeFull(body);
    if (!fields.name) return res.status(400).json({ error: 'Name is required' });
    const id = makeId();
    const entry = { ...fields, ts: Date.now() };
    await redis.hset(GUESTS_KEY, { [id]: JSON.stringify(entry) });
    return res.status(200).json({ ok: true, guest: { id, ...entry } });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const id = (body.id || '').toString();
    if (!id) return res.status(400).json({ error: 'id required' });
    const existing = parseEntry(await redis.hget(GUESTS_KEY, id));
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const fields = sanitizePartial(body);
    if (Object.prototype.hasOwnProperty.call(fields, 'name') && !fields.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const updated = { ...existing, ...fields };
    await redis.hset(GUESTS_KEY, { [id]: JSON.stringify(updated) });
    return res.status(200).json({ ok: true, guest: { id, ...updated } });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    await redis.hdel(GUESTS_KEY, id);
    return res.status(200).json({ ok: true, id });
  }

  return res.status(405).json({ error: 'GET, POST, PATCH, or DELETE only' });
}
