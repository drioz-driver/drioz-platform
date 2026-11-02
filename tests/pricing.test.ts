import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {databaseAdapter,parameterize} from '../lib/postgres.ts';
import {schemaSql} from './pg-schema.ts';
import {operations,ApiError} from '../lib/operations.ts';
import {money,packagePrice,overage} from '../lib/domain.ts';
import type {Notifier,PushMessage} from '../lib/notify.ts';

// Runs against PGlite with the production Supabase schema, timed offers and wallet mode switched on, like the live site.
function fakeBucket(){const store=new Map<string,{bytes:Uint8Array;type:string}>();return {store,maxUploadBytes:4*1024*1024,put:async(k:string,b:Uint8Array,o:any)=>{store.set(k,{bytes:b,type:o?.httpMetadata?.contentType})},get:async(k:string)=>store.has(k)?{body:store.get(k)!.bytes,httpMetadata:{contentType:store.get(k)!.type}}:null,delete:async(k:string)=>{store.delete(k)}}}
const pools:PGlite[]=[];
test.after(async()=>{for(const pg of pools)await pg.close()});
async function setup(extra:any={}){
 const pg=new PGlite();pools.push(pg);await pg.exec(schemaSql());
 const wrap=(r:any)=>({rows:r.rows,rowCount:r.affectedRows??r.rows.length});
 const db=databaseAdapter(async(q,args)=>wrap(await pg.query(q,args)),work=>pg.transaction(async tx=>work(async(q,args)=>wrap(await tx.query(q,args)))));
 const sql={run:async(q:string,...args:any[])=>{await pg.query(parameterize(q),args)},get:async(q:string,...args:any[])=>(await pg.query(parameterize(q),args)).rows[0] as any,all:async(q:string,...args:any[])=>(await pg.query(parameterize(q),args)).rows as any[]};
 const pushed:PushMessage[]=[],texts:any[]=[];
 const notifier:Notifier={push:async(m)=>{pushed.push(...m);return {invalidTokens:m.filter(x=>x.to.includes('Dead')).map(x=>x.to)}},text:async(phone,event,vars)=>{texts.push({phone,event,vars})},status:()=>({push:true,sms:true,whatsapp:false})};
 const bucket=fakeBucket();
 return {sql,pushed,texts,bucket,ops:operations(db,bucket,'owner@example.com','test-only-trip-secret-at-least-thirty-two-chars','rzp_test_unit',true,{notifier,seller:{legalName:'DRIOZ Mobility Pvt Ltd',gstin:'36ABCDE1234F1Z5',address:'Hyderabad'},sosPhone:'+919999999999',...extra})};
}
const configuration={id:'hyderabad',enabled:true,base:24900,hourly:14900,night:0,taxBps:500,commissionBps:2000,cancellation:9900,zones:[{lat:17.44,lng:78.39,radiusKm:50}]};
const oneWay={cityId:'hyderabad',pickup:'Madhapur',destination:'Airport',pickupPoint:{lat:17.44,lng:78.39},destinationPoint:{lat:17.24,lng:78.43},tripType:'one-way',transmission:'automatic',scheduledAt:null};
const roundTrip={...oneWay,tripType:'return',destination:undefined,destinationPoint:undefined,hours:4};
async function rejectsStatus(p:Promise<any>,status:number){await assert.rejects(p,(e:any)=>e instanceof ApiError&&e.status===status)}
function form(fields:Record<string,string>,files:[string,Uint8Array][]=[]){const f=new FormData();for(const [k,v] of Object.entries(fields))f.set(k,v);for(const [k,b] of files)f.append(k,new File([b as BlobPart],'p.jpg',{type:'image/jpeg'}));return new Request('https://drioz.test/x',{method:'POST',body:f})}
const okItems={exterior:'ok',interior:'ok',tyres:'ok',lights:'ok',dashboard_warnings:'ok',documents:'ok'};
const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,1,2,3,4]);
async function world(opts:any={}){
 const w=await setup(opts);const owner=await w.ops.actor({id:'owner',email:'owner@example.com',name:'Owner'});const customer=await w.ops.actor({id:'customer',email:'c@example.com',name:'Asha Rao',phone:'+919876500000'});
 const driver=await w.ops.actor({id:'driver',email:'d@example.com',name:'Ravi Kumar',accountIntent:'driver'});
 await w.ops.seed();await w.ops.handle(owner,'cities','POST',configuration);
 await w.sql.run("INSERT INTO drivers(user_id,city_id,phone,licence,licence_expiry,verification,online,lat,lng,location_at,updated_at,date_of_birth) VALUES('driver','hyderabad','9876543210','TS0920210001234','2031-12-31','approved',1,17.441,78.391,?,?,'1990-04-01')",Date.now(),Date.now());
 await w.sql.run("INSERT INTO driver_accounts(driver_id,mode,promo) VALUES('driver','test',500000)");
 const book=async(input:any=oneWay,extra:any={})=>{const q=await w.ops.handle(customer,'quote','POST',input);return w.ops.handle(customer,'bookings','POST',{quoteId:q.id,key:crypto.randomUUID(),...extra})};
 // The partner app polls driver/offers (10 s exclusive offer) and accepts with the offer token.
 const accept=async(b:any)=>{const {offers}=await w.ops.handle(driver,'driver/offers','GET',null);const o=offers.find((x:any)=>x.id===b.id);assert.ok(o,'offer reached the driver');await w.ops.handle(driver,`bookings/${b.id}/assign`,'POST',{driverId:'driver',offerId:o.offer_id});return o};
 const inspect=(b:any,phase:string,items:any=okItems,notes='',files:[string,Uint8Array][]=[])=>w.ops.handle(driver,`bookings/${b.id}/inspection`,'POST',null,form({phase,checklist:JSON.stringify({items,fuelPercent:70}),notes},files));
 const start=async(b:any)=>{await w.ops.handle(driver,`bookings/${b.id}/status`,'POST',{status:'arrived'});await inspect(b,'pre');const pin=await w.ops.handle(customer,`bookings/${b.id}/start-code`,'POST',{});await w.ops.handle(driver,`bookings/${b.id}/status`,'POST',{status:'in_progress',code:pin.code})};
 const finish=async(b:any,extras:any={})=>{await inspect(b,'post');await w.ops.handle(driver,`bookings/${b.id}/status`,'POST',{status:'completed',...extras})};
 return {...w,owner,customer,driver,book,accept,inspect,start,finish};
}


