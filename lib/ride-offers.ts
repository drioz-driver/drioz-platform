import {distance} from './domain.ts';
export class RideOfferError extends Error{status=409}
const stmt=(db:any,sql:string,...args:any[])=>db.prepare(sql).bind(...args);
const one=async(db:any,sql:string,...args:any[])=>stmt(db,sql,...args).first();
const all=async(db:any,sql:string,...args:any[])=>(await stmt(db,sql,...args).all()).results;
export const offerDuration=10000;
// Keep the SQL deadline authoritative; browser/device clocks never grant acceptance.
export async function claimRideOffer(db:any,booking:string,driver:string,offer:string,at=Date.now()){
 const r=await stmt(db,"UPDATE ride_offers SET state='accepted' WHERE booking_id=? AND driver_id=? AND offer_id=? AND state='offered' AND expires_at>?",booking,driver,offer,at).run();
 if(!r.meta.changes)throw new RideOfferError('This offer has expired or moved to another driver. Wait for your next offer.');
 await stmt(db,"UPDATE ride_offer_events SET outcome='accepted',responded_at=? WHERE offer_id=?",at,offer).run();
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
  const requests=await all(database,"SELECT * FROM bookings WHERE (city_id=? OR ((city_id='india' OR city_id LIKE 'intl-%') AND CAST(? AS DOUBLE PRECISION) IS NOT NULL AND CAST(? AS BIGINT)>? AND ABS(pickup_lat-?)<0.3 AND ABS(pickup_lng-?)<0.4)) AND status='requested' AND (scheduled_at IS NULL OR scheduled_at<=?) ORDER BY created_at,id LIMIT 10 FOR UPDATE SKIP LOCKED",me.city_id,me.lat,me.location_at||0,at-120000,me.lat,me.lng,at+1800000);
  const wallet=paymentKey?await one(database,'SELECT promo,recharge FROM driver_accounts WHERE driver_id=? AND mode=?',driverId,mode):null;
  const availableFunds=paymentKey?Number(wallet?.promo||0)+Number(wallet?.recharge||0):Number.MAX_SAFE_INTEGER;
  const visible=requests.filter((b:any)=>!(b.city_id==='india'||b.city_id.startsWith('intl-'))||me.location_at>at-120000&&distance(me.lat,me.lng,b.pickup_lat,b.pickup_lng)<=25);
  const blocked=visible.filter((b:any)=>Math.max(0,Number(b.fare)-Number(b.partner_fare))>availableFunds);
  const availability={waitingCount:visible.length,blockedCount:blocked.length,availableFunds:paymentKey?availableFunds:null,minimumRecharge:blocked.length?Math.min(...blocked.map((b:any)=>Math.max(0,Number(b.fare)-Number(b.partner_fare))-availableFunds)):0,
   requests:blocked.slice(0,3).map((b:any)=>{let info:any={};try{info=JSON.parse(b.breakdown||'{}')}catch{}return {id:b.id,pickup:b.pickup,destination:b.destination,partnerFare:Number(b.partner_fare),localPricing:info.localPricing,requiredRecharge:Math.max(0,Number(b.fare)-Number(b.partner_fare))-availableFunds}})};
  for(const booking of requests){
   if((booking.city_id==='india'||booking.city_id.startsWith('intl-'))&&(!me.location_at||me.location_at<at-120000||distance(me.lat,me.lng,booking.pickup_lat,booking.pickup_lng)>25))continue;
   const current=await one(database,'SELECT * FROM ride_offers WHERE booking_id=?',booking.id);
   const candidates=await all(database,`SELECT d.user_id,d.lat,d.lng FROM drivers d JOIN users u ON u.id=d.user_id JOIN ride_offer_presence p ON p.driver_id=d.user_id ${paymentKey?'LEFT JOIN driver_accounts w ON w.driver_id=d.user_id AND w.mode=?':''} WHERE (d.city_id=? OR ((?='india' OR ? LIKE 'intl-%') AND d.location_at>? AND ABS(d.lat-?)<0.3 AND ABS(d.lng-?)<0.4)) AND d.verification='approved' AND d.online=1 AND u.role='driver' AND u.disabled=0 AND d.licence_expiry>=? AND p.seen_at>? AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.driver_id=d.user_id AND b.status IN ('assigned','arrived','in_progress')) AND NOT EXISTS(SELECT 1 FROM ride_offers o JOIN bookings b ON b.id=o.booking_id WHERE o.driver_id=d.user_id AND o.booking_id<>? AND o.state='offered' AND o.expires_at>? AND b.status='requested') ${paymentKey?'AND COALESCE(w.promo+w.recharge,0)>=?':''} ORDER BY d.user_id`,...(paymentKey?[mode]:[]),booking.city_id,booking.city_id,booking.city_id,at-120000,booking.pickup_lat,booking.pickup_lng,new Date(at).toISOString().slice(0,10),at-15000,booking.id,at,...(paymentKey?[Math.max(0,Number(booking.fare)-Number(booking.partner_fare))]:[]));
   if((booking.city_id==='india'||booking.city_id.startsWith('intl-'))){for(let i=candidates.length-1;i>=0;i--){const d=candidates[i];if(!d||distance(d.lat,d.lng,booking.pickup_lat,booking.pickup_lng)>25)candidates.splice(i,1)}}
   if(current?.state==='offered'&&current.expires_at>at&&candidates.some((d:any)=>d.user_id===current.driver_id))continue;
   if(!candidates.length)continue;
   // Lexical successor rotates fairly and naturally returns to the first driver.
   const next=candidates.find((d:any)=>d.user_id>(current?.driver_id||''))||candidates[0];
   const offerId=crypto.randomUUID();
   await stmt(database,"INSERT INTO ride_offers(booking_id,driver_id,offer_id,offered_at,expires_at,attempt,state) VALUES(?,?,?,?,?,1,'offered') ON CONFLICT(booking_id) DO UPDATE SET driver_id=excluded.driver_id,offer_id=excluded.offer_id,offered_at=excluded.offered_at,expires_at=excluded.expires_at,attempt=ride_offers.attempt+1,state='offered'",booking.id,next.user_id,offerId,at,at+offerDuration).run();
   // Keep a history row per offer for acceptance analytics and partner-health flags.
   await stmt(database,'INSERT INTO ride_offer_events(offer_id,booking_id,driver_id,attempt,offered_at,expires_at) SELECT offer_id,booking_id,driver_id,attempt,offered_at,expires_at FROM ride_offers WHERE booking_id=? ON CONFLICT(offer_id) DO NOTHING',booking.id).run();
  }
  const offers=(await all(database,"SELECT b.id,b.pickup,b.destination,b.trip_type,b.transmission,b.scheduled_at,b.partner_fare,b.breakdown,b.pickup_lat,b.pickup_lng,o.offer_id,o.offered_at,o.expires_at,o.attempt FROM ride_offers o JOIN bookings b ON b.id=o.booking_id WHERE o.driver_id=? AND o.state='offered' AND o.expires_at>? AND b.status='requested' ORDER BY o.offered_at LIMIT 1",driverId,at)).map((o:any)=>{
   let info:any={};try{info=JSON.parse(o.breakdown||'{}')}catch{}
   const located=me.lat!=null&&me.lng!=null&&Number(me.location_at||0)>at-120000;
   const {breakdown:_omit,...rest}=o;
   return {...rest,localPricing:info.localPricing,hours:info.hours??null,vehicleCategory:info.vehicleCategory??null,seconds:offerDuration/1000,pickupDistanceKm:located?Math.round(distance(Number(o.pickup_lat),Number(o.pickup_lng),Number(me.lat),Number(me.lng))*10)/10:null};
  });
  return {offers,availability,serverNow:clock()};
 }))}
 async function pass(driver:string,offer:string){const r=await stmt(db,"UPDATE ride_offers SET state='passed' WHERE driver_id=? AND offer_id=? AND state='offered'",driver,offer).run();if(r.meta.changes)await stmt(db,"UPDATE ride_offer_events SET outcome='passed',responded_at=? WHERE offer_id=? AND outcome IS NULL",clock(),offer).run();return {ok:true}}
 return {poll,pass};
}
