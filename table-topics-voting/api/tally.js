import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const CATEGORIES = ['speaker', 'evaluator', 'tableTopics'];

export default async function handler(req, res) {
  const meetingId = await redis.get('ttv:meeting:current');
  if (!meetingId) {
    return res.status(200).json({ meetingId: null, tallies: null });
  }

  const tallies = {};
  for (const cat of CATEGORIES) {
    const counts = (await redis.hgetall(`ttv:m:${meetingId}:${cat}`)) || {};
    const entries = [];
    for (const [key, count] of Object.entries(counts)) {
      const spellings = (await redis.hgetall(`ttv:m:${meetingId}:names:${cat}:${key}`)) || {};
      const display =
        Object.entries(spellings).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || key;
      entries.push({
        key,
        display,
        count: Number(count),
        spellings,
      });
    }
    entries.sort((a, b) => b.count - a.count);
    tallies[cat] = entries;
  }

  return res.status(200).json({ meetingId, tallies });
}
