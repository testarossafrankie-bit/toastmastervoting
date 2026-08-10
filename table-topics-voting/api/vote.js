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
  const inputs = {
    speaker: body.speaker,
    evaluator: body.evaluator,
    tableTopics: body.tableTopics,
  };

  let meetingId = await redis.get('ttv:meeting:current');
  if (!meetingId) {
    meetingId = Date.now();
    await redis.set('ttv:meeting:current', meetingId);
  }

  const results = {};
  for (const cat of CATEGORIES) {
    const raw = (inputs[cat] || '').trim();
    if (!raw) continue;
    const n = normalizeName(raw);
    if (!n) continue;
    await redis.hincrby(`ttv:m:${meetingId}:${cat}`, n.key, 1);
    await redis.hincrby(`ttv:m:${meetingId}:names:${cat}:${n.key}`, n.raw, 1);
    results[cat] = { key: n.key, display: n.raw };
  }

  return res.status(200).json({ ok: true, meetingId, results });
}
