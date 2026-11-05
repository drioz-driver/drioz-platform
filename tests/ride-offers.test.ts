import test from 'node:test';
import {schemaSql} from './pg-schema.ts';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {databaseAdapter} from '../lib/postgres.ts';
import {rideOffers,claimRideOffer} from '../lib/ride-offers.ts';
import {operations} from '../lib/operations.ts';
async function setup(){
 const pg=new PGlite();await pg.exec(schemaSql());
 const run=async(sql:string,args:any[])=>{const r=await pg.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length}};
 const db=databaseAdapter(run,work=>pg.transaction(async tx=>work(async(sql,args)=>{const r=await tx.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length}})));
 let at=Date.now();
 await pg.exec("INSERT INTO cities(id,name,base,hourly) VALUES('hyd','Hyderabad',5000,0);INSERT INTO users(id,email,name,role,created_at) VALUES('a','a@example.invalid','A','driver',0),('b','b@example.invalid','B','driver',0),('c','c@example.invalid','C','customer',0);INSERT INTO drivers(user_id,city_id,phone,licence,licence_expiry,verification,online,updated_at) VALUES('a','hyd','111','A','2030-12-31','approved',1,0),('b','hyd','222','B','2030-12-31','approved',1,0);INSERT INTO driver_accounts(driver_id,mode,promo) VALUES('a','test',50000),('b','test',50000);");
 const offers=rideOffers(db,'rzp_test_unit',()=>at);
 async function booking(){const id=crypto.randomUUID();await db.prepare("INSERT INTO bookings(id,customer_id,city_id,pickup,destination,pickup_lat,pickup_lng,destination_lat,destination_lng,trip_type,transmission,fare,partner_fare,breakdown,idempotency_key,created_at,updated_at) VALUES(?,'c','hyd','Pickup','Drop',17,78,18,79,'one-way','manual',5000,4000,'{}',?,?,?)").bind(id,id,at,at).run();return id}
 return {pg,db,offers,booking,advance:()=>at+=10000,at:()=>at};
}

test('international chart books automatically with frozen FX, correct statement and confirmed cash once',async()=>{
 const s=await setup();try{
  const ops=operations(s.db,null,'owner@example.com','test-secret',undefined,false,{fetcher:async()=>Response.json({base:'AED',quote:'INR',rate:25.9,date:new Date().toISOString().slice(0,10)})});await ops.seed();
  const customer=await ops.actor({id:'c',email:'c@example.invalid',name:'C'}),driver=await ops.actor({id:'a',email:'a@example.invalid',name:'A'}),other=await ops.actor({id:'b',email:'b@example.invalid',name:'B'});
  const point={lat:25.2048,lng:55.2708};const coverage=await ops.handle(customer,'coverage','POST',{cityId:'worldwide',pickupPoint:point,pickupRegion:{city:'Dubai',country:'AE'}});assert.equal(coverage.cityId,'intl-dubai');assert.equal(coverage.status,'searching');
  const trip={cityId:coverage.cityId,pickup:'Dubai test pickup',destination:'Dubai test destination',pickupPoint:point,destinationPoint:{lat:25.21,lng:55.28},tripType:'one-way',transmission:'automatic',scheduledAt:null};
  const quote=await ops.handle(customer,'quote','POST',trip);assert.equal(quote.localPricing.currency,'AED');assert.equal(quote.localTotal,79);assert.equal(quote.tax,0);
  const booking=await ops.handle(customer,'bookings','POST',{quoteId:quote.id,key:crypto.randomUUID()});assert.equal(booking.status,'requested');assert.equal(JSON.parse(booking.breakdown).localPricing.inrPerUnit,25.9);
  await s.db.prepare("UPDATE bookings SET status='completed',driver_id='a' WHERE id=?").bind(booking.id).run();
  await assert.rejects(ops.handle(customer,`bookings/${booking.id}/cash-received`,'POST',{}),/assigned driver/);
  await assert.rejects(ops.handle(driver,`bookings/${booking.id}/cash-received`,'POST',{}),/select cash first/);
  await ops.handle(customer,`bookings/${booking.id}/payment-choice`,'POST',{method:'cash'});
  await assert.rejects(ops.handle(other,`bookings/${booking.id}/cash-received`,'POST',{}));
  await ops.handle(driver,`bookings/${booking.id}/cash-received`,'POST',{});const repeat=await ops.handle(driver,`bookings/${booking.id}/cash-received`,'POST',{});assert.equal(repeat.alreadyReceived,true);
  const payments=await s.db.prepare('SELECT * FROM payments WHERE booking_id=?').bind(booking.id).all();assert.equal(payments.results.length,1);assert.equal(Number(payments.results[0].amount),Number(booking.fare));
  const snapshot=await ops.handle(driver,'snapshot','GET',{});const shown=snapshot.bookings.find((b:any)=>b.id===booking.id);assert.equal(Number(shown.paid_amount),Number(booking.fare));assert.equal(shown.paid_methods,'cash');
  const statement=await ops.handle(customer,`bookings/${booking.id}/invoice`,'GET',{});assert.equal(statement.taxInvoice,false);assert.equal(statement.breakdown.localPricing.currency,'AED');assert.equal(statement.total,booking.fare);
  await assert.rejects(ops.handle(customer,'quote','POST',{...trip,pickupPoint:{lat:17.4,lng:78.4}}),/selected rate chart/);
 }finally{await s.pg.close()}
});
test('exclusive offer expires in 10 seconds, rotates, then can return with a fresh ID',async()=>{const s=await setup();try{
 await s.offers.poll('b');const id=await s.booking();const first=(await s.offers.poll('a')).offers[0];assert.equal(first.id,id);assert.equal(first.expires_at-first.offered_at,10000);assert.equal((await s.offers.poll('b')).offers.length,0);
 s.advance();assert.equal((await s.offers.poll('a')).offers.length,0);const second=(await s.offers.poll('b')).offers[0];assert.notEqual(second.offer_id,first.offer_id);await assert.rejects(claimRideOffer(s.db,id,'a',first.offer_id,s.at()),/expired/);
 s.advance();const again=(await s.offers.poll('a')).offers[0];assert.notEqual(again.offer_id,first.offer_id);assert.equal(again.attempt,3);
 }finally{await s.pg.close()}});
