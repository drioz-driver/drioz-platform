/**
 * v1.3 feature endpoints: ratings, car inspections, saved places, SOS, driver
 * quick messages, push registration, profile & account deletion, corporate
 * accounts, incentives, shift planning, surge rules, automated licence checks
 * and analytics. Wired into `operations().handle` before the 404 fallback.
 */
import {z} from 'zod';
import {verifyLicence,kycConfigured,type KycRuntime} from './kyc.ts';

type Actor={id:string;email:string;name:string;role:string;disabled:number;phone?:string|null};
export type FeatureContext={
 db:any;bucket:any;now:()=>number;id:()=>string;
 q:(sql:string,...a:any[])=>any;one:(sql:string,...a:any[])=>Promise<any>;all:(sql:string,...a:any[])=>Promise<any[]>;
 log:(a:Actor,target:string,action:string,details?:unknown)=>any;notification:(user:string,message:string)=>any;
 scopedTrip:(a:Actor,id:string)=>Promise<any>;parse:<T>(s:z.ZodType<T>,d:unknown)=>T;fail:(n:number,m:string)=>never;requireRole:(a:Actor,roles:string[])=>void;
 alert:(users:string[],app:'customer'|'partner'|'staff',title:string,body:string,data?:Record<string,unknown>)=>Promise<void>;
 textUser:(target:{userId?:string;phone?:string},event:import('./notify.ts').MessageEvent,vars:Record<string,string>)=>Promise<void>;
 staffIds:()=>Promise<string[]>;
 kyc:KycRuntime;fetcher:typeof fetch;sosPhone?:string;
};
const admins=['admin','operator'],finance=['admin','finance'],analysts=['admin','operator','finance'];
export const checklistItems=['exterior','interior','tyres','lights','dashboard_warnings','documents'] as const;
const coordinate=z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)});
const hhmm=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const minutes=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3,5));
export const quickMessages:Record<string,string>={late5:'Your driver is running about 5 minutes late.',late10:'Your driver is running about 10 minutes late.',arrived_gate:'Your driver has reached the gate / main entrance.',cant_find:'Your driver can’t find your car. Please check your messages or call support.',on_way:'Your driver is on the way to your pickup point.'};

