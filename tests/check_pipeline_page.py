"""The new, standalone pipeline page must be reachable from the existing four views.
All original visualization structures and associated documentation remain intact.
"""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
page=(root/'pipeline.html').read_text(encoding='utf-8')
assert (root/'src/pipeline.css').is_file()
assert (root/'docs/PIPELINE.md').is_file()
assert 'docs/PIPELINE.md' in page
for anchor in ('sources','parcours','calculs','mapping','limites'):
    assert 'id="'+anchor+'"' in page
for f in ('carte','matrice','correlation','paralleles'):
    s=(root/(f+'.html')).read_text(encoding='utf-8')
    assert s.count('href="pipeline.html"')==1, f
    assert 'src/pipeline.css' not in s, f
    assert 'data-page="'+f+'"' in s
print('OK: page pipeline, navigation, sections et Markdown conservé')
