/* Borderless: four distinct D3 techniques. Data are local, fixed, and never uploaded by visitors. */
const $=(selector)=>document.querySelector(selector);
const page=document.body.dataset.page;
const palette={free:'#16a085',arrival:'#56a9dc',eta:'#8b83d5',evisa:'#e8af55',required:'#dc8179',blocked:'#a75c76',own:'#c0ced0',unknown:'#d9e3e1'};
const labels={free:'Sans visa',arrival:'Visa à l’arrivée',eta:'Autorisation ETA',evisa:'Visa électronique',required:'Visa préalable',blocked:'Entrée interdite',own:'Pays du passeport',unknown:'Non renseigné'};
const cats=['free','arrival','eta','evisa','required','blocked'];
const access=new Set(['free','arrival','eta']);
const names=new Intl.DisplayNames(['fr'],{type:'region'});
const label=code=>{try{return names.of(code)||code}catch{return code}};
const normalizeText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt=new Intl.NumberFormat('fr-FR');
const stat=(value)=>value==null?'—':fmt.format(value);
const state={passport:'FR',compare:'DZ',category:'all',country:'',selected:'',metric:'routes',sort:'score',brush:{},selectedSeries:null,xMetric:'accessible',yMetric:'connected',yScale:'sqrt',colorMetric:'accessible',routesVisible:true,mapTransform:null,selectedPair:''};
// Contexte d'enquête commun aux quatre pages, conservé seulement dans cet onglet.
const journey={origin:'FR',compare:'DZ',destination:'',focusOrigin:'',examined:''};
function saveJourney(patch={}){
 Object.assign(journey,patch);
 try{sessionStorage.setItem('borderless.journey.v1',JSON.stringify(journey))}catch{}
 renderJourney();
}
function journeyHref(destinationPage){
 const origin=page==='matrice'&&destinationPage==='carte'&&byCode.has(journey.focusOrigin)?journey.focusOrigin:state.passport;
 const q=new URLSearchParams({passport:origin,compare:state.compare});
 if(journey.destination&&countries.includes(journey.destination))q.set('destination',journey.destination);
 if(journey.examined&&byCode.has(journey.examined))q.set('examined',journey.examined);
 return `${destinationPage}.html?${q.toString()}`;
}
function renderJourney(){
 if(!data||typeof document.querySelectorAll!=='function')return;
 const current=$('#storyContext'),carry=$('#storyCarry');
 if(!current&&!carry)return;
 const origin=state.passport,ref=byCode.get(origin),other=byCode.get(state.compare);
 const destination=journey.destination&&countries.includes(journey.destination)?journey.destination:'';
 const compared=other?` Comparaison : ${other.name}.`:'';
 const target=destination?` Destination suivie : ${label(destination)}.`:'';
 if(current)current.textContent=`Passeport étudié : ${label(origin)}.${compared}${target} Les choix restent disponibles quand vous changez de page.`;
 const follow=page==='matrice'&&byCode.has(journey.focusOrigin)?journey.focusOrigin:origin;
 const focusCountry=byCode.get(journey.examined)||other;
 if(carry){
  if(page==='matrice')carry.textContent=destination?
    `Pour poursuivre : examiner sur la carte ${label(follow)} → ${label(destination)}. La carte reprend le pays et la destination de la cellule sélectionnée.`:
    `Choisissez deux passeports, puis cliquez sur une cellule qui vous intrigue. À l'étape suivante, vous retrouverez la nationalité sélectionnée${compared}`;
  if(page==='carte'){
   const n=destination?connected(origin,destination).length:null;
   carry.textContent=destination?`${label(origin)} → ${label(destination)} : ${labels[category(origin,destination)]||labels.unknown.toLowerCase()} ; ${n} paire(s) d'aéroports sortante(s) répertoriée(s). Une absence dans la base ne démontre pas qu'aucun vol réel n'existe. Étape suivante : est-ce une association qu'on observe aussi pour les autres pays ?`:
    `Depuis ${label(origin)}, comparez les destinations colorées et les routes tracées. Pour conserver une destination dans votre enquête, faites Maj + clic dessus, puis explorez la relation globale.`;
  }
  if(page==='correlation')carry.textContent=ref&&other?
   `${ref.name} : ${stat(ref.accessible)} destinations accessibles selon notre convention et ${stat(ref.connected)} pays reliés par des routes sortantes ; ${other.name} : ${stat(other.accessible)} destinations accessibles et ${stat(other.connected)} pays reliés. Étape suivante : pourquoi leurs profils sont-ils différents ?`:
   `Choisissez un point pour l'examiner à l'étape suivante. La corrélation indique une association descriptive, jamais une cause.`;
  if(page==='paralleles')carry.textContent=ref&&focusCountry?
   `Bilan de l'enquête : ${ref.name} compte ${stat(ref.free)} destinations strictement sans visa et ${stat(ref.routes)} routes sortantes distinctes enregistrées ; ${focusCountry.name} en compte ${stat(focusCountry.free)} et ${stat(focusCountry.routes)}. Vous pouvez comparer les autres catégories et discuter les limites du dataset.`:
   `Comparez les cinq axes et choisissez un autre profil pour étudier un cas différent. Les routes ne sont pas datées.`;
 }
 const next=$('#storyNext');if(next){
  const path=page==='matrice'?'carte':page==='carte'?'correlation':page==='correlation'?'paralleles':'matrice';
  next.href=journeyHref(path);
 }
 const prev=$('#storyPrevious');if(prev){
  const path=page==='carte'?'matrice':page==='correlation'?'carte':'correlation';
  prev.href=journeyHref(path);
 }
 // Les quatre raccourcis de l'étape possèdent le même contexte que Suivant/Précédent.
 document.querySelectorAll('.story-step').forEach(a=>{
  const path=a.getAttribute('href')?.replace(/\.html.*$/,'');
  if(['matrice','carte','correlation','paralleles'].includes(path))a.href=journeyHref(path);
 });
}

