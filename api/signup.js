import { Redis } from '@upstash/redis';
import nodemailer from 'nodemailer';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const GUESTS_KEY = 'ttv:guests';

function nextMeetingDate(from = new Date()) {
  const today0 = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const candidates = [];
  for (let offset = -1; offset <= 3; offset++) {
    const d = new Date(today0.getFullYear(), today0.getMonth() + offset, 1);
    const tuesdays = [];
    for (let day = 1; day <= 31; day++) {
      const dt = new Date(d.getFullYear(), d.getMonth(), day);
      if (dt.getMonth() !== d.getMonth()) break;
      if (dt.getDay() === 2) tuesdays.push(dt);
    }
    if (tuesdays[1]) candidates.push(tuesdays[1]);
    if (tuesdays[3]) candidates.push(tuesdays[3]);
  }
  candidates.sort((a, b) => a - b);
  return candidates.find(c => c >= today0) || null;
}

function fmtMeetingDate(d) {
  const day = d.getDate();
  const suffix = (day % 10 === 1 && day !== 11) ? 'st'
    : (day % 10 === 2 && day !== 12) ? 'nd'
    : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday} ${month} ${day}${suffix}, ${d.getFullYear()}`;
}

function firstName(full) {
  const parts = (full || '').trim().split(/\s+/);
  return parts[0] || '';
}

async function sendWelcomeEmail({ to, guestName }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('[signup] GMAIL_USER/GMAIL_APP_PASSWORD not set — skipping welcome email');
    return { skipped: true };
  }
  const nextMtg = nextMeetingDate();
  const nextLine = nextMtg ? `${fmtMeetingDate(nextMtg)} at 6:00 PM` : 'the next scheduled meeting';
  const greet = firstName(guestName) || 'there';

  const text = `Hi ${greet} — Greetings!

I'm Frank Terragrossa with the Doylestown Toastmasters Club. Thanks for signing up — glad you're interested in checking us out.

Here's how our meetings usually run:
  - Opening & Announcements
  - 2–3 prepared 8-minute speeches, followed by evaluations of those speeches
  - Table Topics, where members are given a random topic and 1–2 minutes to speak about it, extemporaneously
  - Feedback and closing

I find the Doylestown club to be great for personal and professional development — and importantly, a fun, diverse, and welcoming group.

We meet on the 2nd and 4th Tuesdays of each month at 6:00 PM at Poco's Mexican-American Restaurant, Bar & Comedy Cabaret — upstairs in the comedy club.

OUR NEXT MEETING IS: ${nextLine}
625 N Main St, Doylestown, PA 18901
Arrive by 6:00 for sign-in.

Toastmasters is the safest place on earth to learn how to speak in front of people. Statistically, people fear public speaking worse than death — but here, everyone wants to encourage you. Next time, it might be their turn, and they'll want your support.

Members develop their speeches using the TM Global online training courses and tools:
https://youtu.be/iv9cKPn0Wpo
https://www.doylestowntoastmasters.org/

Warmest regards,

Frank Terragrossa
215-501-2000
`;

  const html = `<p>Hi ${escapeHtml(greet)} &mdash; Greetings!</p>
<p>I'm Frank Terragrossa with the Doylestown Toastmasters Club. Thanks for signing up &mdash; glad you're interested in checking us out.</p>
<p>Here's how our meetings usually run:</p>
<ul>
  <li>Opening &amp; Announcements</li>
  <li>2&ndash;3 prepared 8-minute speeches, followed by evaluations of those speeches</li>
  <li>Table Topics, where members are given a random topic and 1&ndash;2 minutes to speak about it, extemporaneously</li>
  <li>Feedback and closing</li>
</ul>
<p>I find the Doylestown club to be great for personal and professional development &mdash; and importantly, a fun, diverse, and welcoming group.</p>
<p>We meet on the <strong>2nd and 4th Tuesdays of each month at 6:00 PM</strong> at Poco's Mexican-American Restaurant, Bar &amp; Comedy Cabaret &mdash; upstairs in the comedy club.</p>
<p><strong>OUR NEXT MEETING IS:</strong> ${escapeHtml(nextLine)}<br>
625 N Main St, Doylestown, PA 18901<br>
Arrive by 6:00 for sign-in.</p>
<p>Toastmasters is the safest place on earth to learn how to speak in front of people. Statistically, people fear public speaking worse than death &mdash; but here, everyone wants to encourage you. Next time, it might be their turn, and they'll want your support.</p>
<p>Members develop their speeches using the TM Global online training courses and tools:<br>
<a href="https://youtu.be/iv9cKPn0Wpo">https://youtu.be/iv9cKPn0Wpo</a><br>
<a href="https://www.doylestowntoastmasters.org/">https://www.doylestowntoastmasters.org/</a></p>
<p>Warmest regards,</p>
<p>Frank Terragrossa<br>215-501-2000</p>`;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `Frank Terragrossa <${user}>`,
    to,
    subject: 'Welcome to Doylestown Toastmasters!',
    text,
    html,
  });
  return { sent: true };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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
    let emailStatus = null;
    if (fields.email && /@/.test(fields.email)) {
      try {
        const result = await sendWelcomeEmail({ to: fields.email, guestName: fields.name });
        emailStatus = result.sent ? 'sent' : 'skipped';
      } catch (err) {
        console.error('[signup] welcome email failed:', err);
        emailStatus = 'failed';
      }
    }
    return res.status(200).json({ ok: true, guest: { id, ...entry }, emailStatus });
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
