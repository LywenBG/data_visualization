import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'data/borderless-fixed.json').read_text())
assert len(d['matrix'])>=190
assert len(d['routes'])>10000
assert set(row['year'] for row in d['routes'])=={None}
assert set(row['year'] for row in d['history'])=={2026}
for name in ['carte','matrice','correlation','paralleles']:
 html=(root/f'{name}.html').read_text()
 assert 'src/app.js' in html and 'data-page="'+name+'"' in html
 assert 'type="file"' not in html
print('OK: 4 pages, données intégrées et limites temporelles vérifiées')