test('a single available driver gets a new offer after expiry, never the expired token',async()=>{const s=await setup();try{await s.booking();const first=(await s.offers.poll('a')).offers[0];s.advance();const again=(await s.offers.poll('a')).offers[0];assert.notEqual(again.offer_id,first.offer_id);assert.equal(again.attempt,2)}finally{await s.pg.close()}});
test('wrong driver and replayed tokens cannot claim an offer',async()=>{const s=await setup();try{const id=await s.booking();const offer=(await s.offers.poll('a')).offers[0];await assert.rejects(claimRideOffer(s.db,id,'b',offer.offer_id,s.at()),/expired/);await claimRideOffer(s.db,id,'a',offer.offer_id,s.at());await assert.rejects(claimRideOffer(s.db,id,'a',offer.offer_id,s.at()),/expired/)}finally{await s.pg.close()}});
test('passing moves to another driver; insufficient wallet and offline drivers get no offer',async()=>{const s=await setup();try{await s.offers.poll('b');await s.booking();const offer=(await s.offers.poll('a')).offers[0];await s.offers.pass('a',offer.offer_id);assert.equal((await s.offers.poll('b')).offers.length,1);await s.db.prepare("UPDATE driver_accounts SET promo=0,recharge=0 WHERE driver_id='a'").run();await s.db.prepare("UPDATE drivers SET online=0 WHERE user_id='b'").run();s.advance();assert.equal((await s.offers.poll('a')).offers.length,0)}finally{await s.pg.close()}});

test('low balance shows waiting bookings and exact recharge, then offers resume after funding',async()=>{
 const s=await setup();try{
  const id=await s.booking();await s.db.prepare("UPDATE drivers SET online=0 WHERE user_id='b'").run();
  await s.db.prepare("UPDATE driver_accounts SET promo=0,recharge=1860 WHERE driver_id='a'").run();
  await s.db.prepare('UPDATE bookings SET fare=33200,partner_fare=26560 WHERE id=?').bind(id).run();
  const blocked=await s.offers.poll('a');assert.equal(blocked.offers.length,0);assert.equal(blocked.availability!.waitingCount,1);assert.equal(blocked.availability!.blockedCount,1);assert.equal(blocked.availability!.minimumRecharge,4780);assert.equal(blocked.availability!.requests[0].id,id);
  assert.equal((await s.db.prepare("SELECT recharge FROM driver_accounts WHERE driver_id='a'").first()).recharge,1860);
  await s.db.prepare("UPDATE driver_accounts SET recharge=6640 WHERE driver_id='a'").run();
  const eligible=await s.offers.poll('a');assert.equal(eligible.availability!.blockedCount,0);assert.equal(eligible.offers[0].id,id);
 }finally{await s.pg.close()}
});
test('expired acceptance rolls back assignment and wallet reservation; current acceptance succeeds once',async()=>{const s=await setup();try{const id=await s.booking();const offer=(await s.offers.poll('a')).offers[0];const ops=operations(s.db,null,'','', 'rzp_test_unit',true),actor={id:'a',email:'a@example.invalid',name:'A',role:'driver',disabled:0};await s.db.prepare('UPDATE ride_offers SET offered_at=?,expires_at=? WHERE booking_id=?').bind(Date.now()-20000,Date.now()-10000,id).run();await assert.rejects(ops.handle(actor,`bookings/${id}/assign`,'POST',{driverId:'a',offerId:offer.offer_id}),(e:any)=>e.status===409);assert.equal((await s.db.prepare('SELECT status FROM bookings WHERE id=?').bind(id).first()).status,'requested');assert.equal((await s.db.prepare('SELECT COUNT(*) AS n FROM driver_trip_money').first()).n,0);const fresh=(await s.offers.poll('a')).offers[0];await ops.handle(actor,`bookings/${id}/assign`,'POST',{driverId:'a',offerId:fresh.offer_id});assert.equal((await s.db.prepare('SELECT status FROM bookings WHERE id=?').bind(id).first()).status,'assigned');assert.equal((await s.db.prepare('SELECT COUNT(*) AS n FROM driver_trip_money').first()).n,1)}finally{await s.pg.close()}});
test('an eligible driver never holds two live offer slots at once',async()=>{const s=await setup();try{await s.booking();await s.booking();assert.equal((await s.offers.poll('a')).offers.length,1);assert.equal((await s.db.prepare("SELECT COUNT(*) AS n FROM ride_offers WHERE driver_id='a' AND state='offered' AND expires_at>?").bind(s.at()).first()).n,1);assert.equal((await s.offers.poll('b')).offers.length,1)}finally{await s.pg.close()}});

