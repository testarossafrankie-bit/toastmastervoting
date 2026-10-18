import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function guestsKey(meetingKey) {
  return `ttv:m:${meetingKey}:guests`;
}

function validMeetingKey(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const meetingKey = req.query.meeting;
    if (!validMeetingKey(meetingKey)) {
      return res.status(400).json({ error: 'Missing or invalid ?meeting=YYYY-MM-DD' });
    }
    const raw = await redis.lrange(guestsKey(meetingKey), 0, -1);
    const guests = raw.map(entry => {
      if (typeof entry === 'object' && entry !== null) return entry;
      try { return JSON.parse(entry); } catch { return null; }
    }).filter(Boolean);
    return res.status(200).json({ ok: true, meetingKey, guests });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const meetingKey = body.meetingKey;
    if (!validMeetingKey(meetingKey)) {
      return res.status(400).json({ error: 'Missing or invalid meetingKey (expected YYYY-MM-DD)' });
    }
    const name = (body.name || '').trim().slice(0, 80);
    const cell = (body.cell || '').trim().slice(0, 40);
    const email = (body.email || '').trim().slice(0, 120);
    const mentor = (body.mentor || '').trim().slice(0, 80);
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const entry = { name, cell, email, mentor, ts: Date.now() };
    await redis.rpush(guestsKey(meetingKey), JSON.stringify(entry));
    return res.status(200).json({ ok: true, meetingKey, guest: entry });
  }

  if (req.method === 'DELETE') {
    const meetingKey = req.query.meeting;
    if (!validMeetingKey(meetingKey)) {
      return res.status(400).json({ error: 'Missing or invalid ?meeting=YYYY-MM-DD' });
    }
    const idx = Number(req.query.index);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: 'Missing or invalid ?index' });
    }
    const sentinel = '__TTV_DELETED__';
    await redis.lset(guestsKey(meetingKey), idx, sentinel);
    await redis.lrem(guestsKey(meetingKey), 1, sentinel);
    return res.status(200).json({ ok: true, meetingKey, index: idx });
  }

  return res.status(405).json({ error: 'GET, POST, or DELETE only' });
}
