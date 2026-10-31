import test from 'node:test';
import assert from 'node:assert/strict';
import {locationChoice} from '../lib/location-choice.ts';
import {locationChoice as nativeChoice} from '../mobile/drioz-customer/src/location-choice.ts';
test('location bridge accepts real coordinates and rejects malformed selections',()=>{for(const choose of [locationChoice,nativeChoice]){assert.deepEqual(choose({lat:17.44,lng:78.39,label:' Hyderabad ',city:'Hyderabad',country:'IN',admin:true}),{lat:17.44,lng:78.39,label:'Hyderabad',city:'Hyderabad',country:'IN'});for(const point of [null,{}, {lat:91,lng:10,label:'Invalid'}, {lat:0,lng:Infinity,label:'Invalid'}, {lat:'17',lng:78,label:'Invalid'}, {lat:0,lng:0,label:''}])assert.equal(choose(point),null)}});
