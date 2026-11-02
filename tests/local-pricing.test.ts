import test from 'node:test';
import assert from 'node:assert/strict';
import {chartFor,localCharts,localFare,exchangeRate} from '../lib/local-pricing.ts';
import {localMoney,localPricing} from '../lib/local-money.ts';
import {zonedTimestamp} from '../lib/pickup-wheel.ts';
const fx={rate:25.9,date:'2026-11-02'};
const input={tripType:'one-way',hours:0,transmission:'automatic'};
const chart=(id:string)=>localCharts.find(c=>c.id===id)!;
test('pickup scheduling uses local time and rejects nonexistent DST and invalid calendar dates',()=>{
 assert.equal(zonedTimestamp('2026-11-05','09:00','Asia/Dubai'),Date.parse('2026-11-05T05:00:00Z'));
 assert.equal(zonedTimestamp('2026-11-05','09:00','America/New_York'),Date.parse('2026-11-05T14:00:00Z'));
 assert.ok(Number.isNaN(zonedTimestamp('2026-03-08','02:30','America/New_York')));
 assert.ok(Number.isNaN(zonedTimestamp('2026-02-31','09:00','Asia/Kolkata')));
});
test('Hyderabad never receives an international chart and pickup country prevents border mismatches',()=>{
 assert.equal(chartFor({lat:17.406,lng:78.4514},'IN'),undefined);
 assert.equal(chartFor({lat:1.3521,lng:103.8198},'MY'),undefined);
 assert.equal(chartFor({lat:25.2,lng:55.27},'AE')?.id,'intl-dubai');
 assert.equal(chartFor({lat:40.4168,lng:-3.7038},'ES'),undefined);
});
test('Dubai uses its distance bands and explicit local hourly minimum',()=>{
 assert.equal(localFare(chart('intl-dubai'),input,Date.now(),{km:15,minutes:30},fx).localTotal,105);
 assert.equal(localFare(chart('intl-dubai'),{...input,tripType:'return',hours:2},Date.now(),null,fx).localTotal,160);
 assert.equal(localFare(chart('intl-dubai'),{...input,tripType:'return',hours:8},Date.now(),null,fx).localTotal,500);
});
test('Singapore time rules use pickup time zone, with explicit manual and Sunday additions',()=>{
 const night=Date.parse('2026-11-02T14:00:00Z'); // Monday 22:00 Singapore
 assert.equal(localFare(chart('intl-singapore'),input,night,null,fx).localTotal,48);
 assert.equal(localFare(chart('intl-singapore'),{...input,transmission:'manual'},night,null,fx).localTotal,58);
 assert.equal(localFare(chart('intl-singapore'),input,Date.parse('2026-11-01T04:00:00Z'),null,fx).localTotal,68);
});
test('US normal rate has no paid-member discount and enforces two-hour minimum',()=>{
 assert.equal(localFare(chart('intl-new-york'),input,Date.now(),{km:10,minutes:20},fx).localTotal,110);
 assert.equal(localFare(chart('intl-new-york'),input,Date.now(),{km:90,minutes:150},fx).localTotal,137.5);
});
test('local cash fare and INR settlement remain equivalent at a frozen rate',()=>{
 const b=localFare(chart('intl-dubai'),input,Date.now(),{km:15,minutes:30},fx);
 assert.equal(b.total,271950);assert.match(localMoney(b.total,b),/105\.00/);assert.match(localMoney(b.total),/2,720/);
 assert.deepEqual(localPricing(JSON.stringify(b)),b.localPricing);assert.equal(b.tax,0);
 assert.match(localMoney(b.total,b),/AED/);assert.equal(localPricing({localPricing:{currency:'USD',inrPerUnit:-1}}),undefined);
});
test('Tokyo distinguishes dispatch fee from driving fee and uses zero-decimal yen',()=>{
 const b=localFare(chart('intl-tokyo'),input,Date.now(),{km:7,minutes:20},{rate:.6,date:fx.date});
 assert.equal(b.localTotal,4800);assert.equal(localMoney(b.total,b),'¥4,800');
});
test('Canadian local and longer-distance fares have a defined 10 km boundary',()=>{
 assert.equal(localFare(chart('intl-toronto'),input,Date.now(),{km:10,minutes:20},fx).localTotal,39.99);
 assert.equal(localFare(chart('intl-toronto'),input,Date.now(),{km:10.5,minutes:20},fx).localTotal,46.24);
});
test('exchange service failures never invent a rate or silently use INR as local currency',async()=>{
 await assert.rejects(exchangeRate('XYZ',async()=>new Response('{}',{status:503})),/unavailable/);
 await assert.rejects(exchangeRate('XYZ',async()=>Response.json({base:'XYZ',quote:'INR',rate:0,date:fx.date})),/current exchange rate/);
});