export async function handleFeature(c:FeatureContext,a:Actor,path:string,method:string,data:any,request?:Request):Promise<any>{
 const {q,one,all,now,id,log,notification,parse,fail,requireRole}=c;
 const parts=path.split('/');

 // ---------- Saved places ----------
 if(path==='places'&&method==='POST'){
  const d=parse(z.object({label:z.string().trim().min(1).max(40),address:z.string().trim().min(3).max(200),lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)}).strict(),data);
  const count=Number((await one('SELECT COUNT(*) AS n FROM saved_places WHERE user_id=?',a.id)).n);if(count>=10)fail(409,'You can save up to 10 places');
  const placeId=id();await q('INSERT INTO saved_places(id,user_id,label,address,lat,lng,created_at) VALUES(?,?,?,?,?,?,?)',placeId,a.id,d.label,d.address,d.lat,d.lng,now()).run();return {id:placeId,message:'Place saved.'};
 }
 if(parts[0]==='places'&&parts[2]==='delete'&&method==='POST'){const r=await q('DELETE FROM saved_places WHERE id=? AND user_id=?',parts[1],a.id).run();if(!r.meta.changes)fail(404,'Place not found');return {ok:true,message:'Place removed.'}}

 // ---------- Trip-scoped features ----------
 if(parts[0]==='bookings'&&parts.length===3){
  const action=parts[2];
  if(action==='rate'&&method==='POST'){
   const b=await c.scopedTrip(a,parts[1]);if(b.status!=='completed')fail(409,'You can rate a trip once it is completed');
   const byCustomer=b.customer_id===a.id,byDriver=b.driver_id===a.id;if(!byCustomer&&!byDriver)fail(403,'Only the customer or driver can rate this trip');
   const d=parse(z.object({stars:z.number().int().min(1).max(5),comment:z.string().trim().max(500).default(''),tags:z.array(z.string().max(30)).max(6).default([])}).strict(),data);
   try{await q('INSERT INTO ratings(booking_id,rater_id,ratee_id,by_role,stars,tags,comment,created_at) VALUES(?,?,?,?,?,?,?,?)',b.id,a.id,byCustomer?b.driver_id:b.customer_id,byCustomer?'customer':'driver',d.stars,JSON.stringify(d.tags),d.comment,now()).run()}catch{fail(409,'You have already rated this trip')}
   if(byCustomer&&d.stars<=2){const staff=await c.staffIds();await c.db.batch(staff.map(s=>notification(s,`Low rating (${d.stars}★) on trip ${b.id.slice(0,8)}. Review in Operations.`)))}
   return {ok:true,message:'Thanks for your rating.'};
  }
  if(action==='inspection'&&method==='POST'&&request){
   const b=await c.scopedTrip(a,parts[1]);if(b.driver_id!==a.id)fail(403,'Only the assigned driver can record the car inspection');
   const form=await request.formData();const phase=String(form.get('phase')||'');if(!['pre','post'].includes(phase))fail(400,'Choose before-trip or after-trip inspection');
   if(phase==='pre'&&!['assigned','arrived'].includes(b.status))fail(409,'The before-trip inspection is recorded before the journey starts');
   if(phase==='post'&&b.status!=='in_progress')fail(409,'The after-trip inspection is recorded at the end of the journey');
   let checklist:any;try{checklist=JSON.parse(String(form.get('checklist')||'{}'))}catch{fail(400,'Invalid checklist')}
   const parsed=parse(z.object({items:z.record(z.enum(checklistItems),z.enum(['ok','issue'])),fuelPercent:z.number().int().min(0).max(100).optional(),odometerKm:z.number().int().min(0).max(2000000).optional()}).strict(),checklist);
   if(checklistItems.some(k=>!parsed.items[k]))fail(400,'Complete every checklist item');
   const notes=String(form.get('notes')||'').trim().slice(0,1000);if(Object.values(parsed.items).includes('issue')&&notes.length<5)fail(400,'Describe the issue you found');
   const files=form.getAll('photos').filter((f):f is File=>f instanceof File&&f.size>0);if(files.length>6)fail(400,'Upload at most 6 photos');
   if(files.length&&!c.bucket)fail(503,'Photo storage unavailable');
   const inspectionId=id(),keys:string[]=[];
   for(const [n,file] of files.entries()){
    const maxPhoto=Math.min(5*1024*1024,c.bucket?.maxUploadBytes||5*1024*1024);if(file.size>maxPhoto)fail(400,`Each photo must be under ${Math.round(maxPhoto/1024/1024*10)/10} MB`);
    const bytes=new Uint8Array(await file.arrayBuffer());const jpeg=bytes[0]===0xff&&bytes[1]===0xd8,png=bytes[0]===0x89&&bytes[1]===0x50;if(!jpeg&&!png)fail(400,'Photos must be JPEG or PNG');
    const key=`inspections/${b.id}/${phase}/${inspectionId}-${n}`;await c.bucket.put(key,bytes,{httpMetadata:{contentType:jpeg?'image/jpeg':'image/png'}});keys.push(key);
   }
   try{await c.db.batch([q('INSERT INTO inspections(id,booking_id,driver_id,phase,checklist,notes,photos,created_at) VALUES(?,?,?,?,?,?,?,?)',inspectionId,b.id,a.id,phase,JSON.stringify(parsed),notes,JSON.stringify(keys),now()),log(a,b.id,`inspection_${phase}`,{issues:Object.entries(parsed.items).filter(([,v])=>v==='issue').map(([k])=>k),photos:keys.length}),notification(b.customer_id,`Trip ${b.id.slice(0,8)}: ${phase==='pre'?'before':'after'}-trip car check recorded${Object.values(parsed.items).includes('issue')?' — issues noted':''}.`)])}
   catch{for(const k of keys)await c.bucket?.delete(k);fail(409,'This inspection was already recorded')}
   return {id:inspectionId,message:phase==='pre'?'Before-trip check saved. You can start the journey once the customer shares the code.':'After-trip check saved.'};
  }
  if(action==='inspections'&&method==='GET'){
   const b=await c.scopedTrip(a,parts[1]);
   return {inspections:(await all('SELECT id,phase,checklist,notes,photos,created_at FROM inspections WHERE booking_id=? ORDER BY created_at',b.id)).map((r:any)=>({id:r.id,phase:r.phase,checklist:JSON.parse(r.checklist),notes:r.notes,photoCount:JSON.parse(r.photos).length,createdAt:r.created_at}))};
  }
  if(action==='sos'&&method==='POST'){
   const b=await c.scopedTrip(a,parts[1]);if(b.customer_id!==a.id&&b.driver_id!==a.id)fail(403,'Only the customer or driver can raise an SOS');
   if(!['assigned','arrived','in_progress'].includes(b.status)&&!(b.status==='completed'&&now()-Number(b.completed_at||b.updated_at)<6*3600000))fail(409,'SOS is available during and shortly after a trip');
   const d=parse(z.object({point:coordinate.optional(),note:z.string().trim().max(500).optional()}).strict(),data||{});
   const ticketId=id(),role=b.customer_id===a.id?'customer':'driver',where=d.point?`https://www.google.com/maps/search/?api=1&query=${d.point.lat},${d.point.lng}`:'location not shared';
   const staff=await c.staffIds();
   await c.db.batch([q('INSERT INTO tickets(id,user_id,booking_id,category,subject,created_at) VALUES(?,?,?,?,?,?)',ticketId,a.id,b.id,'safety',`SOS · trip ${b.id.slice(0,8).toUpperCase()} · raised by ${role}`,now()),
    q('INSERT INTO replies(id,ticket_id,user_id,message,created_at) VALUES(?,?,?,?,?)',id(),ticketId,a.id,[`SOS raised by the ${role} (${a.name}).`,`Location: ${where}`,`Trip status: ${b.status}`,d.note?`Note: ${d.note}`:''].filter(Boolean).join('\n'),now()),
    log(a,b.id,'sos_raised',{role,point:d.point||null}),...staff.map(s=>notification(s,`🚨 SOS on trip ${b.id.slice(0,8)} raised by ${role}. Open Support now.`))]);
   await c.alert(staff,'staff','🚨 SOS raised',`Trip ${b.id.slice(0,8).toUpperCase()} · ${role} · ${where}`,{ticketId,bookingId:b.id,type:'sos'});
   if(c.sosPhone)await c.textUser({phone:c.sosPhone},'sos',{var1:b.id.slice(0,8).toUpperCase(),var2:role,var3:where});
   return {ticketId,emergencyNumber:'112',message:'Our safety team has been alerted. If you are in danger, call 112 now.'};
  }
  if(action==='message'&&method==='POST'){
   const b=await c.scopedTrip(a,parts[1]);if(b.driver_id!==a.id)fail(403,'Only the assigned driver can send trip updates');if(!['assigned','arrived'].includes(b.status))fail(409,'Updates can be sent before the journey starts');
   const d=parse(z.object({template:z.enum(Object.keys(quickMessages) as [string,...string[]])}).strict(),data);const text=quickMessages[d.template];
   const recent=await one("SELECT id FROM audit WHERE target=? AND action='driver_message' AND created_at>?",b.id,now()-60000);if(recent)fail(429,'Please wait a minute before sending another update');
   await c.db.batch([notification(b.customer_id,`Trip ${b.id.slice(0,8)}: ${text}`),log(a,b.id,'driver_message',{template:d.template})]);
   await c.alert([b.customer_id],'customer','Update from your driver',text,{bookingId:b.id});await c.textUser({userId:b.customer_id},'running_late',{var1:a.name,var2:text});
   return {ok:true,message:'Customer notified.'};
  }
 }
 if(parts[0]==='inspections'&&parts[2]==='photos'&&parts.length===4&&method==='GET'){
  const r=await one('SELECT i.*,b.customer_id,b.driver_id AS trip_driver FROM inspections i JOIN bookings b ON b.id=i.booking_id WHERE i.id=?',parts[1]);if(!r)fail(404,'Inspection not found');
  if(r.customer_id!==a.id&&r.trip_driver!==a.id&&![...admins,'support'].includes(a.role))fail(403,'Access denied');
  const key=JSON.parse(r.photos)[Number(parts[3])];if(!key)fail(404,'Photo not found');const obj=await c.bucket?.get(key);if(!obj)fail(404,'Photo unavailable');if(obj.downloadUrl)return Response.redirect(obj.downloadUrl,303);
  return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
 }

 // ---------- Push registration ----------
 if(path==='push/register'&&method==='POST'){
  const d=parse(z.object({token:z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/,'Invalid push token'),app:z.enum(['customer','partner']),platform:z.enum(['ios','android','web'])}).strict(),data);
  await q('INSERT INTO push_tokens(token,user_id,app,platform,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,app=excluded.app,platform=excluded.platform,updated_at=excluded.updated_at',d.token,a.id,d.app,d.platform,now()).run();return {ok:true};
 }
 if(path==='push/unregister'&&method==='POST'){const d=parse(z.object({token:z.string().max(200)}).strict(),data);await q('DELETE FROM push_tokens WHERE token=? AND user_id=?',d.token,a.id).run();return {ok:true}}

 // ---------- Account ----------
 if(path==='account/profile'&&method==='POST'){
  const d=parse(z.object({name:z.string().trim().min(2).max(80).optional(),phone:z.string().regex(/^\+?[0-9]{10,15}$/,'Enter a valid mobile number').optional()}).strict(),data);
  if(d.name)await q('UPDATE users SET name=? WHERE id=?',d.name,a.id).run();if(d.phone)await q('UPDATE users SET phone=? WHERE id=?',d.phone,a.id).run();return {ok:true,message:'Profile updated.'};
 }
 if(path==='account/delete'&&method==='POST'){
  parse(z.object({confirm:z.literal('DELETE')}).strict(),data);
  if(a.role==='admin')fail(403,'The owner account cannot be deleted here');
  if(await one("SELECT id FROM bookings WHERE (customer_id=? OR driver_id=?) AND status IN ('requested','assigned','arrived','in_progress')",a.id,a.id))fail(409,'Finish or cancel your active trips before deleting your account');
  const docs=await all('SELECT object_key FROM documents WHERE owner_id=?',a.id);for(const d of docs)await c.bucket?.delete(d.object_key).catch(()=>{});
  await c.db.batch([q("UPDATE users SET name='Deleted user',email=?,phone=NULL,company_id=NULL,disabled=1 WHERE id=?",`deleted-${a.id.replace(/[^a-z0-9]/gi,'').slice(-12)}@deleted.drioz.invalid`,a.id),
   q('DELETE FROM saved_places WHERE user_id=?',a.id),q('DELETE FROM push_tokens WHERE user_id=?',a.id),q('DELETE FROM documents WHERE owner_id=?',a.id),
   q("UPDATE drivers SET online=0,verification='rejected',phone='',licence='',review_note='Account deleted by user',lat=NULL,lng=NULL WHERE user_id=?",a.id),
   q('DELETE FROM availability_plans WHERE driver_id=?',a.id),log(a,a.id,'account_deleted')]);
  return {ok:true,message:'Your account has been deleted. Trip and payment records are kept anonymised where the law requires.'};
 }

 // ---------- Corporate accounts ----------
 if(path==='companies'&&method==='POST'){
  requireRole(a,['admin']);const d=parse(z.object({id:z.string().optional(),name:z.string().trim().min(2).max(120),gstin:z.string().trim().toUpperCase().regex(/^$|^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,'Invalid GSTIN').default(''),billingEmail:z.string().trim().email().max(254),address:z.string().trim().max(300).default(''),active:z.boolean().default(true)}).strict(),data);
  const companyId=d.id||id();await q('INSERT INTO companies(id,name,gstin,billing_email,address,active,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,gstin=excluded.gstin,billing_email=excluded.billing_email,address=excluded.address,active=excluded.active',companyId,d.name,d.gstin,d.billingEmail,d.address,d.active?1:0,now()).run();
  await log(a,companyId,'company_saved',d).run();return {id:companyId,message:'Company saved.'};
 }
 if(parts[0]==='companies'&&parts[2]==='members'&&method==='POST'){
  requireRole(a,['admin']);const d=parse(z.object({email:z.string().trim().toLowerCase().email(),remove:z.boolean().default(false)}).strict(),data);
  if(!await one('SELECT id FROM companies WHERE id=?',parts[1]))fail(404,'Company not found');
  const u=await one('SELECT * FROM users WHERE lower(email)=?',d.email);if(!u)fail(404,'No DRIOZ account with that email — ask them to sign up first');
  await q('UPDATE users SET company_id=? WHERE id=?',d.remove?null:parts[1],u.id).run();await c.db.batch([log(a,u.id,d.remove?'company_member_removed':'company_member_added',{company:parts[1]}),...(d.remove?[]:[notification(u.id,'You can now bill rides to your company account.')])]);
  return {ok:true,message:d.remove?'Member removed.':'Member added.'};
 }

 // ---------- Incentives ----------
 if(path==='incentives'&&method==='POST'){
  requireRole(a,['admin']);const d=parse(z.object({cityId:z.string().nullable().default(null),title:z.string().trim().min(3).max(80),targetTrips:z.number().int().min(1).max(500),bonus:z.number().int().min(100).max(10000000),startsAt:z.number().int(),endsAt:z.number().int()}).strict(),data);
  if(d.endsAt<=d.startsAt)fail(400,'End must be after start');const incentiveId=id();
  await c.db.batch([q('INSERT INTO incentives(id,city_id,title,target_trips,bonus,starts_at,ends_at,active,created_at) VALUES(?,?,?,?,?,?,?,1,?)',incentiveId,d.cityId,d.title,d.targetTrips,d.bonus,d.startsAt,d.endsAt,now()),log(a,incentiveId,'incentive_created',d)]);return {id:incentiveId,message:'Incentive created.'};
 }
 if(parts[0]==='incentives'&&parts[2]==='toggle'&&method==='POST'){requireRole(a,['admin']);await q('UPDATE incentives SET active=1-active WHERE id=?',parts[1]).run();return {ok:true}}
 if(parts[0]==='incentive-awards'&&parts[2]==='paid'&&method==='POST'){
  requireRole(a,finance);const d=parse(z.object({reference:z.string().trim().min(5).max(100)}).strict(),data);
  const r=await q("UPDATE incentive_awards SET status='paid',reference=? WHERE id=? AND status='pending'",d.reference,parts[1]).run();if(!r.meta.changes)fail(409,'Award unavailable or already paid');await log(a,parts[1],'incentive_paid',d).run();return {ok:true};
 }

 // ---------- Shift planner ----------
 if(path==='driver/plan'&&method==='POST'){
  if(!await one('SELECT user_id FROM drivers WHERE user_id=?',a.id))fail(403,'Complete partner onboarding first');
  const d=parse(z.object({day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),start:hhmm.optional(),end:hhmm.optional(),off:z.boolean().default(false)}).strict(),data);
  const today=new Date(now()+19800000).toISOString().slice(0,10),limit=new Date(now()+19800000+14*86400000).toISOString().slice(0,10);if(d.day<today||d.day>limit)fail(400,'Plan up to 14 days ahead');
  if(!d.off&&(!d.start||!d.end||minutes(d.end)<=minutes(d.start)))fail(400,'Choose a start and end time');
  await q('INSERT INTO availability_plans(driver_id,day,start_min,end_min,off,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(driver_id,day) DO UPDATE SET start_min=excluded.start_min,end_min=excluded.end_min,off=excluded.off,updated_at=excluded.updated_at',a.id,d.day,d.off?0:minutes(d.start!),d.off?0:minutes(d.end!),d.off?1:0,now()).run();
  return {ok:true,message:d.off?'Marked as day off.':'Availability saved.'};
 }

 // ---------- Surge rules ----------
 if(path==='surge-rules'&&method==='POST'){
  requireRole(a,['admin']);const d=parse(z.object({cityId:z.string(),label:z.string().trim().min(2).max(40),multiplierBps:z.number().int().min(10100).max(30000),days:z.number().int().min(1).max(127),start:hhmm,end:hhmm}).strict(),data);
  if(!await one('SELECT id FROM cities WHERE id=?',d.cityId))fail(404,'City not found');const ruleId=id();
  await c.db.batch([q('INSERT INTO surge_rules(id,city_id,label,multiplier_bps,days,start_min,end_min,active,created_at) VALUES(?,?,?,?,?,?,?,1,?)',ruleId,d.cityId,d.label,d.multiplierBps,d.days,minutes(d.start),minutes(d.end),now()),log(a,ruleId,'surge_rule_created',d)]);return {id:ruleId,message:'Busy-time pricing rule added.'};
 }
 if(parts[0]==='surge-rules'&&parts[2]==='delete'&&method==='POST'){requireRole(a,['admin']);await c.db.batch([q('DELETE FROM surge_rules WHERE id=?',parts[1]),log(a,parts[1],'surge_rule_deleted')]);return {ok:true}}

 // ---------- Automated licence verification ----------
 if(parts[0]==='drivers'&&parts[2]==='kyc'&&method==='POST'){
  requireRole(a,admins);if(!kycConfigured(c.kyc))fail(503,'Automated licence verification is not configured (IDFY_ACCOUNT_ID / IDFY_API_KEY)');
  const d=await one('SELECT d.*,u.name FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.user_id=?',parts[1]);if(!d)fail(404,'Partner not found');if(!d.date_of_birth)fail(409,'The partner has not provided a date of birth');
  const result=await verifyLicence(c.kyc,{licence:d.licence,dateOfBirth:d.date_of_birth,name:d.name},c.fetcher);
  await c.db.batch([q('UPDATE drivers SET kyc_status=?,kyc_result=? WHERE user_id=?',result.status,JSON.stringify(result),d.user_id),log(a,d.user_id,'kyc_checked',{status:result.status})]);return {...result,message:result.summary};
 }

 // ---------- Analytics ----------
 // Aggregation is done in JS on bounded row sets so the SQL stays portable across Postgres (production) and SQLite (tests).
 if(path==='analytics'&&method==='GET'){
  requireRole(a,analysts);const t=now(),day=86400000,since=t-14*day,month=t-30*day;const n=(v:any)=>v==null?null:Number(v);
  const istDay=(ms:number)=>new Date(Number(ms)+19800000).toISOString().slice(0,10);
  const recent=await all('SELECT b.created_at,b.assigned_at,b.status,b.fare,b.city_id,c.name AS city_name FROM bookings b JOIN cities c ON c.id=b.city_id WHERE b.created_at>=? ORDER BY b.created_at LIMIT 20000',month);
  const days=new Map<string,{day:string;bookings:number;completed:number;cancelled:number;revenue:number}>();
  for(let i=13;i>=0;i--){const k=istDay(t-i*day);days.set(k,{day:k,bookings:0,completed:0,cancelled:0,revenue:0})}
  const cities=new Map<string,{city_id:string;name:string;trips:number;revenue:number}>();let assignedSum=0,assignedN=0;
  for(const r of recent){const k=istDay(r.created_at),row=days.get(k);if(row&&Number(r.created_at)>=since){row.bookings++;if(r.status==='completed'){row.completed++;row.revenue+=Number(r.fare)}if(r.status==='cancelled')row.cancelled++}
   if(r.assigned_at!=null){assignedSum+=Number(r.assigned_at)-Number(r.created_at);assignedN++}
   if(r.status==='completed'){const c=cities.get(r.city_id)||{city_id:r.city_id,name:r.city_name,trips:0,revenue:0};c.trips++;c.revenue+=Number(r.fare);cities.set(r.city_id,c)}}
  const totals={bookings:recent.length,cancelled:recent.filter((r:any)=>r.status==='cancelled').length,completed:recent.filter((r:any)=>r.status==='completed').length};
  const events=await all('SELECT driver_id,outcome,offered_at,expires_at,responded_at FROM ride_offer_events WHERE offered_at>=? LIMIT 50000',month);
  const outcome=(e:any)=>e.outcome||(Number(e.expires_at)<=t?'expired':'open');
  const accepted=events.filter((e:any)=>outcome(e)==='accepted');
  const offers={total:events.length,accepted:accepted.length,declined:events.filter((e:any)=>outcome(e)==='passed').length,expired:events.filter((e:any)=>outcome(e)==='expired').length,avgAcceptMs:accepted.length?accepted.reduce((s:number,e:any)=>s+Number(e.responded_at)-Number(e.offered_at),0)/accepted.length:null};
  const rating=await one("SELECT AVG(stars) AS avg,COUNT(*) AS n FROM ratings WHERE by_role='customer' AND created_at>=?",month);
  const health=await all(`SELECT d.user_id,u.name,d.gps_flags,d.kyc_status,
    (SELECT AVG(stars) FROM ratings r WHERE r.ratee_id=d.user_id AND r.by_role='customer') AS rating,
    (SELECT COUNT(*) FROM ratings r WHERE r.ratee_id=d.user_id AND r.by_role='customer') AS ratings
    FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.verification='approved'`);
  const perDriver=new Map<string,{offers:number;missed:number}>();for(const e of events){const p=perDriver.get(e.driver_id)||{offers:0,missed:0};p.offers++;if(['passed','expired'].includes(outcome(e)))p.missed++;perDriver.set(e.driver_id,p)}
  const flagged=health.map((h:any)=>{const p=perDriver.get(h.user_id)||{offers:0,missed:0};const r={...h,offers:p.offers,missed:p.missed,gps_flags:Number(h.gps_flags||0),ratings:Number(h.ratings),rating:h.rating==null?null:Math.round(Number(h.rating)*100)/100};return {...r,flags:[...(r.offers>=5&&r.missed/r.offers>0.6?['High decline rate']:[]),...(r.ratings>=3&&r.rating!=null&&r.rating<3.5?['Low rating']:[]),...(r.gps_flags>=3?['Suspicious GPS jumps']:[]),...(r.kyc_status==='mismatch'||r.kyc_status==='not_found'?['Licence check failed']:[])]}}).sort((x:any,y:any)=>y.flags.length-x.flags.length);
  return {daily:[...days.values()],offers:{...offers,acceptanceRate:offers.total?offers.accepted/offers.total:null},avgAssignMs:assignedN?assignedSum/assignedN:null,byCity:[...cities.values()].sort((x,y)=>y.revenue-x.revenue),totals:{...totals,cancellationRate:totals.bookings?totals.cancelled/totals.bookings:null},rating:{avg:n(rating?.avg),n:Number(rating?.n||0)},partnerHealth:flagged};
 }
 return undefined;
}
