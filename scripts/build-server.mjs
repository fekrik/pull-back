// Builds the Pull Back server's content from the puzzle data in src/data:
//   server/public/i/<hash>.jpg   photos with opaque names (same files the web build bundles)
//   server/data/daily.json       the daily schedule in order (puzzle #n = entry (n-1) % length)
//   server/data/freeplay.json    the free play pool
// Opaque names keep answers out of image URLs. The worker only serves a daily once its day
// has started somewhere in the world.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'server');
const SALT = 'pullback-v1';

function readSet(file, constName) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const start = src.indexOf(`export const ${constName}`);
  const body = src.slice(src.indexOf('[', start)).replace(/;\s*$/, '');
  const js = body.replace(/require\('(?:\.\.\/)+([^']+)'\)/g, (_, p) => JSON.stringify(p));
  return new Function(`return (${js});`)();
}

const imgDir = path.join(OUT, 'public', 'i');
fs.rmSync(imgDir, { recursive: true, force: true });
fs.mkdirSync(imgDir, { recursive: true });
fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });

const jobs = [];
function convert(list) {
  return list.map((p) => {
    const srcPath = path.join(ROOT, p.image);
    const name = createHash('sha256').update(SALT).update(fs.readFileSync(srcPath)).digest('hex').slice(0, 20);
    jobs.push([srcPath, path.join(imgDir, `${name}.jpg`)]);
    const { image, ...rest } = p;
    return { ...rest, image: `i/${name}.jpg` };
  });
}

const daily = convert(readSet('src/data/puzzles.ts', 'PUZZLES'));
const free = convert(readSet('src/data/freeplay.ts', 'FREEPLAY'));

for (const [src, dst] of jobs) fs.copyFileSync(src, dst);

const version = createHash('sha256').update(JSON.stringify(free)).digest('hex').slice(0, 12);
fs.writeFileSync(path.join(OUT, 'data', 'daily.json'), JSON.stringify(daily));
fs.writeFileSync(path.join(OUT, 'data', 'freeplay.json'), JSON.stringify({ version, photos: free }));
const bytes = fs.readdirSync(imgDir).reduce((n, f) => n + fs.statSync(path.join(imgDir, f)).size, 0);
console.log(`daily ${daily.length}, free play ${free.length}, ${jobs.length} images, ${(bytes / 1e6).toFixed(1)} MB`);
