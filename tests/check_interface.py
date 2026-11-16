"""Contrôles régressifs légers sur le contenu HTML et la sélection des profils.
Ne remplace pas un vrai test end-to-end dans un navigateur avec D3.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
for name in ('carte','matrice','correlation','paralleles'):
    html=(root/(name+'.html')).read_text()
    assert '<small>But de la technique</small>' in html, name
    assert 'Question d\'analyse' not in html, name
    assert html.count('class="guide-card"')==3, name
    assert html.count('class="insight-note"')==2, name
    assert 'type="file"' not in html, name
js=(root/'src/app.js').read_text()
assert "countrySelect('profilePicker'" in js
assert "ctl.querySelector('#profilePicker')" in js
assert "function selectProfile(code)" in js
assert "state.selected=code" in js
assert "refresh();" in js and "function selectProfile(code)" in js and "focus.raise()" in js
assert 'delete state.brush[dim.key]' in js
assert "group.on('dblclick'" in js
assert 'sample.slice(0,12)' not in js
print('OK: buts des quatre techniques, guidage et correction de la sélection')
