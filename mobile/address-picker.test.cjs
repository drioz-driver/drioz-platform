// Regression: a searched destination must move the map before confirmation.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react');
const code=ts.transpileModule(fs.readFileSync(__dirname+'/src/AddressPicker.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
let values=[],refs=[],i=0,r=0,effects=[],selected=[],camera=[];
const hooks={...React,useState(v){const n=i++;if(!(n in values))values[n]=v;return[values[n],v=>values[n]=typeof v==='function'?v(values[n]):v]},useRef(v){const n=r++;return refs[n]??(refs[n]={current:v})},useEffect(fn){effects.push(fn)}};
const mod={exports:{}};
new Function('require','module','exports',code)(name=>name==='react'?hooks:name==='react/jsx-runtime'?require(name):name==='react-native'?{Modal:'Modal',View:'View',Text:'Text',Pressable:'Pressable',Keyboard:{dismiss(){}}}:name==='react-native-maps'?{default:'Map',Marker:'Marker'}:name==='react-native-webview'?{WebView:'WebView'}:name==='expo-location'?{}:name==='react-native-safe-area-context'?{SafeAreaView:'SafeAreaView'}:name==='./ui'?{Button:'Button',Loading:'Loading',colors:{},s:{}}:name==='./location-choice'?{locationChoice:p=>p}:null,mod,mod.exports);
function render(point=null){i=r=0;effects=[];const nodes=[];function walk(n){if(Array.isArray(n))n.forEach(walk);else if(n&&typeof n==='object'){nodes.push(n);walk(n.props?.children)}}walk(mod.exports.default({title:'Destination',point,initialPoint:{lat:17.5,lng:78.5,label:'Pickup'},onSelect:p=>selected.push(p)}));return nodes}
function find(type,check=()=>true){return render().find(n=>n.type===type&&check(n.props))}
(async()=>{
find('Pressable',p=>p.accessibilityLabel?.startsWith('Destination:')).props.onPress();
assert.equal(values[2].latitude,17.5);
const destination={lat:17.2,lng:78.2,label:'Selected destination',city:'Hyderabad',country:'IN'};
const search=find('WebView');
assert.equal(search.props.onShouldStartLoadWithRequest({url:'https://example.com/choose-location'}),false);
assert.equal(search.props.onShouldStartLoadWithRequest({url:'https://www.drioz.com/wallet'}),false);
assert.equal(search.props.onShouldStartLoadWithRequest({url:'https://www.drioz.com/choose-location'}),true);
search.props.onMessage({nativeEvent:{url:'https://example.com',data:JSON.stringify({type:'drioz.location',point:destination})}});assert.equal(values[1],'search');
search.props.onMessage({nativeEvent:{url:'https://www.drioz.com',data:JSON.stringify({type:'drioz.location',point:destination})}});
assert.equal(values[0],true);assert.equal(values[1],'map');assert.equal(selected.length,0);
const map=find('Map');assert.equal(map.props.initialRegion.latitude,17.2);
map.props.ref.current={animateToRegion:p=>camera.push(p)};effects.forEach(fn=>fn());assert.equal(camera.at(-1).longitude,78.2);
assert.deepEqual(find('Marker').props.coordinate,{latitude:17.2,longitude:78.2});
await find('Button',p=>p.title==='Use this map location').props.onPress();
assert.deepEqual(selected,[destination]);assert.equal(values[0],false);
// Reopening retains the confirmed destination; moving the pin invalidates its old label.
render(destination).find(n=>n.type==='Pressable'&&n.props.accessibilityLabel?.startsWith('Destination:')).props.onPress();
find('Pressable',p=>!p.accessibilityLabel).props.onPress();
find('Map').props.onPress({nativeEvent:{coordinate:{latitude:17.3,longitude:78.3}}});
assert.equal(values[6],null);assert.equal(values[2].latitude,17.3);
console.log('Destination search, map recenter, confirmation, reopening and pin movement passed');
})().catch(e=>{console.error(e);process.exitCode=1});

