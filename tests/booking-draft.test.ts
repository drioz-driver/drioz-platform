import test from 'node:test';
import assert from 'node:assert/strict';
import {readBookingDraft} from '../lib/booking-draft.ts';
test('booking draft retains trip details without accepting arbitrary stored fields',()=>{
 const raw=JSON.stringify({savedAt:1000,fields:{tripType:'return',pickup:'Madhapur',hours:'2',password:'secret',pickupPoint:'{"lat":17.4,"lng":78.3}'}});
 const draft=readBookingDraft(raw,2000)!;assert.equal(draft.pickup,'Madhapur');assert.equal(draft.hours,'2');assert.equal(draft.password,undefined);assert.equal(draft.pickupPoint,'{"lat":17.4,"lng":78.3}');
});
test('invalid, expired and future booking drafts cannot restore stale trip data',()=>{
 for(const raw of [null,'bad','{}',JSON.stringify({savedAt:0,fields:{tripType:'return'}}),JSON.stringify({savedAt:4000000,fields:{tripType:'return'}}),JSON.stringify({savedAt:2000000,fields:{tripType:'unknown'}})])assert.equal(readBookingDraft(raw,2000000),null);
});
