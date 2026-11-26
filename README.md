# Pull Back

A daily photo puzzle from Barq Lab. One close-up photo a day, six guesses, and the camera pulls back after every miss. Spec: "Daily zoom-out puzzle: game spec" (Claude Docs).

This is the week 1 prototype: the core loop with fixed puzzles.

## What works

- Six zoom levels around a focal point (4, 8, 15, 30, 55, 100% of the photo by default, overridable per puzzle), animated with Reanimated in log space.
- Guessing from an autocomplete list of 360+ objects with aliases (`src/data/answers.ts`). Free text is not accepted. Skip counts as a miss.
- Category hint after the third miss. Score = level solved at, a fail counts as 7.
- One daily attempt per local day, saved on device, including a round in progress.
- Result screen with the answer, photo credit, share text (`Pull Back #N 3/6` plus squares) and a countdown to local midnight.
- Stats: played, solve rate, current and best streak, score spread.
- Practice mode to play every bundled puzzle without touching stats.
- Haptics on native. iOS, Android and web from one Expo codebase.

## Not yet (per the spec's plan)

Share image card, sound, leagues, notifications, the browser-to-install funnel, and the content tool.

## Server (pullback.barqlab.app)

The iOS and Android apps load puzzles and photos from a Cloudflare Worker (`server/`) instead of bundling them (`src/data/source.ts`). Web builds bundle them (`src/data/source.web.ts`) so the playable preview works offline.

- `GET /v1/daily/:n`: daily #n, served only once that day has started somewhere in the world (UTC+14). Cycles through the schedule.
- `GET /v1/freeplay`: the free play pool (`version` changes when it changes).
- `GET /i/<hash>.jpg`: photos with opaque names, so URLs don't give away answers.
- `GET /`: landing page for shared links.

The app caches each daily and the pool on the device, and shows a retry message when offline.

```bash
node scripts/build-server.mjs          # copy photos + data into server/ (gitignored)
cd server && npx wrangler@4 dev        # local test on :8787
cd server && npx wrangler@4 deploy     # deploy (Barq Lab Cloudflare account)
```

New puzzles: add them as below, then rebuild and deploy the server. No app update is needed.

## Run

```bash
npm install
npx expo start          # press i / a / w
npx expo export -p web  # static web build in dist/
node scripts/build-single-html.mjs  # one-file preview in dist-single/
```

## Puzzles

Source photos and credits live in `content/` (Wikimedia Commons, CC0 / CC BY / CC BY-SA, credited on the result screen). Edit `content/puzzles.json` (crop centre, focal point, difficulty, optional `levels`) and run:

```bash
python3 scripts/prepare_puzzles.py
```

That writes square images to `assets/puzzles/` and regenerates `src/data/puzzles.ts`. Puzzle #1 is 25 Nov 2026 and the order follows the weekly rhythm (Mon/Tue easy, Wed-Fri medium, weekend hard).
