// Pull Back server (pullback.barqlab.app).
//   GET /v1/daily/:n   daily puzzle #n, only once its day has started somewhere in the world
//   GET /v1/freeplay   the free play pool
//   GET /i/<hash>.jpg  photos (static assets with opaque names)
//   GET /              landing page for shared result links
import DAILY from './data/daily.json';
import FREEPLAY from './data/freeplay.json';
import LANDING from './landing.html';

// Puzzle #1 is Nov 25 2026 in the player's local time. The earliest time zone is UTC+14,
// so puzzle #n unlocks at 10:00 UTC the day before its date.
const LAUNCH_UTC = Date.UTC(2026, 10, 25);
const EARLIEST_OFFSET_MS = 14 * 3600 * 1000;

const latestNumber = (now = Date.now()) => Math.floor((now + EARLIEST_OFFSET_MS - LAUNCH_UTC) / 86400000) + 1;

const json = (body, status = 200, maxAge = 300) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}`,
      'access-control-allow-origin': '*',
    },
  });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;

    const m = p.match(/^\/v1\/daily\/(\d{1,5})$/);
    if (m) {
      const n = Number(m[1]);
      if (n < 1 || n > latestNumber()) return json({ error: 'not yet' }, 404, 60);
      return json(DAILY[(n - 1) % DAILY.length], 200, 86400);
    }
    if (p === '/v1/freeplay') return json(FREEPLAY, 200, 3600);
    if (p === '/v1/status') return json({ latest: latestNumber(), daily: DAILY.length, freeplay: FREEPLAY.photos.length }, 200, 60);
    if (p.startsWith('/v1/')) return json({ error: 'not found' }, 404, 60);

    if (p === '/') {
      return new Response(LANDING, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' },
      });
    }
    return env.ASSETS.fetch(req);
  },
};
