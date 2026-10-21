// Focused UI regression checks. Every API is mocked; no bookings are created.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const code = ts.transpileModule(fs.readFileSync(__dirname+'/src/BookingScreen.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function harness() {
  let values=[], index=0, refs=[], ri=0, calls=[], booked=0;
  const hooks={...React,useState(initial){const i=index++;if(!(i in values))values[i]=initial;return [values[i],v=>values[i]=typeof v==='function'?v(values[i]):v]},useRef(v){const i=ri++;return refs[i]??(refs[i]={current:v})},useEffect(){}};
  const ui={Card:'Card',Button:'Button',Choices:'Choices',Field:'Field',Route:'Route',s:{},colors:{}};
  const mod={exports:{}};
  new Function('require','module','exports',code)(name=>name==='react'?hooks:name==='react/jsx-runtime'?require(name):name==='react-native'?{Text:'Text',View:'View',Pressable:'Pressable',BackHandler:{}}:name==='expo-crypto'?{randomUUID:()=> 'test-key'}:name==='./api'?{money:n=>String(n),api:async(path,data)=>{calls.push({path,data});return path==='quote'?{id:'quote-test',total:24900}:{}}}:name==='./ui'?ui:name==='./AddressPicker'?{default:'AddressPicker'}:name==='./SchedulePicker'?{default:'SchedulePicker'}:(()=>{throw Error(name)})(),mod,mod.exports);
  function render(){index=ri=0;return mod.exports.default({onBooked:()=>booked++})}
  function nodes(node,out=[]){if(Array.isArray(node))node.forEach(n=>nodes(n,out));else if(node&&typeof node==='object'){out.push(node);nodes(node.props?.children,out)}return out}
  render();
  return {values,calls,get booked(){return booked}, render:()=>nodes(render()), find:(type,predicate=()=>true)=>nodes(render()).find(n=>n.type===type&&predicate(n.props))};
}
const point={label:'Pickup',lat:17.4,lng:78.4};
// One-way requires both locations. Round trip must not collect an unused destination.
for (const type of ['one-way','return','outstation']) {
  const h=harness(); h.values[4]=type;h.values[2]=point;
  const addresses=h.render().filter(n=>n.type==='AddressPicker');
  assert.equal(addresses.length,type==='return'?1:2,type+' address fields');
  assert.equal(h.find('Button',p=>p.title==='Plan your journey →').props.disabled,type!=='return');
  h.values[3]={...point,label:'Destination'};
  h.find('Button',p=>p.title==='Plan your journey →').props.onPress();
  assert.equal(h.values[0],1);
  assert.equal(!!h.find('SchedulePicker'),type==='outstation');
  const groups=h.render().filter(n=>n.type==='Choices').map(n=>n.props.values.map(v=>v.value));
  assert.equal(groups.some(g=>g.includes('2')&&g.includes('8')),type==='return');
  assert.equal(groups.some(g=>g.includes('24')&&g.includes('72')),type==='outstation');
  assert.equal(groups.some(g=>g.includes('return')&&g.includes('one-way')),type==='outstation');
}
// Scheduling is reachable before either address is filled.
{const h=harness();assert.equal(!!h.find('SchedulePicker'),false);h.find('Choices',p=>p.values.some(v=>v.value==='later')).props.set('later');assert.ok(h.find('SchedulePicker'));assert.equal(h.find('Button',p=>p.title==='Plan your journey →').props.disabled,true);}
// Review must stay gated until a real estimate arrives, and no submit happens on navigation.
(async()=>{
  const h=harness();h.values[2]=point;h.values[3]={...point,label:'Destination'};h.values[0]=1;
  assert.equal(h.find('Button',p=>p.title==='Review estimate →').props.disabled,true);
  h.values[11]={total:24900,bookingAvailable:true,expiresAt:Date.now()+60000};h.values[12]={cityId:'hyderabad',status:'served'};
  h.find('Button',p=>p.title==='Review estimate →').props.onPress();assert.equal(h.values[0],2);assert.equal(h.calls.length,0);
  await h.find('Button',p=>p.title==='Request a driver →').props.onPress();
  assert.equal(h.calls[0].path,'quote');assert.equal(h.calls[0].data.tripType,'one-way');assert.equal(h.calls[1].path,'bookings');assert.equal(h.booked,1);
  const expired=harness();expired.values[0]=2;expired.values[2]=point;expired.values[3]=point;expired.values[11]={total:24900,bookingAvailable:true,expiresAt:1};expired.values[12]={cityId:'hyderabad'};
  await expired.find('Button',p=>p.title==='Request a driver →').props.onPress();assert.equal(expired.calls.length,0);assert.match(expired.values[14],/expired/);
  console.log('PASS: one-way, round-trip, outstation field rules; quote review gating; fresh quote before booking; expired estimate blocks submission. All APIs mocked.');
})().catch(e=>{console.error(e);process.exitCode=1});
