// Builds dist-single/index.html: the web export with JS and puzzle images inlined.
// Used for the shareable preview page. Run after `npx expo export -p web`.
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const m = html.match(/<script src="(\/_expo\/[^"]+)" defer><\/script>/);
let js = fs.readFileSync(path.join(dist, m[1]), 'utf8');
js = js.replace(/"\/(assets\/[^"]+\.(?:jpg|jpeg|png))"/g, (_, p) => {
  const buf = fs.readFileSync(path.join(dist, p));
  const mime = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return JSON.stringify(`data:${mime};base64,${buf.toString('base64')}`);
});
html = html
  .replace(m[0], () => `<script>${js.replace(/<\/script/g, '<\\/script')}</script>`)
  .replace(/<link rel="icon"[^>]*>/, '')
  .replace('<style id="expo-reset">', '<style>body{background:#12110f;margin:0}</style>\n<style id="expo-reset">');
// The script must run after #root exists.
html = html.replace(/<script>([\s\S]*)<\/script>\n<\/body>/, (all) => all);
fs.mkdirSync('dist-single', { recursive: true });
fs.writeFileSync('dist-single/index.html', html);
console.log('dist-single/index.html', (html.length / 1e6).toFixed(2), 'MB');

// Artifact variant: the host page adds its own document skeleton.
if (process.argv.includes('--artifact')) {
  const body = html
    .replace(/<!doctype html>/i, '')
    .replace(/<\/?html[^>]*>/g, '')
    .replace(/<\/?head>/g, '')
    .replace(/<\/?body>/g, '')
    .replace(/<meta charset[^>]*>|<meta httpEquiv[^>]*>|<meta name="viewport"[^>]*>|<meta name="theme-color"[^>]*>/g, '')
    .replace(/<title>[^<]*<\/title>/, '');
  const out = `<title>Pull Back</title>\n<style>:root{color-scheme:dark;background:#12110f}html,body{background:#12110f;color:#f3ede3}</style>\n${body.trim()}\n`;
  fs.writeFileSync('dist-single/artifact.html', out);
  console.log('dist-single/artifact.html', (out.length / 1e6).toFixed(2), 'MB');
}
