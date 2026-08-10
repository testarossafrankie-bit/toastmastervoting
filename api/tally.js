import { Redis } from '@upstash/redis';
import { similarFirstnames } from './_normalize.js';

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

    // Pass 1: bare-firstname merges into unique variant
    const groups = new Map();
    for (const entry of rawEntries) {
      const firstname = entry.key.split('-')[0];
      if (!groups.has(firstname)) groups.set(firstname, { bare: null, variants: [] });
      const g = groups.get(firstname);
      if (entry.key === firstname) g.bare = entry;
      else g.variants.push(entry);
    }

    const afterBare = [];
    for (const g of groups.values()) {
      if (g.bare && g.variants.length === 1) {
        const target = g.variants[0];
        target.count += g.bare.count;
        for (const [sp, ct] of Object.entries(g.bare.spellings)) {
          target.spellings[sp] = (Number(target.spellings[sp]) || 0) + Number(ct);
        }
        afterBare.push(target);
      } else {
        if (g.bare) afterBare.push(g.bare);
        afterBare.push(...g.variants);
      }
    }

    // Pass 2: fuzzy-firstname merge within same last-initial group
    const byInitial = {};
    for (const e of afterBare) {
      const initial = e.key.split('-')[1] || '';
      (byInitial[initial] ||= []).push(e);
    }

    const afterFuzzy = [];
    for (const entries of Object.values(byInitial)) {
      entries.sort((a, b) => b.count - a.count);
      const clusters = [];
      for (const entry of entries) {
        const firstname = entry.key.split('-')[0];
        let absorbed = null;
        for (const cluster of clusters) {
          const cf = cluster.key.split('-')[0];
          if (similarFirstnames(firstname, cf)) { absorbed = cluster; break; }
        }
        if (absorbed) {
          absorbed.count += entry.count;
          for (const [sp, ct] of Object.entries(entry.spellings)) {
            absorbed.spellings[sp] = (Number(absorbed.spellings[sp]) || 0) + Number(ct);
          }
        } else {
          clusters.push(entry);
        }
      }
      afterFuzzy.push(...clusters);
    }

    const entries = afterFuzzy.map(e => {
      const display =
        Object.entries(e.spellings).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || e.key;
      return { key: e.key, display, count: e.count, spellings: e.spellings };
    });
    entries.sort((a, b) => b.count - a.count || a.display.localeCompare(b.display));
    tallies[cat] = entries;
  }

  return res.status(200).json({ meetingKey, tallies });
}
