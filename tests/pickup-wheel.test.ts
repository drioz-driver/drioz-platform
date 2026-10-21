import test from 'node:test';
import assert from 'node:assert/strict';
import * as web from '../lib/pickup-wheel.ts';
import * as native from '../mobile/src/pickup-wheel.ts';
for(const [name,picker] of Object.entries({web,native})){
 test(name+': noon and midnight use IST',()=>{
  const base={date:'2099-05-20',hour:'12',minute:'15',period:'AM'};
  assert.equal(picker.pickupTimestamp(base),Date.parse('2099-05-19T18:45:00Z'));
  assert.equal(picker.pickupTime(base),'00:15');
  assert.equal(picker.pickupTime({...base,period:'PM'}),'12:15');
  assert.ok(Number.isNaN(picker.pickupTimestamp({...base,date:'2099-02-30'})));
 });
 test(name+': default crosses midnight correctly and preserves restored future dates',()=>{
  const now=Date.parse('2026-10-21T18:20:00Z');
  assert.deepEqual(picker.pickupChoice(undefined,undefined,now),{date:'2026-10-22',hour:'12',minute:'20',period:'AM'});
  const dates=picker.pickupDates('2099-05-20',now);
  assert.equal(dates[0].value,'2026-10-21');
  assert.equal(dates[0].label,'Today');
  assert.equal(dates.at(-1)?.value,'2099-05-20');
 });
}

test('time wheels wrap in both directions without changing their logical values',()=>{for(const picker of [web,native]){assert.equal(picker.wheelIndex(60,60),0);assert.equal(picker.wheelIndex(-1,60),59);assert.equal(picker.wheelIndex(300,60),0);assert.equal(picker.wheelIndex(12,12),0);assert.equal(picker.wheelIndex(2,2),0)}});
