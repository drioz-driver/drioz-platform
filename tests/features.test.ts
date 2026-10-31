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

test('busy-time surge pricing applies to matching windows only',async()=>{
 const w=await world();const plain=await w.ops.handle(w.customer,'estimate','POST',oneWay);assert.equal(plain.surge,0);assert.equal(plain.cancellationFee,9900);
 await w.ops.handle(w.owner,'surge-rules','POST',{cityId:'hyderabad',label:'Peak hours',multiplierBps:15000,days:127,start:'00:00',end:'23:59'});
 const peak=await w.ops.handle(w.customer,'estimate','POST',oneWay);assert.equal(peak.surge,Math.round(24900*0.5));assert.equal(peak.surgeLabel,'Peak hours');assert.ok(peak.total>plain.total);
 await rejectsStatus(w.ops.handle(w.customer,'surge-rules','POST',{cityId:'hyderabad',label:'x1',multiplierBps:15000,days:127,start:'00:00',end:'23:59'}),403);
});
test('cancellation is free at first, then charges the city fee and pays the driver a share',async()=>{
 const w=await world();const b1=await w.book();await w.accept(b1);await w.ops.handle(w.customer,`bookings/${b1.id}/status`,'POST',{status:'cancelled'});
 assert.equal((await w.sql.get('SELECT cancellation_fee FROM bookings WHERE id=?',b1.id) as any).cancellation_fee,0);
 const b2=await w.book();await w.accept(b2);await w.sql.run('UPDATE bookings SET assigned_at=? WHERE id=?',Date.now()-10*60000,b2.id);
 await w.ops.handle(w.customer,`bookings/${b2.id}/status`,'POST',{status:'cancelled'});
 assert.equal((await w.sql.get('SELECT cancellation_fee FROM bookings WHERE id=?',b2.id) as any).cancellation_fee,9900);
 assert.equal((await w.sql.get('SELECT amount FROM payouts WHERE booking_id=?',b2.id) as any).amount,Math.round(9900*0.8));
 const inv=await w.ops.handle(w.customer,`bookings/${b2.id}/invoice`,'GET',null);assert.equal(inv.lines[0].label,'Cancellation fee');assert.match(inv.invoiceNumber,/^DRZ\/\d{4}-\d{2}\/000001$/);
});
test('trips need before/after car checks; issues need notes; photos are stored privately',async()=>{
 const w=await world();const b=await w.book();await w.accept(b);
 await rejectsStatus(w.inspect(b,'post'),409);
 await rejectsStatus(w.inspect(b,'pre',{...okItems,tyres:'issue'}),400);
 await rejectsStatus(w.ops.handle(w.customer,`bookings/${b.id}/inspection`,'POST',null,form({phase:'pre',checklist:JSON.stringify({items:okItems})})),403);
 await w.inspect(b,'pre',{...okItems,exterior:'issue'},'Scratch on rear bumper',[['photos',jpeg],['photos',jpeg]]);
 await rejectsStatus(w.inspect(b,'pre'),409);
 const list=await w.ops.handle(w.customer,`bookings/${b.id}/inspections`,'GET',null);assert.equal(list.inspections[0].photoCount,2);assert.equal(list.inspections[0].checklist.items.exterior,'issue');
 const photo=await w.ops.handle(w.customer,`inspections/${list.inspections[0].id}/photos/1`,'GET',null);assert.ok(photo instanceof Response);assert.equal(photo.headers.get('Content-Type'),'image/jpeg');
 const stranger=await w.ops.actor({id:'x',email:'x@example.com',name:'X'});await rejectsStatus(w.ops.handle(stranger,`inspections/${list.inspections[0].id}/photos/0`,'GET',null),403);
});
test('completion adds extra time, tolls and parking to the invoice and driver payout',async()=>{
 const w=await world();const b=await w.book(roundTrip);await w.accept(b);await w.start(b);await w.finish(b,{actualHours:5.5,tolls:12000,parking:5000});
 const row=await w.sql.get('SELECT * FROM bookings WHERE id=?',b.id) as any;const extras=JSON.parse(row.extras);
 assert.equal(extras.extraHours,2);assert.equal(extras.extraTime,2*14900);assert.equal(extras.tolls,12000);assert.ok(row.completed_at>0);
 const payout=await w.sql.get('SELECT amount FROM payouts WHERE booking_id=?',b.id) as any;assert.equal(payout.amount,b.partner_fare+Math.round(2*14900*0.8)+17000);
 const inv=await w.ops.handle(w.customer,`bookings/${b.id}/invoice`,'GET',null);assert.equal(inv.taxInvoice,true);assert.equal(inv.seller.gstin,'36ABCDE1234F1Z5');assert.equal(inv.total,b.fare+extras.total);assert.equal(inv.taxSplit.cgst+inv.taxSplit.sgst,inv.tax);assert.ok(inv.lines.some((l:any)=>l.label.startsWith('Tolls')&&!l.taxable));
 await w.ops.handle(w.owner,'payments','POST',{bookingId:b.id,amount:b.fare+extras.total,method:'upi',reference:'upi-ref-0001',status:'received'});
 await rejectsStatus(w.ops.handle(w.owner,'payments','POST',{bookingId:b.id,amount:100,method:'upi',reference:'upi-ref-0002',status:'received'}),409);
});
test('ratings: after completion only, once per side, low ratings alert staff, averages show on trips',async()=>{
 const w=await world();const b=await w.book();await w.accept(b);
 await rejectsStatus(w.ops.handle(w.customer,`bookings/${b.id}/rate`,'POST',{stars:5}),409);
 await w.start(b);await w.finish(b);
 await w.ops.handle(w.customer,`bookings/${b.id}/rate`,'POST',{stars:2,comment:'Late',tags:['punctuality']});
 await rejectsStatus(w.ops.handle(w.customer,`bookings/${b.id}/rate`,'POST',{stars:5}),409);
 await w.ops.handle(w.driver,`bookings/${b.id}/rate`,'POST',{stars:5});
 assert.ok((await w.sql.get("SELECT COUNT(*) AS n FROM notifications WHERE user_id='owner' AND message LIKE 'Low rating%'") as any).n>=1);
 const snap=await w.ops.handle(w.customer,'snapshot','GET',null);assert.equal(snap.bookings[0].driver_rating,2);assert.equal(snap.bookings[0].my_rating,2);
 const dsnap=await w.ops.handle(w.driver,'snapshot','GET',null);assert.equal(dsnap.driverRating.count,1);assert.equal(dsnap.earnings.todayTrips,1);
});
test('saved places are private, capped and removable',async()=>{
 const w=await world();const r=await w.ops.handle(w.customer,'places','POST',{label:'Home',address:'Road No. 36, Jubilee Hills',lat:17.43,lng:78.41});
 const other=await w.ops.actor({id:'o',email:'o@example.com',name:'O'});await rejectsStatus(w.ops.handle(other,`places/${r.id}/delete`,'POST',{}),404);
 for(let i=0;i<9;i++)await w.ops.handle(w.customer,'places','POST',{label:'P'+i,address:'Somewhere '+i,lat:17.4,lng:78.4});
 await rejectsStatus(w.ops.handle(w.customer,'places','POST',{label:'Too many',address:'Overflow lane',lat:17.4,lng:78.4}),409);
 assert.equal((await w.ops.handle(w.customer,'snapshot','GET',null)).places.length,10);assert.equal((await w.ops.handle(other,'snapshot','GET',null)).places.length,0);
});
test('SOS opens a safety ticket, alerts staff by push and texts the safety number',async()=>{
 const w=await world();await w.ops.handle(w.owner,'push/register','POST',{token:'ExponentPushToken[owner1]',app:'partner',platform:'android'});
 const b=await w.book();await w.accept(b);const r=await w.ops.handle(w.customer,`bookings/${b.id}/sos`,'POST',{point:{lat:17.4,lng:78.4},note:'Driver unwell'});
 assert.equal(r.emergencyNumber,'112');const t=await w.sql.get('SELECT * FROM tickets WHERE id=?',r.ticketId) as any;assert.equal(t.category,'safety');
 assert.ok(w.pushed.some(p=>p.to==='ExponentPushToken[owner1]'&&p.title.includes('SOS')));assert.ok(w.texts.some(x=>x.event==='sos'&&x.phone==='+919999999999'));
 const stranger=await w.ops.actor({id:'s',email:'s@example.com',name:'S'});await rejectsStatus(w.ops.handle(stranger,`bookings/${b.id}/sos`,'POST',{}),403);
});
test('push: ride wake-ups and trip updates reach the right app; dead tokens are pruned',async()=>{
 const w=await world();await w.ops.handle(w.driver,'push/register','POST',{token:'ExponentPushToken[driver1]',app:'partner',platform:'ios'});
 await w.ops.handle(w.customer,'push/register','POST',{token:'ExponentPushToken[cust1]',app:'customer',platform:'android'});
 await w.ops.handle(w.customer,'push/register','POST',{token:'ExponentPushToken[Dead1]',app:'customer',platform:'android'});
 await rejectsStatus(w.ops.handle(w.customer,'push/register','POST',{token:'nope',app:'customer',platform:'android'}),400);
 const b=await w.book();assert.ok(w.pushed.some(p=>p.to==='ExponentPushToken[driver1]'&&p.data?.type==='offer_wake'),'online partner woken for the new ride');
 await w.accept(b);assert.ok(w.pushed.some(p=>p.to==='ExponentPushToken[cust1]'&&p.title==='Driver assigned'));assert.ok(!w.pushed.some(p=>p.to==='ExponentPushToken[driver1]'&&p.title==='Driver assigned'));
 assert.equal((await w.sql.get("SELECT COUNT(*) AS n FROM push_tokens WHERE token LIKE '%Dead%'") as any).n,0);
 assert.ok(w.texts.some(x=>x.event==='assigned'&&x.phone==='+919876500000'));
});
test('driver quick messages notify the customer and are rate limited',async()=>{
 const w=await world();const b=await w.book();await w.accept(b);await w.ops.handle(w.driver,`bookings/${b.id}/message`,'POST',{template:'late5'});
 await rejectsStatus(w.ops.handle(w.driver,`bookings/${b.id}/message`,'POST',{template:'late10'}),429);await rejectsStatus(w.ops.handle(w.customer,`bookings/${b.id}/message`,'POST',{template:'late5'}),403);
 assert.ok((await w.sql.get("SELECT COUNT(*) AS n FROM notifications WHERE user_id='customer' AND message LIKE '%5 minutes late%'") as any).n===1);
});
test('live tracking returns distance and ETA; public share link shows live status without sign-in',async()=>{
 const w=await world();const b=await w.book();await w.accept(b);const loc=await w.ops.handle(w.customer,`bookings/${b.id}/location`,'GET',null);
 assert.equal(loc.target.kind,'pickup');assert.ok(loc.distanceKm<1);assert.ok(loc.etaMinutes>=1);
 const share=await w.ops.handle(w.customer,`bookings/${b.id}/share`,'POST',{});const token=share.path.split('token=')[1];const pub=await w.ops.share(token);
 assert.equal(pub.driverFirstName,'Ravi');assert.equal(pub.status,'assigned');assert.ok(pub.location);await rejectsStatus(w.ops.share('bad-token'),404);
});
test('corporate billing requires membership and puts the company on the invoice',async()=>{
 const w=await world();const q=await w.ops.handle(w.customer,'quote','POST',oneWay);await rejectsStatus(w.ops.handle(w.customer,'bookings','POST',{quoteId:q.id,key:crypto.randomUUID(),billTo:'company'}),403);
 const co=await w.ops.handle(w.owner,'companies','POST',{name:'Acme Infra Ltd',gstin:'36AAACA1234B1Z9',billingEmail:'ap@acme.example',address:'Gachibowli'});
 await rejectsStatus(w.ops.handle(w.owner,'companies','POST',{name:'Bad',gstin:'NOT-A-GSTIN',billingEmail:'x@y.example'}),400);
 await w.ops.handle(w.owner,`companies/${co.id}/members`,'POST',{email:'c@example.com'});
 const member=await w.ops.actor({id:'customer',email:'c@example.com',name:'Asha Rao'});const q2=await w.ops.handle(member,'quote','POST',oneWay);
 const b=await w.ops.handle(member,'bookings','POST',{quoteId:q2.id,key:crypto.randomUUID(),billTo:'company'});assert.equal(b.company_id,co.id);
 const inv=await w.ops.handle(member,`bookings/${b.id}/invoice`,'GET',null);assert.equal(inv.buyer.name,'Acme Infra Ltd');assert.equal(inv.buyer.gstin,'36AAACA1234B1Z9');
 assert.equal((await w.ops.handle(w.owner,'snapshot','GET',null)).companies[0].members,1);
});
test('incentives award a bonus once the trip target is reached; finance marks it paid',async()=>{
 const w=await world();await w.ops.handle(w.owner,'incentives','POST',{cityId:'hyderabad',title:'First ride bonus',targetTrips:1,bonus:50000,startsAt:Date.now()-3600000,endsAt:Date.now()+86400000});
 const b=await w.book();await w.accept(b);await w.start(b);await w.finish(b);
 const snap=await w.ops.handle(w.driver,'snapshot','GET',null);assert.equal(snap.incentives[0].achieved,true);assert.equal(snap.awards.length,1);
 await w.ops.handle(w.driver,'snapshot','GET',null);assert.equal((await w.sql.get('SELECT COUNT(*) AS n FROM incentive_awards') as any).n,1);
 await w.ops.handle(w.owner,`incentive-awards/${snap.awards[0].id}/paid`,'POST',{reference:'neft-0001'});await rejectsStatus(w.ops.handle(w.owner,`incentive-awards/${snap.awards[0].id}/paid`,'POST',{reference:'neft-0002'}),409);
});
test('shift planner validates the window and shows plans to operations',async()=>{
 const w=await world();const day=new Date(Date.now()+19800000+86400000).toISOString().slice(0,10);
 await rejectsStatus(w.ops.handle(w.driver,'driver/plan','POST',{day,start:'18:00',end:'09:00'}),400);
 await rejectsStatus(w.ops.handle(w.driver,'driver/plan','POST',{day:'2020-01-01',start:'09:00',end:'18:00'}),400);
 await w.ops.handle(w.driver,'driver/plan','POST',{day,start:'09:00',end:'18:00'});
 assert.equal((await w.ops.handle(w.driver,'snapshot','GET',null)).plans[0].start_min,540);assert.equal((await w.ops.handle(w.owner,'snapshot','GET',null)).shiftPlans.length,1);
 await rejectsStatus(w.ops.handle(w.customer,'driver/plan','POST',{day,start:'09:00',end:'18:00'}),403);
});
test('account deletion anonymises the user but is blocked during active trips',async()=>{
 const w=await world();const b=await w.book();await rejectsStatus(w.ops.handle(w.customer,'account/delete','POST',{confirm:'DELETE'}),409);
 await w.ops.handle(w.customer,`bookings/${b.id}/status`,'POST',{status:'cancelled'});await rejectsStatus(w.ops.handle(w.customer,'account/delete','POST',{confirm:'yes'}),400);
 await w.ops.handle(w.customer,'places','POST',{label:'Home',address:'Somewhere nice',lat:17.4,lng:78.4});
 await w.ops.handle(w.customer,'account/delete','POST',{confirm:'DELETE'});
 const u=await w.sql.get("SELECT * FROM users WHERE id='customer'") as any;assert.equal(u.name,'Deleted user');assert.equal(u.disabled,1);assert.equal(u.phone,null);
 assert.equal((await w.sql.get("SELECT COUNT(*) AS n FROM saved_places") as any).n,0);assert.equal((await w.sql.get('SELECT COUNT(*) AS n FROM bookings') as any).n,1);
 await rejectsStatus(w.ops.actor({id:'customer',email:'c@example.com',name:'Asha Rao'}),403);
});
test('analytics and partner health flag suspicious GPS jumps',async()=>{
 const w=await world();await w.sql.run("UPDATE drivers SET location_at=? WHERE user_id='driver'",Date.now()-60000);
 await w.ops.handle(w.driver,'driver/location','POST',{lat:19.07,lng:72.87});
 assert.equal((await w.sql.get("SELECT gps_flags FROM drivers WHERE user_id='driver'") as any).gps_flags,1);
 const b=await w.book();await w.accept(b);const a=await w.ops.handle(w.owner,'analytics','GET',null);
 assert.equal(a.offers.accepted,1);assert.ok(a.daily.length>=1);assert.equal(a.partnerHealth[0].user_id,'driver');await rejectsStatus(w.ops.handle(w.customer,'analytics','GET',null),403);
});
test('automated licence check uses IDfy when configured and records the outcome',async()=>{
 const off=await world();await rejectsStatus(off.ops.handle(off.owner,'drivers/driver/kyc','POST',{}),503);
 const fetcher=(async()=>new Response(JSON.stringify({result:{source_output:{status:'id_found',name:'RAVI KUMAR',nt_validity_to:'2031-12-31'}}}),{status:200})) as unknown as typeof fetch;
 const on=await world({kyc:{IDFY_ACCOUNT_ID:'acc',IDFY_API_KEY:'key'},fetcher});const r=await on.ops.handle(on.owner,'drivers/driver/kyc','POST',{});
 assert.equal(r.status,'verified');assert.equal((await on.sql.get("SELECT kyc_status FROM drivers WHERE user_id='driver'") as any).kyc_status,'verified');
});

