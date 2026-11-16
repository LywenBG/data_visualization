/** Test de la sélection commune : aucun navigateur, CDN ou D3 requis pour la logique. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/app.js'),'utf8').replace(/\nbootstrap\(\);\s*$/,'');
const ds=JSON.parse(fs.readFileSync(path.join(root,'data/borderless-fixed.json'),'utf8'));
function contextFor(page){
 const c=vm.createContext({
  document:{body:{dataset:{page}},querySelector:()=>({style:{},innerHTML:'',querySelector(){return null}})},
  sessionStorage:{store:{},setItem(k,v){this.store[k]=v},getItem(k){return this.store[k]}},
  window:{innerWidth:1100,innerHeight:800}, Intl,Number,Math,Map,Set,Object,Array,String,RegExp,JSON,console,ds
 });
 vm.runInContext(source,c,{filename:'app.js'});
 vm.runInContext('data=ds;build();state.selected=state.passport;renderAll=()=>{globalThis.renders=(globalThis.renders||0)+1}',c);
 return c;
}
const map=contextFor('carte');
assert.equal(vm.runInContext("choosePassport('JP','map')",map),true);
assert.equal(vm.runInContext('state.passport',map),'JP');
assert.equal(vm.runInContext('state.selected',map),'JP');
assert.equal(vm.runInContext('renders',map),1);
assert.equal(vm.runInContext("sessionStorage.getItem('borderless.passport')",map),'JP');
vm.runInContext("state.category='free';state.routesVisible=false;state.mapTransform={k:2,x:10,y:20};choosePassport('DZ','select')",map);
assert.equal(vm.runInContext('state.passport',map),'DZ');
assert.equal(vm.runInContext('state.routesVisible',map),false);
assert.equal(vm.runInContext('state.category',map),'free');
assert.equal(vm.runInContext('state.mapTransform.k',map),2);
assert.equal(vm.runInContext("choosePassport('XX','map')",map),false);
assert.equal(vm.runInContext('state.passport',map),'DZ');
assert.match(source,/\.on\('click',clickMapCountry\)/);
assert.match(source,/if\(event\.shiftKey\)/);
const parallel=contextFor('paralleles');
vm.runInContext("state.passport='FR';state.selected='JP';choosePassport('DZ','select')",parallel);
assert.equal(vm.runInContext('state.selected',parallel),'JP');
assert.equal(vm.runInContext('state.passport',parallel),'DZ');
for(const token of ['profile-spotlight','focus-markers','focus-selected','focus-reference','profile-metrics','profile-metric','metric-delta','focus.raise()'])assert(source.includes(token),token);
const html=fs.readFileSync(path.join(root,'paralleles.html'),'utf8');
assert(html.includes('ligne orange') || html.includes('tracés orange'));
console.log('OK: sélection carte/menu, état partagé, raccourci Maj+clic, comparateur multivarié');