test('acceptance retries a rolled-back serialization failure and repeated clicks reserve funds only once',async()=>{
 const s=await setup();try{
  const id=await s.booking(),offer=(await s.offers.poll('a')).offers[0];let failed=false;
  const flaky={...s.db,transaction:(work:any)=>s.db.transaction(async(tx:any)=>{const result=await work(tx);if(!failed){failed=true;throw Object.assign(Error('serialization conflict'),{code:'40001'})}return result})};
  const ops=operations(flaky,null,'','', 'rzp_test_unit',true),actor={id:'a',email:'a@example.invalid',name:'A',role:'driver',disabled:0};
  const first=await ops.handle(actor,`bookings/${id}/assign`,'POST',{driverId:'a',offerId:offer.offer_id});assert.equal(first.booking.status,'assigned');assert.equal(first.alreadyAccepted,false);
  const again=await ops.handle(actor,`bookings/${id}/assign`,'POST',{driverId:'a',offerId:offer.offer_id});assert.equal(again.alreadyAccepted,true);
  assert.equal((await s.db.prepare('SELECT COUNT(*) AS n FROM driver_trip_money').first()).n,1);
  assert.equal((await s.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE target=? AND action='assigned'").bind(id).first()).n,1);
 }finally{await s.pg.close()}
});
test('a general India request reaches nearby GPS-sharing drivers, never a far-away driver',async()=>{
 const s=await setup();try{
  const id=await s.booking();await s.db.prepare("INSERT INTO cities(id,name,base,hourly) VALUES('india','India',5000,0)").run();await s.db.prepare("UPDATE bookings SET city_id='india' WHERE id=?").bind(id).run();
  await s.db.prepare("UPDATE drivers SET lat=17,lng=78,location_at=? WHERE user_id='a'").bind(s.at()).run();await s.db.prepare("UPDATE drivers SET lat=13,lng=77,location_at=? WHERE user_id='b'").bind(s.at()).run();
  assert.equal((await s.offers.poll('b')).offers.length,0);assert.equal((await s.offers.poll('a')).offers[0].id,id);
 }finally{await s.pg.close()}
});


test('offers stop at both booking deadlines and late acceptance cannot reserve funds',async()=>{
 const fixture=await setup();
 try{
  const {db,offers,booking,at,advance}=fixture;
  const immediate=await booking();
  await db.prepare('UPDATE bookings SET created_at=? WHERE id=?').bind(at()-599000,immediate).run();
  const offer=(await offers.poll('a')).offers[0];
  assert.equal(offer.expires_at,at()+1000);
  const scheduled=await booking();
  await db.prepare('UPDATE bookings SET scheduled_at=? WHERE id=?').bind(at()+1000,scheduled).run();
  advance();
  assert.equal((await offers.poll('a')).offers.length,0);
  const ops=operations(db,null,'owner@example.invalid','test-secret','rzp_test_unit',true);
  const customer=await ops.actor({id:'c',email:'c@example.invalid',name:'C'});
  const driver=await ops.actor({id:'a',email:'a@example.invalid',name:'A'});
  await db.prepare('UPDATE bookings SET created_at=? WHERE id=?').bind(Date.now()-601000,immediate).run();
  await db.prepare('UPDATE bookings SET scheduled_at=? WHERE id=?').bind(Date.now()-1000,scheduled).run();
  await assert.rejects(ops.handle(driver,`bookings/${immediate}/assign`,'POST',{driverId:'a',offerId:offer.offer_id}),{status:409});
  await ops.handle(customer,'pulse','GET',null);
  for(const id of [immediate,scheduled]){
   assert.equal((await db.prepare('SELECT status FROM bookings WHERE id=?').bind(id).first()).status,'no_driver');
  }
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM driver_trip_money').first()).n,0);
 }finally{await fixture.pg.close()}
});