// Time-and-distance model, Hyderabad starting card (≈10% under the DriveU research of 2 Nov 2026).
const card={oneWayCharge:5400,perMinute:194,perKm:675,includedMinutes:60,packages:{'2':26900,'4':44000,'6':62900,'8':80000,'12':111500}};
const hyd={base:27800,hourly:14900,night:18000,tax_bps:0,commission_bps:2000,pricing:JSON.stringify(card)};
const noon=Date.UTC(2026,10,2,6,30); // 12:00 IST
test('one-way fare: first-hour base + one-way charge, rounded up to the rupee',()=>{
 const f:any=money(hyd,'one-way',0,noon,null,{km:18,minutes:30});
 assert.equal(f.base,27800);assert.equal(f.oneWayCharge,5400);assert.equal(f.time,0);assert.equal(f.total,33200);assert.equal(f.rounding,0);
 assert.equal(f.rates.includedMinutes,60);assert.equal(f.rates.includedKm,18);assert.equal(f.partner,Math.round(33200*0.8));
});
test('one-way fare adds estimated minutes past the included hour',()=>{
 const f:any=money(hyd,'one-way',0,noon,null,{km:40,minutes:150});
 assert.equal(f.timeMinutes,90);assert.equal(f.time,90*194);assert.equal(f.rates.includedMinutes,150);
 assert.equal(f.total,Math.ceil((27800+5400+90*194)/100)*100);assert.equal(f.total-f.rounding,27800+5400+90*194);
});
test('hourly packages use the table and interpolate between packages',()=>{
 assert.equal((money(hyd,'return',2,noon) as any).total,26900);
 assert.equal((money(hyd,'return',4,noon) as any).total,44000);
 assert.equal(packagePrice(card.packages,3,194),Math.round((26900+44000)/2));
 assert.equal(packagePrice(card.packages,10,194),Math.round((80000+111500)/2));
 assert.equal(packagePrice(card.packages,13,194),111500+60*194);
});
test('night charge applies when the trip is expected to end at night',()=>{
 const early=Date.UTC(2026,10,2,14,30),nine=Date.UTC(2026,10,2,15,30); // 20:00 and 21:00 IST
 assert.equal((money(hyd,'one-way',0,early,null,{km:10,minutes:30}) as any).night,0,'ends 21:00');
 assert.equal((money(hyd,'one-way',0,nine,null,{km:10,minutes:30}) as any).night,18000,'ends 22:00');
 assert.equal((money(hyd,'return',2,nine) as any).night,18000,'ends 23:00');
});
test('outstation and cities without a rate card keep the old flat pricing',()=>{
 const legacy={base:24900,hourly:14900,night:0,tax_bps:0,commission_bps:2000};
 assert.equal(money(legacy,'one-way',0,noon,null,{km:40,minutes:150}).total,24900);
 assert.equal(money(hyd,'outstation',12,noon).total,27800*5+11*14900);
});
test('overage charges only time and distance beyond what was included',()=>{
 const rates={model:'time-distance',perMinute:194,perKm:675,includedMinutes:60,includedKm:18};
 assert.deepEqual(overage(rates,59.5,17),{extraMinutes:0,extraKm:0,extraTime:0,extraDistance:0});
 assert.deepEqual(overage(rates,75.2,20.4),{extraMinutes:16,extraKm:3,extraTime:3100,extraDistance:2000});
 assert.equal(overage({},90,null),null);
});
test('end to end: rate card saved by admin, quoted, booked and charged for extra time at completion',async()=>{
 const w=await world();
 await w.ops.handle(w.owner,'cities','POST',{...configuration,base:27800,night:18000,taxBps:0,pricing:card});
 const est=await w.ops.handle(w.customer,'estimate','POST',oneWay);
 assert.equal(est.base,27800);assert.equal(est.oneWayCharge,5400);assert.ok(est.rates.includedKm>0);
 const b=await w.book();await w.accept(b);await w.start(b);
 // Pretend the journey started 2.5 hours ago: everything past the included time is billed per minute.
 const before=await w.sql.get('SELECT * FROM bookings WHERE id=?',b.id);const info=JSON.parse(before.breakdown);
 await w.sql.run('UPDATE bookings SET started_at=? WHERE id=?',Date.now()-150*60000,b.id);
 await w.finish(b,{actualKm:info.rates.includedKm+5});
 const done=await w.sql.get('SELECT * FROM bookings WHERE id=?',b.id),extras=JSON.parse(done.extras);
 assert.ok(extras.extraMinutes>=150-info.rates.includedMinutes);assert.equal(extras.extraKm,5);
 assert.equal(extras.extraDistance,Math.round(5*675/100)*100);
 assert.equal(Number(done.fare),Number(before.fare)+extras.total);
 const inv=await w.ops.handle(w.customer,`bookings/${b.id}/invoice`,'GET',null);
 const labels=inv.lines.map((l:any)=>l.label).join('|');
 assert.match(labels,/Base fare \(first hour\)/);assert.match(labels,/One-way charge/);assert.match(labels,/Extra time \(\d+ min\)/);assert.match(labels,/Extra distance \(5 km\)/);
});
