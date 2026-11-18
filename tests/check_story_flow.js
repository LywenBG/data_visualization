/** Contrôle du contexte transmis entre les quatre étapes, sans CDN ni serveur. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dataset=JSON.parse(fs.readFileSync(path.join(root,'data/borderless-fixed.json'),'utf8'));
const code=fs.readFileSync(path.join(root,'src/app.js'),'utf8').replace(/\nbootstrap\(\);\s*$/,'');
const elements=new Map();
const links=[{getAttribute:()=> 'carte.html',set href(v){this.value=v}},{getAttribute:()=> 'correlation.html',set href(v){this.value=v}}];
function element(key){if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',style:{},getAttribute(){return null},querySelector(){return null}});return elements.get(key)}
const sessionStorage={store:{},getItem(k){return this.store[k]||null},setItem(k,v){this.store[k]=v}};
const doc={body:{dataset:{page:'matrice'}},querySelector:element,querySelectorAll:(sel)=>sel==='.story-step'?links:[]};
const ctx=vm.createContext({document:doc,window:{innerWidth:1100,innerHeight:800},sessionStorage,URLSearchParams,Intl,Number,Math,Map,Set,Object,Array,String,RegExp,JSON,console,__data:dataset});
vm.runInContext(code,ctx);
vm.runInContext('data=__data;build();state.selected=state.passport;state.passport="FR";state.compare="DZ";saveJourney({origin:"FR",compare:"DZ",focusOrigin:"DZ",destination:"JP"});',ctx);
assert.match(element('#storyCarry').textContent,/Algérie.*Japon/);
const href=vm.runInContext('journeyHref("carte")',ctx);
assert.match(href,/carte\.html\?passport=DZ/);
assert.match(href,/destination=JP/);
assert.match(href,/compare=DZ/);
vm.runInContext('saveJourney({examined:"JP"});',ctx);
assert.match(vm.runInContext('journeyHref("paralleles")',ctx),/examined=JP/);
assert.equal(JSON.parse(sessionStorage.getItem('borderless.journey.v1')).destination,'JP');
for(const [i,page] of ['matrice','carte','correlation','paralleles'].entries()){
 const html=fs.readFileSync(path.join(root,page+'.html'),'utf8');
 assert(html.includes(`Étape ${String(i+1).padStart(2,'0')} /`),page);
 assert(html.includes('id="storyNext"'),page);
 assert(html.includes('id="storyContext"'),page);
 assert(html.includes('id="storyCarry"'),page);
 const labels=['Comparer les visas','Voir les routes','Chercher une tendance','Comprendre les écarts'];
 assert(labels.every(v=>html.includes(v)),page);
}
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('matrice.html'));
console.log('OK : ordre du parcours, transfert des pays et destination, étapes et boutons de navigation');
