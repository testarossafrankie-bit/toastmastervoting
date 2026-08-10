import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CATEGORIES = ['speaker', 'evaluator', 'tableTopics'];

export default async function handler(req, res) {
  const meetingKey = req.query.meeting;
  if (!meetingKey || !/^\d{4}-\d{2}-\d{2}$/.test(meetingKey)) {
    return res.status(400).json({ error: 'Missing or invalid ?meeting=YYYY-MM-DD' });
  }

  const tallies = {};
  for (const cat of CATEGORIES) {
    const counts = (await redis.hgetall(`ttv:m:${meetingKey}:${cat}`)) || {};
    const entries = [];
    for (const [key, count] of Object.entries(counts)) {
      const spellings = (await redis.hgetall(`ttv:m:${meetingKey}:names:${cat}:${key}`)) || {};
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

  return res.status(200).json({ meetingKey, tallies });
}
