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

    const rawEntries = [];
    for (const [key, count] of Object.entries(counts)) {
      const spellings = (await redis.hgetall(`ttv:m:${meetingKey}:names:${cat}:${key}`)) || {};
      rawEntries.push({ key, count: Number(count), spellings: { ...spellings } });
    }

    // Group by firstname; if a bare "firstname" bucket has exactly one
    // matching "firstname-x" variant, merge the bare bucket into it.
    const groups = new Map();
    for (const entry of rawEntries) {
      const firstname = entry.key.split('-')[0];
      if (!groups.has(firstname)) groups.set(firstname, { bare: null, variants: [] });
      const g = groups.get(firstname);
      if (entry.key === firstname) g.bare = entry;
      else g.variants.push(entry);
    }

    const merged = [];
    for (const g of groups.values()) {
      if (g.bare && g.variants.length === 1) {
        const target = g.variants[0];
        target.count += g.bare.count;
        for (const [sp, ct] of Object.entries(g.bare.spellings)) {
          target.spellings[sp] = (Number(target.spellings[sp]) || 0) + Number(ct);
        }
        merged.push(target);
      } else {
        if (g.bare) merged.push(g.bare);
        merged.push(...g.variants);
      }
    }

    const entries = merged.map(e => {
      const display =
        Object.entries(e.spellings).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || e.key;
      return { key: e.key, display, count: e.count, spellings: e.spellings };
    });
    entries.sort((a, b) => b.count - a.count);
    tallies[cat] = entries;
  }

  return res.status(200).json({ meetingKey, tallies });
}
