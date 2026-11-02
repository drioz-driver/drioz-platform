import test from 'node:test';
import assert from 'node:assert/strict';
import {getDevicePosition,locationError} from '../lib/browser-geolocation.ts';

test('current location retries an unavailable coarse fix with GPS and returns the real coordinates',async()=>{
 const calls:any[]=[];const position={coords:{latitude:17.44,longitude:78.39,accuracy:12}};
 const geo={getCurrentPosition:(success:any,failure:any,options:any)=>{calls.push(options);calls.length===1?failure({code:2}):success(position)}};
 assert.equal(await getDevicePosition(geo as any),position);assert.equal(calls.length,2);assert.equal(calls[1].enableHighAccuracy,true);
});
test('a denied permission is not retried or replaced by a guessed location',async()=>{
 let calls=0;const geo={getCurrentPosition:(_ok:any,fail:any)=>{calls++;fail({code:1})}};
 await assert.rejects(getDevicePosition(geo as any),(e:any)=>e.code===1);assert.equal(calls,1);assert.match(locationError({code:1}),/site settings/);
});
test('timeouts and unavailable devices have actionable, distinct messages',()=>{
 assert.match(locationError({code:2}),/device could not find/);assert.match(locationError({code:3}),/timed out/);
});
