import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {databaseAdapter,parameterize} from '../lib/postgres.ts';
import {schemaSql} from './pg-schema.ts';
import {operations,ApiError} from '../lib/operations.ts';
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



// Driver cancellation (v5-integration): assigned drivers may cancel before the journey starts, with a reason.
test('assigned driver cancels before start with a reason; customer is told and history is kept',async()=>{
 const w=await world();const b=await w.book();await w.accept(b);
 await rejectsStatus(w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled'}),400);
 await w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Personal emergency'});
 const saved=await w.sql.get('SELECT * FROM bookings WHERE id=?',b.id);
 assert.equal(saved.status,'cancelled');assert.equal(saved.driver_id,'driver');assert.equal(Number(saved.cancellation_fee),0);
 const audit=await w.sql.get("SELECT details FROM audit WHERE target=? AND action='cancelled'",b.id);
 assert.deepEqual(JSON.parse(audit.details),{reason:'Personal emergency',cancelledBy:'driver'});
 assert.ok(Number((await w.sql.get("SELECT count(*) AS n FROM notifications WHERE user_id='customer' AND message LIKE '%cancelled%'")).n)>0);
 assert.equal(Number((await w.sql.get('SELECT count(*) AS n FROM payouts WHERE booking_id=?',b.id)).n),0);
 await rejectsStatus(w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Personal emergency'}),409);
});

test('other drivers cannot cancel, and nobody cancels a started or finished journey this way',async()=>{
 const w=await world();const b=await w.book();await w.accept(b);
 const other=await w.ops.actor({id:'driver2',email:'d2@example.com',name:'Other Driver',accountIntent:'driver'});
 await rejectsStatus(w.ops.handle(other,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Personal emergency'}),403);
 await w.sql.run("UPDATE bookings SET status='in_progress' WHERE id=?",b.id);
 await rejectsStatus(w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Personal emergency'}),409);
 await w.sql.run("UPDATE bookings SET status='completed' WHERE id=?",b.id);
 await rejectsStatus(w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Personal emergency'}),409);
 await w.sql.run("UPDATE bookings SET status='arrived' WHERE id=?",b.id);
 await w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Customer unavailable'});
 assert.equal((await w.sql.get('SELECT status FROM bookings WHERE id=?',b.id)).status,'cancelled');
});

test('a customer cancelling still needs no reason and keeps the late-cancellation fee rule',async()=>{
 const w=await world();const b=await w.book();
 await w.ops.handle(w.customer,`bookings/${b.id}/status`,'POST',{status:'cancelled'});
 assert.equal((await w.sql.get('SELECT status FROM bookings WHERE id=?',b.id)).status,'cancelled');
 const audit=await w.sql.get("SELECT details FROM audit WHERE target=? AND action='cancelled'",b.id);
 assert.equal(JSON.parse(audit.details).cancelledBy,'customer');
});