const tooltip=$('#tooltip');
let data,geo,countries=[],profiles=[],byCode=new Map(),routeByCountry=new Map(),routeByPair=new Map();
const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value};
function showTip(event,title,body){tooltip.style.display='block';tooltip.innerHTML=`<b>${escapeHtml(title)}</b>${escapeHtml(body)}`;moveTip(event)}
function moveTip(event){const rect=tooltip.getBoundingClientRect(),space=8;tooltip.style.left=Math.max(space,Math.min(window.innerWidth-rect.width-space,event.clientX+14))+'px';tooltip.style.top=Math.max(space,Math.min(window.innerHeight-rect.height-space,event.clientY-rect.height-14))+'px'}
function hideTip(){tooltip.style.display='none'}
function category(p,c){return data.matrix[p]?.[c]??'unknown'}
function categoryCounts(p){const out=Object.fromEntries(cats.map(c=>[c,0]));out.unknown=0;for(const [dest,cat] of Object.entries(data.matrix[p]??{})){if(dest===p)continue;out[cat]=(out[cat]??0)+1}return out}
function routeSummary(code){return routeByCountry.get(code)??{rows:[],pairs:0,connected:0,destCountries:new Set()}}
function connected(from,to){return routeByPair.get(`${from}|${to}`)??[]}
function build(){const all=new Set(Object.keys(data.matrix));for(const row of data.routes){all.add(row.from);all.add(row.to);let val=routeByCountry.get(row.from);if(!val){val={rows:[],pairs:0,connected:0,destCountries:new Set()};routeByCountry.set(row.from,val)}val.rows.push(row);val.pairs++;val.destCountries.add(row.to);const pair=`${row.from}|${row.to}`;if(!routeByPair.has(pair))routeByPair.set(pair,[]);routeByPair.get(pair).push(row)}for(const v of routeByCountry.values())v.connected=v.destCountries.size;
 const ranks=new Map(data.history.map(x=>[x.passport,x]));countries=[...all].filter(x=>/^[A-Z]{2}$/.test(x)).sort((a,b)=>label(a).localeCompare(label(b),'fr'));
 profiles=countries.filter(code=>data.matrix[code]).map(code=>{const v=categoryCounts(code),r=routeSummary(code);return {code,name:label(code),...v,accessible:v.free+v.arrival+v.eta,documents:v.required+v.evisa,connected:r.connected,routes:r.pairs,rank:ranks.get(code)?.rank??null,score:ranks.get(code)?.score??null}});byCode=new Map(profiles.map(d=>[d.code,d])); if(!byCode.has(state.passport))state.passport=profiles[0].code;
}
function countrySelect(id,value,handler,placeholder='Pays'){return `<div class="field"><label for="${id}">${placeholder}</label><select id="${id}">${profiles.map(d=>`<option value="${d.code}" ${d.code===value?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}</select></div>`}
function categorySelect(){return `<div class="field"><label for="category">Exigence de visa</label><select id="category"><option value="all">Toutes les catégories</option>${cats.map(c=>`<option value="${c}" ${state.category===c?'selected':''}>${labels[c]}</option>`).join('')}</select></div>`}
// Une seule action pour le sélecteur et le clic sur la carte : mêmes états, statistiques et couleurs.
function choosePassport(code,source='select'){
 if(!byCode.has(code))return false;
 const examined=state.selected;
 state.passport=code;
 state.selected=page==='paralleles'&&examined!==code&&byCode.has(examined)?examined:code;
 state.selectedPair='';
 try{sessionStorage.setItem('borderless.passport',code)}catch{}
 saveJourney({origin:code,focusOrigin:'',destination:journey.destination===code?'':journey.destination});
 renderAll();
 if(page==='carte')setDetail(code,source==='map'
  ?`Passeport de ${label(code)} choisi directement sur la carte : les couleurs, les routes et les indicateurs ont été recalculés. Maj + clic sur une autre destination permet de consulter son exigence de visa sans changer de passeport.`
  :`Passeport de ${label(code)} choisi dans les filtres : les couleurs, les routes et les indicateurs ont été recalculés.`);
 return true;
}
function renderControls(){const ctl=$('#controls');const passport=countrySelect('passport',state.passport,null,'Passeport analysé');const compare=countrySelect('compare',state.compare,null,'Passeport de comparaison');const search=`<div class="field search"><label for="countrySearch">Rechercher une destination</label><input id="countrySearch" type="search" placeholder="Ex. Japon, Maroc, Canada…" value="${escapeHtml(state.country)}"></div>`;
 if(page==='carte')ctl.innerHTML=passport+categorySelect()+`<label class="switch"><input type="checkbox" id="routesToggle" ${state.routesVisible?'checked':''}>Afficher les routes directes</label>`;
 if(page==='matrice')ctl.innerHTML=passport+compare+categorySelect()+search;
 if(page==='correlation')ctl.innerHTML=`<div class="field"><label for="xMetric">Axe horizontal</label><select id="xMetric"><option value="accessible" ${state.xMetric==='accessible'?'selected':''}>Destinations accessibles sans visa préalable</option><option value="free" ${state.xMetric==='free'?'selected':''}>Destinations strictement sans visa</option><option value="required" ${state.xMetric==='required'?'selected':''}>Destinations avec visa préalable</option></select></div><div class="field"><label for="yMetric">Axe vertical</label><select id="yMetric"><option value="connected" ${state.yMetric==='connected'?'selected':''}>Pays reliés par avion</option><option value="routes" ${state.yMetric==='routes'?'selected':''}>Paires d'aéroports sortantes</option></select></div><div class="field"><label for="yScale">Répartition verticale</label><select id="yScale"><option value="sqrt" ${state.yScale==='sqrt'?'selected':''}>Racine carrée (points lisibles)</option><option value="linear" ${state.yScale==='linear'?'selected':''}>Linéaire (valeurs réelles)</option></select></div>`+passport;
 if(page==='paralleles')ctl.innerHTML=passport+countrySelect('profilePicker',state.selected||state.passport,null,'Pays à examiner')+`<div class="field"><label for="colorMetric">Couleur des lignes</label><select id="colorMetric"><option value="accessible" ${state.colorMetric==='accessible'?'selected':''}>Accès sans visa préalable</option><option value="connected" ${state.colorMetric==='connected'?'selected':''}>Pays reliés</option></select></div><button type="button" class="action" id="clearBrush">Effacer les filtres d'axes</button>`;
 ctl.querySelector('#passport')?.addEventListener('change',e=>choosePassport(e.target.value,'select'));
 ctl.querySelector('#compare')?.addEventListener('change',e=>{state.compare=e.target.value;state.selectedPair='';saveJourney({compare:state.compare});renderAll()});
 ctl.querySelector('#category')?.addEventListener('change',e=>{state.category=e.target.value;renderAll()});
 ctl.querySelector('#countrySearch')?.addEventListener('input',e=>{state.country=e.target.value;drawMatrix()});
 ctl.querySelector('#routesToggle')?.addEventListener('change',e=>{state.routesVisible=e.target.checked;drawMap()});
 ctl.querySelector('#xMetric')?.addEventListener('change',e=>{state.xMetric=e.target.value;drawScatter()});ctl.querySelector('#yMetric')?.addEventListener('change',e=>{state.yMetric=e.target.value;drawScatter()});ctl.querySelector('#yScale')?.addEventListener('change',e=>{state.yScale=e.target.value;drawScatter()});
 ctl.querySelector('#profilePicker')?.addEventListener('change',e=>{state.selected=e.target.value;saveJourney({examined:state.selected});setDetail(state.selected,'Profil sélectionné pour comparaison. Les filtres d’axes restent actifs.');drawParallel()});
 ctl.querySelector('#colorMetric')?.addEventListener('change',e=>{state.colorMetric=e.target.value;drawParallel()});
 ctl.querySelector('#clearBrush')?.addEventListener('click',()=>{state.brush={};drawParallel()});
}
function statsCards(items){$('#stats').innerHTML=items.map(([name,val,sub])=>`<div class="stat"><small>${escapeHtml(name)}</small><strong>${stat(val)}</strong><em>${escapeHtml(sub||'')}</em></div>`).join('')}
function setDetail(code,extra='',origin=state.passport){
 const panel=$('#details');
 if(!code){panel.innerHTML='<h3>Explorer un détail</h3><div class="empty-detail">Choisissez une destination, un point ou une ligne pour consulter ses valeurs.</div>';return}
 state.selected=code;
 const destName=label(code),p=byCode.get(code),visa=category(origin,code),routes=connected(origin,code),out=routeSummary(code);
 const ct=data.matrix[code]?categoryCounts(code):null;
 const metric=(name,value)=>`<div class="detail-row"><span>${escapeHtml(name)}</span><strong>${stat(value)}</strong></div>`;
 panel.innerHTML=`<div class="detail-title">Destination ou pays examiné</div>
  <h3>${escapeHtml(destName)} <span class="chip">${escapeHtml(code)}</span></h3>
  <p>${escapeHtml(extra||'Données disponibles : exigences de visa 2026 et routes aériennes non datées.')}</p>
  <div class="detail-title">Trajet ${escapeHtml(label(origin))} → ${escapeHtml(destName)}</div>
  <div class="detail-row"><span>Exigence de visa</span><strong><span class="color-chip" style="background:${palette[visa]||palette.unknown}"></span>${escapeHtml(labels[visa]||labels.unknown)}</strong></div>
  ${metric('Paires d’aéroports recensées',routes.length)}
  <div class="detail-title">Profil du pays examiné</div>
  ${ct?metric('Destinations sans visa',ct.free)+metric('Visa à l’arrivée',ct.arrival)+metric('ETA',ct.eta)+metric('Visa électronique',ct.evisa)+metric('Visa préalable',ct.required):'<p>Pas de profil de passeport disponible pour ce territoire dans la matrice.</p>'}
  ${metric('Pays reliés depuis ce territoire',p?.connected??out.connected)}
  ${metric('Paires d’aéroports sortantes',p?.routes??out.pairs)}
  <p class="micro">Une liaison répertoriée ne garantit pas la disponibilité d’un vol. Pas de fréquence ni d’historique annuel.</p>`;
}
function legend(){ $('#legend').innerHTML=cats.map(cat=>`<span class="legend-item"><i style="background:${palette[cat]}"></i>${labels[cat]}</span>`).join('')+'<span class="legend-item"><i style="background:#144b50"></i>Pays du passeport</span><span class="legend-item"><i style="background:#d9e3e1"></i>Non renseigné</span>' }
function commonStats(){const p=byCode.get(state.passport);if(page==='carte'||page==='matrice')statsCards([['Sans visa',p.free,'Destinations strictement sans visa'],['Accès sans visa préalable',p.accessible,'Sans visa + arrivée + ETA'],['Pays reliés',p.connected,'Pays étrangers directement connectés'],['Routes sortantes',p.routes,"Paires d'aéroports internationales"]]);else statsCards([['Passeports comparables',profiles.length,'Enregistrements de la matrice'],['Routes internationales',data.routes.length,'Paires distinctes retenues'],['Visas renseignés',data.coverage.visaRows,'Lignes du fichier brut'],['Périodes disponibles',1,'Visas : 2026 · Routes non datées']]);}
function drawMap(){
 const plot=d3.select('#plot').html('');
 const svg=plot.append('svg').attr('viewBox','0 0 980 540')
   .attr('role','group').attr('aria-label','Carte interactive des visas et routes aériennes');
 const projection=d3.geoNaturalEarth1().fitExtent([[14,14],[966,516]],geo),path=d3.geoPath(projection),g=svg.append('g');
 g.append('path').datum({type:'Sphere'}).attr('d',path).attr('class','map-ocean');
 g.append('path').datum(d3.geoGraticule10()).attr('d',path).attr('stroke','#d7eae6').attr('stroke-opacity',.8).attr('fill','none');
 const features=geo.features.filter(f=>f.properties.iso2);
 const featureByCode=new Map(features.map(f=>[f.properties.iso2,f]));
 function clickMapCountry(event,feature){
   const code=feature.properties.iso2;
   event.stopPropagation();
   if(event.shiftKey){
     saveJourney({destination:code,focusOrigin:state.passport});
     setDetail(code,`Destination examinée depuis le passeport ${label(state.passport)}. Pour étudier son propre passeport, cliquez normalement sur le pays.`);
     setText('#selectionCount',`Destination inspectée : ${label(code)} · passeport inchangé`);
     polygons.classed('is-selected',d=>d.properties.iso2===code);
     return;
   }
   if(!choosePassport(code,'map')){
     setDetail(code,'Ce territoire ne dispose pas d’un profil de passeport complet dans les données. Il est impossible de le sélectionner comme passeport de référence ; ses informations de destination restent consultables.');
     setText('#selectionCount',`${label(code)} : aucun profil de passeport disponible`);
     polygons.classed('is-selected',d=>d.properties.iso2===code);
   }
 }
 const polygons=g.append('g').selectAll('path').data(features).join('path')
  .attr('class','country').attr('d',path)
  .attr('fill',d=>{const type=category(state.passport,d.properties.iso2);if(d.properties.iso2===state.passport)return '#144b50';if(state.category!=='all'&&type!==state.category)return '#e7eeec';return palette[type]??palette.unknown})
  .attr('stroke','white').attr('stroke-width',.65).attr('tabindex',0).attr('role','button')
  .attr('aria-label',d=>byCode.has(d.properties.iso2)
     ?`Choisir le passeport ${label(d.properties.iso2)} et actualiser les données`
     :`Consulter ${label(d.properties.iso2)} : passeport indisponible`)
  .classed('is-selected',d=>d.properties.iso2===state.selected)
  .on('mouseover',(e,d)=>showTip(e,label(d.properties.iso2),`${labels[category(state.passport,d.properties.iso2)]||labels.unknown} · ${byCode.has(d.properties.iso2)?'Cliquer = choisir ce passeport':'Pas de passeport disponible'} · Maj + clic = voir comme destination`))
  .on('mousemove',moveTip).on('mouseout',hideTip)
  .on('click',clickMapCountry)
  .on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();clickMapCountry(e,d)}});
 if(state.routesVisible){
   if(featureByCode.has(state.passport)){
     const seen=new Set();
     const layer=g.append('g').attr('class','map-routes').style('pointer-events','none');
     for(const route of routeSummary(state.passport).rows){
       if(seen.has(route.to))continue;
       if(state.category!=='all'&&category(state.passport,route.to)!==state.category)continue;
       if(!featureByCode.has(route.to))continue;
       const origin=route.sourceCoord,dest=route.targetCoord;
       const valid=coord=>Array.isArray(coord)&&coord.length===2&&Number.isFinite(coord[0])&&Number.isFinite(coord[1])&&Math.abs(coord[0])<=180&&Math.abs(coord[1])<=90;
       if(!valid(origin)||!valid(dest))continue;
       seen.add(route.to);
       const interpolate=d3.geoInterpolate(origin,dest);
       const coords=d3.range(0,1.001,.06).map(t=>interpolate(t));
       layer.append('path').datum({type:'LineString',coordinates:coords}).attr('d',path)
        .attr('fill','none').attr('stroke','#155d64').attr('stroke-width',1.15).attr('stroke-opacity',.5);
     }
   }
 }
 const zoom=d3.zoom().scaleExtent([1,8]).on('zoom',event=>{g.attr('transform',event.transform);state.mapTransform=event.transform});
 svg.call(zoom).on('dblclick.zoom',null);
 if(state.mapTransform)svg.call(zoom.transform,state.mapTransform);
 svg.append('text').attr('x',16).attr('y',528).attr('font-size',12).attr('fill','#587b7a').text('Clic : choisir un passeport · Maj + clic : examiner une destination · Molette : zoom');
 const action=$('#chartAction');action.innerHTML='<button type="button" class="action" id="resetMap">Recentrer la carte</button>';
 action.querySelector('#resetMap').addEventListener('click',()=>{svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity)});
 setText('#chartSubtitle',`Passeport : ${label(state.passport)} · couleurs : visas 2026 · arcs : pays reliés par avion.`);
 setText('#chartMicro',`${features.length} territoires cartographiés`);
 setText('#selectionCount',state.selected?`Pays examiné : ${label(state.selected)}`:'Cliquez sur un pays pour choisir son passeport');
 legend();
 setText('#howto','Sélectionnez un passeport. Les couleurs indiquent les formalités de visa ; les arcs signalent seulement une liaison recensée. Cliquez sur un pays pour le choisir comme passeport, exactement comme dans le menu « Passeport analysé » : les couleurs, routes et chiffres se mettent à jour. Maj + clic sur un pays pour consulter ses droits depuis le passeport courant. « Recentrer » ne réinitialise pas les filtres.');
 setText('#pipeline','Jointure routes–aéroports, regroupement des liaisons par pays et déduplication des paires d’aéroports. Mapping : couleur = catégorie de visa, arc = présence de liaison entre pays, géométrie = position géographique.');
}
function drawMatrix(){
 const chosen=[state.passport,state.compare,...profiles.slice().sort((a,b)=>(b.score??-1)-(a.score??-1)).map(d=>d.code)];
 const passports=[...new Set(chosen)].filter(p=>byCode.has(p)).slice(0,13);
 const search=normalizeText(state.country);
 const candidates=countries.filter(d=>d!==state.passport)
   .filter(d=>!search||normalizeText(label(d)).includes(search)||normalizeText(d).includes(search))
   .filter(d=>state.category==='all'||[state.passport,state.compare].some(p=>category(p,d)===state.category));
 const destinations=candidates.sort((a,b)=>Number(routeSummary(state.passport).destCountries.has(b))-Number(routeSummary(state.passport).destCountries.has(a))||label(a).localeCompare(label(b),'fr'));
 const dest=destinations.slice(0,search?35:22),host=$('#plot');host.innerHTML='';
 const action=$('#chartAction');action.innerHTML='';
 if(!dest.length){host.innerHTML='<div class="empty-state">Aucune destination ne correspond aux filtres. Essayez une autre recherche ou sélectionnez « Toutes les catégories ».</div>';setText('#selectionCount','0 destination affichée');legend();return}
 const wrap=document.createElement('div');wrap.className='scroll-area';
 const tbl=d3.select(wrap).append('table').attr('class','matrix-table').attr('aria-label','Exigences de visa par passeport et destination');
 const thead=tbl.append('thead').append('tr');thead.append('th').attr('class','first').text('Passeport ↓ / Destination →');
 thead.selectAll('th.destination').data(dest).join('th').attr('class','destination')
   .attr('title',d=>label(d)).attr('scope','col')
   .html(d=>`<span class="matrix-code">${escapeHtml(d)}</span><span class="matrix-name">${escapeHtml(label(d))}</span>`);
 const rows=tbl.append('tbody').selectAll('tr').data(passports).join('tr');
 rows.append('th').attr('scope','row').attr('class','first').text(d=>label(d));
 const cells=rows.selectAll('td').data(from=>dest.map(to=>({from,to,type:category(from,to),routes:connected(from,to).length}))).join('td');
 cells.append('button').attr('type','button').attr('class','cell')
  .attr('data-p',d=>d.from).attr('data-d',d=>d.to)
  .attr('aria-label',d=>`${label(d.from)} vers ${label(d.to)} : ${labels[d.type]||labels.unknown}`)
  .attr('aria-pressed',d=>String(state.selectedPair===`${d.from}|${d.to}`))
  .attr('title',d=>`${label(d.from)} → ${label(d.to)} : ${labels[d.type]||labels.unknown} ; ${d.routes} liaison(s)`)
  .style('background',d=>palette[d.type]??palette.unknown)
  .style('color',d=>d.type==='unknown'?'#314b4e':'white')
  .text(d=>d.type==='own'?'•':d.routes?'↗':'·')
  .on('mouseenter',(e,d)=>showTip(e,`${label(d.from)} → ${label(d.to)}`,`${labels[d.type]||labels.unknown} · ${d.routes} liaison(s) directe(s)`))
  .on('mousemove',moveTip).on('mouseleave',hideTip)
  .on('click',(e,d)=>{
    state.selectedPair=`${d.from}|${d.to}`;
    saveJourney({focusOrigin:d.from,destination:d.to});
    cells.selectAll('button').attr('aria-pressed',v=>String(state.selectedPair===`${v.from}|${v.to}`));
    setDetail(d.to,`Matrice : ${label(d.from)} → ${label(d.to)}.`,d.from);
    setText('#selectionCount',`${label(d.from)} → ${label(d.to)} sélectionné`);
  });
 host.appendChild(wrap);
 host.insertAdjacentHTML('beforeend','<div class="table-caption">↗ : route directe recensée entre les deux pays · · : aucune liaison recensée. Défilement horizontal possible ; les en-têtes restent visibles.</div>');
 setText('#chartSubtitle','Chaque case est un couple passeport–destination. La couleur représente l’exigence de visa ; le symbole indique une route recensée.');
 setText('#chartMicro',destinations.length>dest.length?`Aperçu des ${dest.length} premières destinations sur ${destinations.length} · utilisez la recherche pour cibler un pays`:'Toutes les destinations correspondant aux filtres sont visibles');
 setText('#selectionCount',`${passports.length} passeports × ${dest.length} destinations`);
 legend();
 setText('#howto','Choisissez deux passeports, puis cherchez une destination. Le filtre « Exigence de visa » retient les destinations correspondant à au moins un de ces deux passeports. Cliquez sur une cellule pour afficher les valeurs précises du couple sans changer votre passeport principal.');
 setText('#pipeline','Matrice des catégories par origine et destination, croisée avec les paires d’aéroports internationales. Mapping : ligne = passeport, colonne = destination, couleur = formalité, flèche = présence de liaison recensée.');
}
function drawScatter(){
 const xKey=state.xMetric,yKey=state.yMetric;
 const rows=profiles.filter(d=>Number.isFinite(d[xKey])&&Number.isFinite(d[yKey]));
 const width=940,height=560,m={top:28,right:42,bottom:83,left:88},innerW=width-m.left-m.right;
 const svg=d3.select('#plot').html('').append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','group').attr('aria-label','Corrélation entre mobilité des passeports et connectivité aérienne');
 $('#chartAction').innerHTML='';
 const x=d3.scaleLinear().domain([0,d3.max(rows,d=>d[xKey])||1]).nice().range([m.left,width-m.right]);
 const yDomain=[0,d3.max(rows,d=>d[yKey])||1];
 const y=(state.yScale==='linear'?d3.scaleLinear():d3.scaleSqrt()).domain(yDomain).nice().range([height-m.bottom,m.top]);
 const r=d3.scaleSqrt().domain([0,d3.max(rows,d=>d.routes)||1]).range([5,14]);
 svg.append('g').attr('class','grid').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(7).tickSize(-innerW).tickFormat(''));
 svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-m.bottom})`).call(d3.axisBottom(x).ticks(8));
 svg.append('g').attr('class','axis').attr('transform',`translate(${m.left},0)`).call(d3.axisLeft(y).ticks(7));
 const xName={accessible:'Destinations sans visa préalable',free:'Destinations strictement sans visa',required:'Destinations avec visa préalable'}[xKey];
 const yName={connected:'Nombre de pays reliés',routes:'Paires d’aéroports sortantes'}[yKey];
 svg.append('text').attr('x',width/2).attr('y',height-15).attr('text-anchor','middle').attr('fill','#587579').attr('font-size',14).text(xName);
 svg.append('text').attr('transform',`translate(21,${height/2}) rotate(-90)`).attr('text-anchor','middle').attr('fill','#587579').attr('font-size',14).text(yName);
 const clipID='scatterPlotClip';svg.append('defs').append('clipPath').attr('id',clipID).append('rect').attr('x',m.left).attr('y',m.top).attr('width',innerW).attr('height',height-m.bottom-m.top);
 const dots=svg.append('g').attr('clip-path',`url(#${clipID})`).selectAll('circle').data(rows).join('circle')
  .attr('cx',d=>x(d[xKey])).attr('cy',d=>y(d[yKey])).attr('r',d=>r(d.routes))
  .attr('fill',d=>d.code===state.passport?'#da9756':d.code===state.compare?'#785db8':'#117c73')
  .attr('fill-opacity',d=>(d.code===state.passport||d.code===state.compare)?.97:.47)
  .attr('tabindex',0).attr('role','button').attr('aria-label',d=>`Examiner ${d.name}`)
  .style('cursor','pointer')
  .on('mousemove',(e,d)=>{showTip(e,d.name,`${xName} : ${d[xKey]} · ${yName} : ${d[yKey]}`);moveTip(e)})
  .on('mouseout',hideTip)
  .on('click',(e,d)=>select(d))
  .on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(d)}});
 const select=d=>{saveJourney({examined:d.code});setDetail(d.code,`${xName} : ${d[xKey]} · ${yName} : ${d[yKey]}`);updateSelected()};
 const updateSelected=()=>dots.attr('stroke',d=>d.code===state.selected?'#092d32':'white').attr('stroke-width',d=>d.code===state.selected?3:1.25);
 updateSelected();
 const xmean=d3.mean(rows,d=>d[xKey]),ymean=d3.mean(rows,d=>d[yKey]);
 const covariance=d3.sum(rows,d=>(d[xKey]-xmean)*(d[yKey]-ymean)),varx=d3.sum(rows,d=>(d[xKey]-xmean)**2),vary=d3.sum(rows,d=>(d[yKey]-ymean)**2);
 const correlation=varx>0&&vary>0?covariance/Math.sqrt(varx*vary):null;
 if(correlation!==null){const slope=covariance/varx,intercept=ymean-slope*xmean,a=0,b=d3.max(rows,d=>d[xKey]);
   svg.append('line').attr('clip-path',`url(#${clipID})`).attr('x1',x(a)).attr('x2',x(b)).attr('y1',y(intercept+slope*a)).attr('y2',y(intercept+slope*b))
    .attr('stroke','#c16a39').attr('stroke-width',2.3).attr('stroke-dasharray','6 5').attr('opacity',.9).style('pointer-events','none');}
 setText('#chartSubtitle','Un point = un pays ; sa taille représente les routes distinctes. Les points orange indiquent le passeport de référence.');
 setText('#chartMicro',correlation===null?'Corrélation indéterminée':`Corrélation descriptive de Pearson : r = ${correlation.toFixed(2).replace('.',',')}`);
 setText('#selectionCount',`${rows.length} passeports analysés`);
 $('#legend').innerHTML='<span class="legend-item"><i style="background:#117c73"></i>Autres pays</span><span class="legend-item"><i style="background:#da9756"></i>Passeport étudié</span><span class="legend-item"><i style="background:#785db8"></i>Passeport comparé</span><span class="legend-item"><i style="background:#c16a39"></i>Régression linéaire</span>';
 setText('#howto','Changez les indicateurs sur les axes et la répartition verticale. L’échelle « racine carrée » sépare visuellement les pays peu connectés sans modifier leurs valeurs réelles ni le coefficient de corrélation. Cliquez sur un point pour inspecter le pays.');
 setText('#pipeline','Comptes par formalité de visa puis agrégation des routes sortantes distinctes. Mapping : position X = visa, Y = connectivité, taille = nombre de routes, couleur = passeport choisi. Le coefficient r est purement descriptif.');
}
function drawParallel(){
 const dims=[
  {key:'free',label:'Sans visa',short:'Destinations sans visa',help:'Pays accessibles sans visa classique ni autorisation électronique'},
  {key:'arrival',label:'Visa à l’arrivée',short:'Visa à l’arrivée',help:'Visa délivré à l’arrivée'},
  {key:'required',label:'Visa préalable',short:'Visa classique requis',help:'Visa à obtenir avant le départ'},
  {key:'connected',label:'Pays reliés',short:'Pays directement reliés',help:'Nombre de pays desservis par des routes enregistrées'},
  {key:'routes',label:'Routes sortantes',short:'Paires d’aéroports',help:'Paires d’aéroports internationales distinctes'}
 ];
 const width=1030,height=555,m={top:74,right:90,bottom:48,left:100};
 const x=d3.scalePoint().domain(dims.map(d=>d.key)).range([m.left,width-m.right]);
 const maxima=Object.fromEntries(dims.map(dim=>[dim.key,d3.max(profiles,p=>p[dim.key])||1]));
 const y=Object.fromEntries(dims.map(dim=>[dim.key,d3.scaleLinear().domain([0,maxima[dim.key]]).nice().range([height-m.bottom,m.top])]));
 const colorKey=state.colorMetric;
 const ext=d3.extent(profiles,d=>d[colorKey]);
 const color=d3.scaleSequential(d3.interpolatePuBuGn).domain(ext);
 const matches=d=>dims.every(dim=>!state.brush[dim.key]||(d[dim.key]>=state.brush[dim.key][0]&&d[dim.key]<=state.brush[dim.key][1]));
 $('#chartAction').innerHTML='';
 const root=d3.select('#plot').html('');
 // La comparaison reste lisible même si presque 200 chemins se superposent.
 const summary=root.append('div').attr('class','profile-focus-summary').attr('id','profileFocusSummary').attr('aria-live','polite');
 const svg=root.append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label','Coordonnées parallèles : cinq indicateurs et comparaison mise en évidence');
 const line=d3.line().defined(v=>Number.isFinite(v[1]));
 const path=d=>line(dims.map(dim=>[x(dim.key),y[dim.key](d[dim.key])]));
 const paths=svg.append('g').attr('class','profile-paths').selectAll('path').data(profiles).join('path')
  .attr('class','profile-line').attr('d',path).attr('fill','none').attr('tabindex',0)
  .attr('role','button').attr('aria-label',d=>`Examiner le profil de ${d.name}`)
  .style('cursor','pointer')
  .on('mousemove',(event,d)=>{showTip(event,d.name,`Sans visa ${d.free} · Pays reliés ${d.connected} · Routes ${d.routes}`);moveTip(event)})
  .on('mouseout',hideTip)
  .on('click',(event,d)=>selectProfile(d.code))
  .on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectProfile(d.code)}});
 // Couche de comparaison indépendante : halo blanc, référence bleue et sélection orange.
 const focus=svg.append('g').attr('class','profile-spotlight').style('pointer-events','none');
 const halo=focus.append('path').attr('class','focus-halo').attr('fill','none').attr('stroke','#fff').attr('stroke-width',11).attr('stroke-linejoin','round');
 const referenceLine=focus.append('path').attr('class','focus-reference').attr('fill','none').attr('stroke','#126a87').attr('stroke-width',4).attr('stroke-dasharray','9 6');
 const focusLine=focus.append('path').attr('class','focus-selected').attr('fill','none').attr('stroke','#e36a24').attr('stroke-width',5.5).attr('stroke-linejoin','round').attr('stroke-linecap','round');
 const focusDots=focus.append('g').attr('class','focus-markers');
 const host=document.createElement('div');host.className='profile-toolbar';host.innerHTML='<div class="profile-status" role="status" aria-live="polite" id="profileStatus"></div><div class="profile-quick-title" id="profileQuickTitle"></div><div class="pill-row" id="profileQuickList"></div>';
 document.querySelector('#plot').appendChild(host);
 const axes=svg.append('g').selectAll('g').data(dims).join('g')
  .attr('transform',dim=>`translate(${x(dim.key)},0)`)
  .each(function(dim){d3.select(this).attr('class','axis').call(d3.axisLeft(y[dim.key]).ticks(6))});
 axes.append('text').attr('x',0).attr('y',-21).attr('text-anchor','middle')
  .attr('fill','#244f53').attr('font-weight',800).attr('font-size',12).text(dim=>dim.label);
 function selectProfile(code){
  if(!byCode.has(code))return;
  state.selected=code;
  saveJourney({examined:code});
  setDetail(code,'Le trait orange et les points indiquent ce pays. Le trait bleu en pointillés représente le passeport de référence ; la comparaison chiffrée se met à jour ci-dessus.');
  const pick=$('#profilePicker');if(pick)pick.value=code;
  refresh();
 }
 function refresh(){
  const filtered=profiles.filter(matches);
  const selected=byCode.get(state.selected)||byCode.get(state.passport);
  const reference=byCode.get(state.passport);
  if(!selected||!reference)return;
  const included=matches(selected);
  paths.attr('stroke',d=>color(d[colorKey]))
   .attr('stroke-width',1.75)
   .attr('stroke-opacity',d=>d.code===selected.code||d.code===reference.code?0:matches(d)?0.22:0.025)
   .attr('stroke-dasharray',null).classed('selected-profile',d=>d.code===selected.code);
  const different=selected.code!==reference.code;
  halo.attr('d',path(selected));
  focusLine.attr('d',path(selected)).attr('stroke-dasharray',included?null:'8 5');
  referenceLine.attr('d',different?path(reference):null).style('display',different?null:'none');
  const marks=focusDots.selectAll('g.focus-point').data(dims,dim=>dim.key).join(enter=>{
    const group=enter.append('g').attr('class','focus-point');
    group.append('circle').attr('r',7.5).attr('fill','#e36a24').attr('stroke','#fff').attr('stroke-width',2.5);
    group.append('rect').attr('class','focus-value-bg').attr('x',12).attr('y',-11).attr('rx',6).attr('height',21).attr('fill','#fff').attr('stroke','#efd5c3');
    group.append('text').attr('class','focus-value-text').attr('x',19).attr('y',4).attr('fill','#a54616').attr('font-size',12).attr('font-weight',800);
    return group;
  });
  marks.attr('transform',dim=>`translate(${x(dim.key)},${y[dim.key](selected[dim.key])})`)
    .each(function(dim){const t=d3.select(this).select('text').text(stat(selected[dim.key]));const n=t.node();const w=n?n.getComputedTextLength():28;d3.select(this).select('rect').attr('width',w+17)});
  const comparison=dims.map(dim=>{
   const a=selected[dim.key],b=reference[dim.key],max=maxima[dim.key]||1;
   const delta=a-b,deltaText=delta>0?`+${stat(delta)}`:stat(delta);
   const deltaLabel=delta===0?'identique à la référence':`${deltaText} par rapport à la référence`;
   return `<div class="profile-metric" data-metric="${dim.key}" title="${escapeHtml(dim.help)}">
    <span class="metric-title">${escapeHtml(dim.short)}</span>
    <div class="metric-value-row"><strong class="metric-selected">${stat(a)}</strong><span class="metric-delta">${deltaLabel}</span></div>
    <div class="metric-bar"><div class="metric-track ref" style="width:${(100*b/max).toFixed(2)}%"></div><div class="metric-track chosen" style="width:${(100*a/max).toFixed(2)}%"></div></div>
    <span class="metric-ref-label">Référence : ${stat(b)}</span>
   </div>`;
  }).join('');
  summary.html(`<div class="profile-focus-heading">
    <div><span class="focus-eyebrow">Comparaison des pays</span><h3><span class="focus-orange">${escapeHtml(selected.name)}</span><span class="focus-versus"> vs </span><span class="focus-blue">${escapeHtml(reference.name)}</span></h3></div>
    <span class="focus-state">${included?'Dans les filtres':'Hors des filtres'}</span>
   </div>
   <p>La <b>ligne orange</b> et ses cinq points représentent <b>${escapeHtml(selected.name)}</b>. La <b>ligne bleue pointillée</b> indique ${escapeHtml(reference.name)}. Les traits gris donnent le contexte des autres pays. Plus un point est haut sur un axe, plus la valeur correspondante est grande <b>(échelles différentes selon les axes)</b>.</p>
   <div class="profile-metrics">${comparison}</div>`);
  host.querySelector('#profileStatus').innerHTML=`<b>${escapeHtml(selected.name)}</b> ${included?'correspond aux filtres actuels':'est hors des intervalles (orange en pointillés)'}. Pour voir une autre forme de ligne, changez « Pays à examiner » ou cliquez sur un autre tracé.`;
  const quick=filtered.slice().sort((a,b)=>b[colorKey]-a[colorKey]).slice(0,12);
  host.querySelector('#profileQuickTitle').textContent=`${filtered.length} pays correspondent aux filtres · ${quick.length} suggestions (le sélecteur comprend tous les pays)`;
  const list=host.querySelector('#profileQuickList');
  list.innerHTML=quick.length?quick.map(d=>`<button type="button" class="pill ${d.code===selected.code?'active':''}" data-code="${d.code}" aria-pressed="${d.code===selected.code?'true':'false'}">${escapeHtml(d.name)}</button>`).join(''):'<span class="micro">Aucun pays ne correspond à ces filtres. Élargissez un intervalle ou effacez-les.</span>';
  list.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>selectProfile(button.dataset.code)));
  setText('#selectionCount',`${filtered.length} / ${profiles.length} pays correspondent aux filtres`);
 }
 axes.each(function(dim){
  const axis=d3.select(this);
  const brush=d3.brushY().extent([[-13,m.top],[13,height-m.bottom]])
   .on('brush end',event=>{
    if(!event.sourceEvent)return;
    if(event.selection){const vals=event.selection.map(y[dim.key].invert);state.brush[dim.key]=[Math.min(...vals),Math.max(...vals)]}
    else delete state.brush[dim.key];
    refresh();
   });
  const group=axis.append('g').attr('class','brush').call(brush);
  if(state.brush[dim.key]){const [lo,hi]=state.brush[dim.key];group.call(brush.move,[y[dim.key](hi),y[dim.key](lo)])}
  group.on('dblclick',()=>{delete state.brush[dim.key];group.call(brush.move,null);refresh()});
 });
 focus.raise(); // Au-dessus du brushing, sans intercepter les clics ni les sélections.
 refresh();
 setText('#chartSubtitle','Chaque ligne traverse cinq indicateurs. Orange = pays examiné, bleu pointillé = référence. Le comparateur chiffré ci-dessus suit votre sélection.');
 setText('#chartMicro','Choisir un autre pays = mise à jour de la ligne orange, des cinq points et des écarts · Glisser sur un axe = filtrer');
 $('#legend').innerHTML='<span class="legend-item"><i style="background:#e36a24"></i>Ligne et points orange : pays examiné</span><span class="legend-item"><i style="background:#126a87"></i>Ligne bleue pointillée : référence</span><span class="legend-item"><i style="background:#88a9aa"></i>Autres pays</span>';
 setText('#howto','Choisissez un passeport de référence, puis un autre pays dans « Pays à examiner ». Les cinq nombres, les petits diagrammes à barres et le tracé orange changent ensemble. Sur chaque axe, un point placé plus haut indique une valeur plus grande. Comparez les positions d’un même axe entre pays : les axes n’ont pas la même échelle. Glissez verticalement sur un axe pour filtrer, et double-cliquez pour retirer le filtre.');
 setText('#pipeline','Comptages par catégorie de visa, agrégation des routes sortantes par origine, puis jointure par code pays. Mapping : axe vertical = valeur de l’indicateur (échelle propre à chaque axe) ; trait = profil de pays ; orange = profil examiné ; bleu pointillé = référence ; points et badges = valeurs exactes ; gris = contexte ; atténuation = hors filtre.');
}
function renderAll(){renderControls();commonStats();setDetail(state.selected||state.passport);if(page==='carte')drawMap();if(page==='matrice')drawMatrix();if(page==='correlation')drawScatter();if(page==='paralleles')drawParallel();renderJourney()}
async function bootstrap(){try{if(!window.d3)throw new Error('D3.js ne s’est pas chargé. Vérifie la connexion Internet (bibliothèque externe).');const [d,g]=await Promise.all([fetch('data/borderless-fixed.json').then(r=>{if(!r.ok)throw Error('Données JSON introuvables');return r.json()}),fetch('data/world.geojson').then(r=>{if(!r.ok)throw Error('Carte GeoJSON introuvable');return r.json()})]);data=d;geo=g;try{const cached=JSON.parse(sessionStorage.getItem('borderless.journey.v1')||'null');if(cached&&typeof cached==='object'){for(const key of Object.keys(journey)){if(typeof cached[key]==='string')journey[key]=cached[key]}}else{const saved=sessionStorage.getItem('borderless.passport');if(saved&&data.matrix[saved])journey.origin=saved}}catch{}build();const query=new URLSearchParams(location.search);for(const [key,param] of [['origin','passport'],['compare','compare'],['destination','destination'],['examined','examined']]){const value=query.get(param);if(value&&/^[A-Z]{2}$/.test(value))journey[key]=value};if(page==='carte'&&!query.has('passport')&&byCode.has(journey.focusOrigin))journey.origin=journey.focusOrigin;if(byCode.has(journey.origin))state.passport=journey.origin;if(byCode.has(journey.compare))state.compare=journey.compare;state.selected=page==='paralleles'?(byCode.has(journey.examined)&&journey.examined!==state.passport?journey.examined:byCode.has(state.compare)&&state.compare!==state.passport?state.compare:state.passport):page==='carte'&&journey.destination&&countries.includes(journey.destination)?journey.destination:state.passport;saveJourney({origin:state.passport,compare:state.compare});renderAll()}catch(e){console.error('Borderless initialisation',e);$('#plot').innerHTML=`<div class="error"><b>Impossible de charger l'application.</b><p>${escapeHtml(e.message)}</p><p>Ouvre le projet avec un serveur local (make serve), et non avec un double-clic sur le fichier HTML.</p></div>`;$('#controls').innerHTML='';$('#stats').innerHTML=''}}
bootstrap();
