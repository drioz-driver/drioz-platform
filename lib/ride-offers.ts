export class RideOfferError extends Error{status=409}
const stmt=(db:any,sql:string,...args:any[])=>db.prepare(sql).bind(...args);
const one=async(db:any,sql:string,...args:any[])=>stmt(db,sql,...args).first();
const all=async(db:any,sql:string,...args:any[])=>(await stmt(db,sql,...args).all()).results;
export const offerDuration=10000;
// Keep the SQL deadline authoritative; browser/device clocks never grant acceptance.
export async function claimRideOffer(db:any,booking:string,driver:string,offer:string,at=Date.now()){
 const r=await stmt(db,"UPDATE ride_offers SET state='accepted' WHERE booking_id=? AND driver_id=? AND offer_id=? AND state='offered' AND expires_at>?",booking,driver,offer,at).run();
 if(!r.meta.changes)throw new RideOfferError('This offer has expired or moved to another driver. Wait for your next offer.');
}
export function rideOffers(db:any,paymentKey?:string,clock=()=>Date.now()){
 const mode=paymentKey?.startsWith('rzp_live_')?'live':'test';
 async function retry<T>(work:()=>Promise<T>):Promise<T>{for(let attempt=0;;attempt++){try{return await work()}catch(e:any){if(!['40001','40P01'].includes(e.code)||attempt>=2)throw e}}}
 async function poll(driverId:string){return retry(()=>db.transaction(async(database:any)=>{
  const at=clock();
  const me=await one(database,"SELECT d.* FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.user_id=? AND d.verification='approved' AND d.online=1 AND u.role='driver' AND u.disabled=0 AND d.licence_expiry>=?",driverId,new Date(at).toISOString().slice(0,10));
  if(!me)return {offers:[],serverNow:at};
  await stmt(database,'INSERT INTO ride_offer_presence(driver_id,seen_at) VALUES(?,?) ON CONFLICT(driver_id) DO UPDATE SET seen_at=excluded.seen_at',driverId,at).run();
  if(await one(database,"SELECT id FROM bookings WHERE driver_id=? AND status IN ('assigned','arrived','in_progress') LIMIT 1",driverId))return {offers:[],serverNow:at};
  const requests=await all(database,"SELECT * FROM bookings WHERE city_id=? AND status='requested' AND (scheduled_at IS NULL OR scheduled_at<=?) ORDER BY created_at,id LIMIT 10 FOR UPDATE SKIP LOCKED",me.city_id,at+1800000);
  for(const booking of requests){
   const current=await one(database,'SELECT * FROM ride_offers WHERE booking_id=?',booking.id);
   const candidates=await all(database,`SELECT d.user_id FROM drivers d JOIN users u ON u.id=d.user_id JOIN ride_offer_presence p ON p.driver_id=d.user_id ${paymentKey?'LEFT JOIN driver_accounts w ON w.driver_id=d.user_id AND w.mode=?':''} WHERE d.city_id=? AND d.verification='approved' AND d.online=1 AND u.role='driver' AND u.disabled=0 AND d.licence_expiry>=? AND p.seen_at>? AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.driver_id=d.user_id AND b.status IN ('assigned','arrived','in_progress')) AND NOT EXISTS(SELECT 1 FROM ride_offers o JOIN bookings b ON b.id=o.booking_id WHERE o.driver_id=d.user_id AND o.booking_id<>? AND o.state='offered' AND o.expires_at>? AND b.status='requested') ${paymentKey?'AND COALESCE(w.promo+w.recharge,0)>=?':''} ORDER BY d.user_id`,...(paymentKey?[mode]:[]),booking.city_id,new Date(at).toISOString().slice(0,10),at-15000,booking.id,at,...(paymentKey?[Math.max(0,Number(booking.fare)-Number(booking.partner_fare))]:[]));
   if(current?.state==='offered'&&current.expires_at>at&&candidates.some((d:any)=>d.user_id===current.driver_id))continue;
   if(!candidates.length)continue;
   // Lexical successor rotates fairly and naturally returns to the first driver.
   const next=candidates.find((d:any)=>d.user_id>(current?.driver_id||''))||candidates[0];
   await stmt(database,"INSERT INTO ride_offers(booking_id,driver_id,offer_id,offered_at,expires_at,attempt,state) VALUES(?,?,?,?,?,1,'offered') ON CONFLICT(booking_id) DO UPDATE SET driver_id=excluded.driver_id,offer_id=excluded.offer_id,offered_at=excluded.offered_at,expires_at=excluded.expires_at,attempt=ride_offers.attempt+1,state='offered'",booking.id,next.user_id,crypto.randomUUID(),at,at+offerDuration).run();
  }
  const offers=await all(database,"SELECT b.id,b.pickup,b.destination,b.trip_type,b.transmission,b.scheduled_at,b.partner_fare,o.offer_id,o.offered_at,o.expires_at,o.attempt FROM ride_offers o JOIN bookings b ON b.id=o.booking_id WHERE o.driver_id=? AND o.state='offered' AND o.expires_at>? AND b.status='requested' ORDER BY o.offered_at LIMIT 1",driverId,at);
  return {offers,serverNow:clock()};
 }))}
 async function pass(driver:string,offer:string){await stmt(db,"UPDATE ride_offers SET state='passed' WHERE driver_id=? AND offer_id=? AND state='offered'",driver,offer).run();return {ok:true}}
 return {poll,pass};
}
