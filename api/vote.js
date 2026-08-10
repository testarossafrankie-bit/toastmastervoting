import { Redis } from '@upstash/redis';
import { normalizeName } from './_normalize.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CATEGORIES = ['speaker', 'evaluator', 'tableTopics'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const meetingKey = body.meetingKey;
  if (!meetingKey || !/^\d{4}-\d{2}-\d{2}$/.test(meetingKey)) {
    return res.status(400).json({ error: 'Missing or invalid meetingKey (expected YYYY-MM-DD)' });
  }

  const inputs = {
    speaker: body.speaker,
    evaluator: body.evaluator,
    tableTopics: body.tableTopics,
  };

  const results = {};
  for (const cat of CATEGORIES) {
    const raw = (inputs[cat] || '').trim();
    if (!raw) continue;
    const n = normalizeName(raw);
    if (!n) continue;
    await redis.hincrby(`ttv:m:${meetingKey}:${cat}`, n.key, 1);
    await redis.hincrby(`ttv:m:${meetingKey}:names:${cat}:${n.key}`, n.raw, 1);
    results[cat] = { key: n.key, display: n.raw };
  }

  return res.status(200).json({ ok: true, meetingKey, results });
}
