"""Turn source photos into square puzzle images and regenerate src/data/puzzles.ts.

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

def main(src_dir):
    src_dir = pathlib.Path(src_dir)
    items = json.loads((ROOT / 'content/puzzles.json').read_text())
    out_dir = ROOT / 'assets/puzzles'
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
        name = f"{it['answer']}.jpg"
        sq.save(out_dir / name, quality=84, optimize=True, progressive=True)
        c = it['credit']
        levels = f"\n    levels: {json.dumps(it['levels'])}," if 'levels' in it else ''
        entries.append(f"""  {{
    id: {json.dumps(it['answer'])},
    answerId: {json.dumps(it['answer'])},
    image: require('../../assets/puzzles/{name}'),
    focal: {{ x: {it['focal'][0]}, y: {it['focal'][1]} }},{levels}
    difficulty: {json.dumps(it['difficulty'])},
    credit: {json.dumps({k: c[k] for k in ('title', 'author', 'license', 'url') if k in c})},
  }},""")
        print(name, sq.size)
    ts = (ROOT / 'src/data/puzzles.ts').read_text()
    head = ts.split('export const PUZZLES: Puzzle[] = [')[0]
    (ROOT / 'src/data/puzzles.ts').write_text(head + 'export const PUZZLES: Puzzle[] = [\n' + '\n'.join(entries) + '\n];\n')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'content')
