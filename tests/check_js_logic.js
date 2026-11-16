/** Tests de logique sans dépendance D3 ou connexion Internet. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dataset=JSON.parse(fs.readFileSync(path.join(root,'data','borderless-fixed.json'),'utf8'));
const script=fs.readFileSync(path.join(root,'src','app.js'),'utf8').replace(/\nbootstrap\(\);\s*$/,'');
const elements=new Map();
function element(selector){if(!elements.has(selector))elements.set(selector,{innerHTML:'',textContent:'',style:{},querySelector(){return null},addEventListener(){}});return elements.get(selector)}
const context=vm.createContext({
 document:{body:{dataset:{page:"carte"}},querySelector:element},
 Intl,Number,Math,Map,Set,Object,Array,String,RegExp,JSON,console,
 window:{innerWidth:1200,innerHeight:800},
 __dataset:dataset,
});
vm.runInContext(script,context,{filename:'src/app.js'});
vm.runInContext('data=__dataset;build();state.selected=state.passport;',context);
assert.equal(vm.runInContext('profiles.length',context),199);
assert(vm.runInContext('routeSummary("FR").connected',context)>0);
assert(vm.runInContext('categoryCounts("FR").free',context)>0);
assert.equal(vm.runInContext('category("FR","XX")',context),'unknown');
vm.runInContext('setDetail("JP","Détail test","FR")',context);
assert.match(element('#details').innerHTML,/France.*Japon/s);
assert.match(element('#details').innerHTML,/Paires d.aéroports recensées/);
for(const section of ['carte','matrice','correlation','paralleles']){
 vm.runInContext(`state.passport='FR';state.routesVisible=false;`,context);
 // page est une constante calculée au chargement ; créer un environnement neuf par page
 const local=new Map();
 const localElement=selector=>{if(!local.has(selector))local.set(selector,{innerHTML:'',textContent:'',style:{},querySelector(){return null},addEventListener(){}});return local.get(selector)};
 const c=vm.createContext({document:{body:{dataset:{page:section}},querySelector:localElement},Intl,Number,Math,Map,Set,Object,Array,String,RegExp,JSON,console,window:{innerWidth:1200,innerHeight:800},__dataset:dataset});
 vm.runInContext(script,c);
 vm.runInContext('data=__dataset;build();state.selected=state.passport;state.routesVisible=false;renderControls()',c);
 const html=localElement('#controls').innerHTML;
 assert(html.includes('id="passport"'),section);
 assert(!html.includes('type="file"'),section);
 if(section==='carte')assert.match(html,/id="routesToggle"[^>]*>/);
 if(section==='correlation')assert(html.includes('id="yScale"'));
 if(section==='paralleles')assert(html.includes('id="profilePicker"'));
}
console.log('OK: calculs, informations de trajet, commandes des 4 pages et état des routes');
