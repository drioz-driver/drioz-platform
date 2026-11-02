import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedWorkspace,canUsePartner,canUseOperations,homePortal} from '../lib/workspace-access.ts';
import {bookingInput} from '../lib/booking-input.ts';
test('customer site never exposes the partner workspace',()=>{
 assert.equal(canUsePartner('customer',false),false);assert.equal(canUseOperations('customer'),false);
 for(const role of ['customer','admin','driver'])assert.equal(allowedWorkspace('driver',role,true,'customer'),'customer');
 assert.equal(allowedWorkspace('admin','customer',false,'customer'),'customer');
 assert.equal(allowedWorkspace('support','customer',false,'customer'),'support');
});
test('operations stays staff-only and is not part of the partner portal',()=>{
 assert.equal(allowedWorkspace('admin','finance',false,'customer'),'admin');assert.equal(allowedWorkspace('admin','driver',true,'customer'),'customer');
 assert.equal(allowedWorkspace('admin','admin',false,'partner'),'driver');
});
test('booking payload never contains a customer-entered fare or one-way package',()=>{
 const form=new FormData();for(const [k,v] of Object.entries({cityId:'hyderabad',pickup:' Madhapur ',destination:'Airport',tripType:'one-way',transmission:'manual',vehicleCategory:'sedan',fare:'1'}))form.set(k,v);
 const input=bookingInput(form);assert.equal(input.pickup,'Madhapur');assert.equal('fare' in input,false);assert.equal('hours' in input,false);assert.equal(input.scheduledAt,null);
});

test('partner portal shows only partner screens and drivers are sent there',()=>{
 for(const requested of ['customer','admin','unknown',''])assert.equal(allowedWorkspace(requested,'driver',true,'partner'),'driver');
 assert.equal(allowedWorkspace('account','driver',true,'partner'),'account');assert.equal(allowedWorkspace('customer','customer',false,'partner'),'customer');
 assert.equal(homePortal('driver'),'partner');assert.equal(homePortal('customer'),'customer');assert.equal(homePortal('admin'),'customer');
});

test('customer accounts cannot open any partner workspace, even with an existing driver record',()=>{
 for(const hasDriver of [false,true])for(const requested of ['driver','support','notifications','account','unknown'])assert.equal(allowedWorkspace(requested,'customer',hasDriver,'partner'),'customer');
});
