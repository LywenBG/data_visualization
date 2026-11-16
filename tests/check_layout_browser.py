"""Test VISUEL optionnel : nécessite playwright + Chromium, sans serveur Internet.
    python3 tests/check_layout_browser.py
"""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'src/styles.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');",'')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or shutil.which('chromium-browser'),args=['--no-sandbox','--disable-dev-shm-usage'])
    count=0
    for width,height in [(1440,900),(1024,820),(768,900),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        for name in ('carte','matrice','correlation','paralleles'):
            html=(root/f'{name}.html').read_text()
            html=html.replace('<link rel="stylesheet" href="src/styles.css">',f'<style>{css}</style>')
            html=html.replace('<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>','').replace('<script type="module" src="src/app.js"></script>','')
            page.set_content(html)
            # Simuler la largeur réelle du contenu visuel une fois le SVG/tableau produit.
            if name in ('correlation','paralleles'):
                page.locator('#plot').evaluate("(el) => el.innerHTML='<svg viewBox=\"0 0 940 550\"><text x=\"470\" y=\"275\">Graphique D3</text></svg>'")
            if name=='matrice':
                page.locator('#plot').evaluate("(el)=>el.innerHTML='<div class=\"scroll-area\"><table class=\"matrix-table\"><tr><th class=\"first\">Passeport / Destination</th>'+Array.from({length:25},(_,i)=>'<th>FR</th>').join('')+'</tr><tr><th class=\"first\">France</th>'+Array.from({length:25},()=>'<td><button class=\"cell\">↗</button></td>').join('')+'</tr></table></div>'")
            dim=page.evaluate('''() => ({total:document.documentElement.scrollWidth,viewport:innerWidth,mapBorder:parseFloat(getComputedStyle(document.querySelector('.layout > .panel')).borderTopWidth),goal:getComputedStyle(document.querySelector('.hero-side')).display})''')
            assert dim['total']<=dim['viewport']+1,(name,width,dim)
            assert dim['goal']!='none',(name,width,'But non visible')
            if name=='carte':assert dim['mapBorder']==0,(name,width,dim)
            if width==390 and name in ('matrice','correlation','paralleles'):
                area=page.locator('.scroll-area' if name=='matrice' else '#plot')
                scroll=area.evaluate('(el)=>[el.scrollWidth,el.clientWidth]')
                assert scroll[0]>scroll[1],(name,width,'Défilement attendu',scroll)
            count+=1
        page.close()
    browser.close()
print(f'OK: {count} configurations de mise en page vérifiées, pas de débordement global')
