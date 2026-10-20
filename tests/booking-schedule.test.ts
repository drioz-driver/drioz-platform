import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingInput,scheduledPickup} from '../lib/booking-input.ts';
function form(overrides:Record<string,string>={}){const f=new FormData();for(const [k,v] of Object.entries({tripType:'one-way',timing:'schedule',pickupDate:'2099-05-20',pickupTime:'14:30',...overrides}))f.set(k,v);return f}
test('scheduled pickup uses IST regardless of the browser or server timezone',()=>{assert.equal(scheduledPickup(form()),Date.parse('2099-05-20T09:00:00Z'));assert.equal(bookingInput(form()).scheduledAt,Date.parse('2099-05-20T09:00:00Z'))});
test('incomplete or invalid scheduled times cannot become immediate bookings',()=>{for(const overrides of [{pickupDate:''},{pickupTime:''},{pickupDate:'2099-02-30'},{pickupTime:'25:00'},{pickupDate:'1999-01-01'}])assert.throws(()=>bookingInput(form(overrides)),/Choose/)});
test('Now ignores stale schedule values, and outstation always requires scheduling',()=>{assert.equal(scheduledPickup(form({timing:'now'})),null);assert.throws(()=>scheduledPickup(form({tripType:'outstation',timing:'now',pickupTime:''})),/Choose/);assert.equal(scheduledPickup(form({tripType:'outstation',timing:'now'})),Date.parse('2099-05-20T09:00:00Z'))});
