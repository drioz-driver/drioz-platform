import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync(new URL('../legacy-demo/index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(hash=''){
 const els={},storage={};const context=vm.createContext({document:{getElementById:id=>els[id]??={innerHTML:'',value:'',classList:{toggle(){}}}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},location:{hash},window:{scrollTo(){},addEventListener(){}},prompt:()=> '1234',confirm:()=>true,alert(){}});
 vm.runInContext(source,context);return {context,els,storage,run:s=>vm.runInContext(s,context)};
}
test('role buttons work even when the clicked element has an ARIA role property',()=>{
 const {run,els,context}=setup();for(const [role,heading] of [['Driver','Your next opportunity.'],['Admin','A clear view of your city.'],['Customer','Take the']]){
 const handler=els.nav.innerHTML.match(new RegExp(`onclick="([^"]+)"[^>]*>${role}</button>`))[1];context.clicked={role:''};run(`(function(){with(this){${handler}}}).call(clicked)`);assert.ok(els.app.innerHTML.includes(heading));assert.equal(run('role'),role);
 }
});
test('customer booking is accepted by driver and completed in admin view',()=>{
 const {run,els,storage}=setup();run(`current={id:1001,city:'Hyderabad',type:'One-way',pickup:'Madhapur',destination:'Airport',gear:'Automatic',when:'Now',fare:249,status:'Requested'};book();switchRole('Driver')`);
 assert.ok(els.app.innerHTML.includes('Accept demo job'));run('advance(1001)');assert.equal(run('bookings[0].status'),'Assigned');run('advance(1001)');assert.equal(run('bookings[0].status'),'Arrived');run('advance(1001)');assert.equal(run('bookings[0].status'),'In progress');run('advance(1001);switchRole("Admin")');assert.equal(run('bookings[0].status'),'Completed');assert.ok(els.app.innerHTML.includes('Completed'));assert.equal(JSON.parse(storage['drioz-demo-v1'])[0].status,'Completed');
});
test('direct role links and city filtering work',()=>{
 const {run,els}=setup('#driver');assert.equal(run('role'),'Driver');run(`bookings=[{id:1,city:'Mumbai',status:'Requested',type:'Hourly',pickup:'Bandra',destination:'Airport',fare:698}];render()`);assert.ok(!els.app.innerHTML.includes('Accept demo job'));run(`city='Mumbai';render()`);assert.ok(els.app.innerHTML.includes('Accept demo job'));
});
test('partner tabs show earnings, trip history and account checklist',()=>{
 const {run,els}=setup('#driver');run(`partnerTab('trips')`);assert.ok(els.app.innerHTML.includes('Your first journey is ahead.'));run(`partnerTab('earnings')`);assert.ok(els.app.innerHTML.includes('Earnings activity'));assert.ok(els.app.innerHTML.includes('No real wallet'));run(`partnerTab('account')`);assert.ok(els.app.innerHTML.includes('Identity &amp; licence')||els.app.innerHTML.includes('Identity & licence'));run(`partnerTab('overview');online=false;render()`);assert.ok(els.app.innerHTML.includes('Go online'));
});
