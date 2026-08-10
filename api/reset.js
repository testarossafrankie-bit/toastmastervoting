import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  const meetingKey = req.query.meeting;
  if (!meetingKey || !/^\d{4}-\d{2}-\d{2}$/.test(meetingKey)) {
    return res.status(400).json({ error: 'Missing or invalid ?meeting=YYYY-MM-DD' });
  }

  const toDelete = [];
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, {
      match: `ttv:m:${meetingKey}:*`,
      count: 100,
    });
    toDelete.push(...keys);
    cursor = next;
  } while (cursor !== '0');

  if (toDelete.length) {
    await redis.del(...toDelete);
  }

  return res.status(200).json({ ok: true, meetingKey, deleted: toDelete.length });
}
