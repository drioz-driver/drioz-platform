import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedWorkspace,canUsePartner,canUseOperations} from '../lib/workspace-access.ts';
import {bookingInput} from '../lib/booking-input.ts';
test('customer cannot navigate to partner or operations through a direct hash',()=>{
 assert.equal(canUsePartner('customer',false),false);assert.equal(canUsePartner('customer',true),false);assert.equal(canUseOperations('customer'),false);
 assert.equal(allowedWorkspace('driver','customer',false),'customer');assert.equal(allowedWorkspace('admin','customer',false),'customer');
 assert.equal(allowedWorkspace('support','customer',false),'support');
});
test('partner access does not imply staff access',()=>{
 assert.equal(allowedWorkspace('driver','driver',false),'driver');assert.equal(allowedWorkspace('admin','driver',true),'driver');
 assert.equal(allowedWorkspace('driver','finance',false),'customer');assert.equal(allowedWorkspace('admin','finance',false),'admin');
 assert.equal(allowedWorkspace('driver','admin',false),'driver');
});
test('booking payload never contains a customer-entered fare or one-way package',()=>{
 const form=new FormData();for(const [k,v] of Object.entries({cityId:'hyderabad',pickup:' Madhapur ',destination:'Airport',tripType:'one-way',transmission:'manual',vehicleCategory:'sedan',fare:'1'}))form.set(k,v);
 const input=bookingInput(form);assert.equal(input.pickup,'Madhapur');assert.equal('fare' in input,false);assert.equal('hours' in input,false);assert.equal(input.scheduledAt,null);
});

test('driver opens partner workspace instead of customer booking',()=>{for(const requested of ['customer','admin','unknown',''])assert.equal(allowedWorkspace(requested,'driver',true),'driver');assert.equal(allowedWorkspace('account','driver',true),'account');});
