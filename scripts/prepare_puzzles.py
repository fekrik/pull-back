"""Turn source photos into square puzzle images and regenerate the puzzle data file.

Two sets:
  daily     (default)  content/puzzles.json  -> assets/puzzles/   + src/data/puzzles.ts  (PUZZLES, 1600 px)
  freeplay  --set freeplay  content/freeplay.json -> assets/freeplay/ + src/data/freeplay.ts (FREEPLAY, 1200 px)
Free play photos are smaller to keep the app bundle light. Order in freeplay.json doesn't matter.

Input: content/puzzles.json, a list of
  {"file": "photos/tennis-ball.jpg", "answer": "tennis-ball", "crop": [cx, cy],
   "focal": [fx, fy], "difficulty": "easy", "credit": {...}}
  crop  = centre of the square crop in 0..1 of the source photo (default 0.5, 0.5)
  focal = level 1 focal point in 0..1 of the *square* image
Output: assets/puzzles/<answer>.jpg (1600 px square) and src/data/puzzles.ts.

Prototype only: the shipping app downloads puzzles from a server instead of bundling them.
"""
import json, sys, pathlib
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
SIZE = 1600

SETS = {
    'daily': dict(json='content/puzzles.json', assets='puzzles', ts='src/data/puzzles.ts', const='PUZZLES', size=1600),
    'freeplay': dict(json='content/freeplay.json', assets='freeplay', ts='src/data/freeplay.ts', const='FREEPLAY', size=1200),
}

def main(src_dir, set_name='daily'):
    cfg = SETS[set_name]
    SIZE = cfg['size']
    src_dir = pathlib.Path(src_dir)
    items = json.loads((ROOT / cfg['json']).read_text())
    out_dir = ROOT / 'assets' / cfg['assets']
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for it in items:
        im = ImageOps.exif_transpose(Image.open(src_dir / it['file'])).convert('RGB')
        w, h = im.size
        s = min(w, h)
        cx, cy = it.get('crop', [0.5, 0.5])
        left = min(max(int(cx * w - s / 2), 0), w - s)
        top = min(max(int(cy * h - s / 2), 0), h - s)
        sq = im.crop((left, top, left + s, top + s)).resize((min(s, SIZE),) * 2, Image.LANCZOS)
        name = f"{it.get('id', it['answer'])}.jpg"
        sq.save(out_dir / name, quality=84, optimize=True, progressive=True)
        c = it['credit']
        levels = f"\n    levels: {json.dumps(it['levels'])}," if 'levels' in it else ''
        entries.append(f"""  {{
    id: {json.dumps(it.get('id', it['answer']))},
    answerId: {json.dumps(it['answer'])},
    image: require('../../assets/{cfg['assets']}/{name}'),
    focal: {{ x: {it['focal'][0]}, y: {it['focal'][1]} }},{levels}
    difficulty: {json.dumps(it['difficulty'])},
    credit: {json.dumps({k: c[k] for k in ('title', 'author', 'license', 'url') if k in c})},
  }},""")
        print(name, sq.size)
    header = ("import { Puzzle } from './puzzles';\n\n" if set_name == 'freeplay' else None)
    path = ROOT / cfg['ts']
    if header is None:
        head = path.read_text().split('export const PUZZLES: Puzzle[] = [')[0]
    else:
        head = header
    path.write_text(head + f"export const {cfg['const']}: Puzzle[] = [\n" + '\n'.join(entries) + '\n];\n')

if __name__ == '__main__':
    args = sys.argv[1:]
    set_name = 'daily'
    if '--set' in args:
        i = args.index('--set'); set_name = args[i + 1]; del args[i:i + 2]
    main(args[0] if args else ROOT / 'content', set_name)