test('assigned partner cancellation preserves wallet history and never charges the customer a late fee',async()=>{
 const w=await world();const b=await w.book();await w.accept(b);
 await w.sql.run('UPDATE bookings SET assigned_at=? WHERE id=?',Date.now()-600000,b.id);
 await rejectsStatus(w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled'}),400);
 await w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Vehicle problem'});
 const saved=await w.sql.get('SELECT * FROM bookings WHERE id=?',b.id);
 assert.equal(saved.status,'cancelled');assert.equal(Number(saved.cancellation_fee),0);assert.equal(saved.driver_id,w.driver.id);
 const audit=await w.sql.get("SELECT details FROM audit WHERE target=? AND action='cancelled'",b.id);
 assert.deepEqual(JSON.parse(audit.details),{reason:'Vehicle problem',cancelledBy:'driver'});
 assert.equal(Number((await w.sql.get('SELECT COUNT(*) AS n FROM payouts WHERE booking_id=?',b.id)).n),0);
 assert.ok(w.pushed.some(m=>m.body.includes('cancelled')) || Number((await w.sql.get("SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND message LIKE '%cancelled%'",w.customer.id)).n)>0);
 await rejectsStatus(w.ops.handle(w.driver,`bookings/${b.id}/status`,'POST',{status:'cancelled',reason:'Vehicle problem'}),409);
});
