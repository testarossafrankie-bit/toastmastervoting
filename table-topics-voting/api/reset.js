import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  const oldId = await redis.get('ttv:meeting:current');
  const newId = Date.now();
  await redis.set('ttv:meeting:current', newId);
  return res.status(200).json({ ok: true, meetingId: newId, oldMeetingId: oldId });
}
