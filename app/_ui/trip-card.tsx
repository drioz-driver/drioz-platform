'use client';
import DriverPortrait from './driver-portrait';
import {bookingDraftKey} from '@/lib/booking-draft';
import {localMoney} from '@/lib/local-money';
import {useEffect,useState,type ReactNode} from 'react';
import {Calendar,Car,Clock,Cog,FileText,KeyRound,LocateFixed,Navigation,Share2,Star,UserRound,Zap} from 'lucide-react';
import {Badge,Field,Form} from './primitives';
import {fmt,ref,tripTypeName,when} from './client';
import {SearchingWheel,SteeringStrip} from './steering';

export type TripMode='customer'|'partner'|'dispatch';
export type TripActions={
 busy:boolean;
 act:(path:string,payload:unknown)=>Promise<any>;
 click:(path:string,payload:unknown)=>Promise<void>;
 cityName:(id:string)=>string;
 code?:string;
 codeExpiresAt?:number;
 onCode?:(code:string,expiresAt:number)=>void;
 onStatement?:()=>void;
 onLocation?:()=>void;
 onShare?:()=>void;
 drivers?:any[];
};

function breakdown(b:any){try{return JSON.parse(b.breakdown||'{}')}catch{return {}}}
export function tripExtras(b:any){try{return JSON.parse(b.extras||'{}')}catch{return {}}}

export function TripMeta({b,cityName}:{b:any;cityName:(id:string)=>string}){
 const info=breakdown(b);
 return <div className="meta">
  <span><Navigation/>{cityName(b.city_id)}</span>
  <span><Zap/>{tripTypeName(b.trip_type)}{info.hours?` · ${info.hours}h`:''}</span>
  <span><Cog/>{b.transmission}</span>
  {info.vehicleCategory&&<span><Car/>{info.vehicleCategory}</span>}
  <span>{b.scheduled_at?<><Calendar/>{when(b.scheduled_at)}</>:<><Clock/>Immediate pickup</>}</span>
 </div>;
}

export function TripRoute({b}:{b:any}){
 return <div className="trip-route"><div><small>Pickup</small><strong>{b.pickup}</strong></div><div><small>{b.trip_type==='return'?'Return to':'Destination'}</small><strong>{b.destination}</strong></div></div>;
}

/**
 * Shared trip card. Portals extend it through slots instead of editing it:
 * `before` renders above the route (e.g. live tracking), `actions` replaces the
 * default action row for that mode, and `after` renders below the actions.
 */
export function TripCard({b,mode,t,before,actions,after}:{b:any;mode:TripMode;t:TripActions;before?:ReactNode;actions?:ReactNode;after?:ReactNode}){
 const extras=tripExtras(b);const fmt=(n:number)=>localMoney(n,b.breakdown);
 const live=['assigned','arrived','in_progress'].includes(b.status);
 const eligible=(t.drivers||[]).filter((d:any)=>d.verification==='approved'&&d.online&&d.city_id===b.city_id&&!d.disabled);
 return <article className="trip">
  <div className="trip-top"><span>DR-{ref(b.id)}</span><Badge value={b.status==='no_driver'?'No driver found':b.status}/></div>
  {mode==='customer'&&b.status==='requested'&&<div className="finding"><SearchingWheel size={56}/><strong>Finding your driver…</strong><span>Offering your ride to the nearest verified driver. {b.scheduled_at?'Search ends at your scheduled pickup time.':'We’ll search for up to 10 minutes.'}</span></div>}
  {b.status==='in_progress'&&<div className="on-road"><SteeringStrip height={32}/><b><span>ON THE ROAD</span></b></div>}
  {mode==='customer'&&b.driver_id&&b.driver_name&&<DriverPortrait key={b.driver_id} bookingId={b.id} name={b.driver_name}/>}
  {mode==='customer'&&b.status==='no_driver'&&<div className="finding"><strong>No driver found</strong><span>The search ended before a driver accepted.</span><button type="button" className="primary" onClick={()=>retryBooking(b)}>Try again</button></div>}
  {before}
  {b.status==='completed'&&<p className="helper" role="status">{Number(b.paid_amount)>=Number(b.fare)?'Paid · '+String(b.paid_methods||'payment').replaceAll('_',' '):(()=>{try{return JSON.parse(b.payment_choice||'{}').method==='cash'?'Cash selected · waiting for driver confirmation':'Payment due'}catch{return 'Payment due'}})()}</p>}
  <TripRoute b={b}/>
  <TripMeta b={b} cityName={t.cityName}/>
  <div className="trip-fare">
   <span>{mode==='partner'?'Your earnings':b.status==='cancelled'&&b.cancellation_fee?'Cancellation fee':extras.total?'Total incl. extras':'Agreed fare'}<strong>{fmt(mode==='partner'?Number(b.partner_fare):b.status==='cancelled'&&b.cancellation_fee?b.cancellation_fee:Number(b.fare))}</strong>{extras.total>0&&<small className="extras-note">{[extras.extraTime?`${extras.extraHours} h extra`:null,extras.tolls?`tolls ${fmt(extras.tolls)}`:null,extras.parking?`parking ${fmt(extras.parking)}`:null].filter(Boolean).join(' · ')}</small>}</span>
   <div>
    {mode==='customer'&&b.company_id&&<small>Billed to company</small>}{b.invoice_number&&<small>Invoice {b.invoice_number}</small>}{b.driver_name&&mode!=='partner'&&<small><UserRound size={13} style={{verticalAlign:-2}}/> {b.driver_name}{b.driver_rating?<> · <Star size={12} style={{verticalAlign:-1}}/> {b.driver_rating}</>:null}</small>}
    {mode==='dispatch'&&b.customer_name&&<small>Customer · {b.customer_name}</small>}
   </div>
  </div>
    {mode==='customer'&&['assigned','arrived'].includes(b.status)&&<StartCode bookingId={b.id} t={t}/>}
  {actions!==undefined?actions:<div className="actions">
   {mode==='partner'&&b.status==='assigned'&&<button disabled={t.busy} className="primary" onClick={()=>t.click(`bookings/${b.id}/status`,{status:'arrived'})}>Confirm arrival</button>}
   {mode==='partner'&&b.status==='arrived'&&<Form onSubmit={f=>t.act(`bookings/${b.id}/status`,{status:'in_progress',code:f.get('code')})} button="Start journey"><Field title="Customer’s six-digit code"><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="••••••" style={{letterSpacing:'.4em',fontSize:20,textAlign:'center'}}/></Field></Form>}
   {mode==='partner'&&b.status==='in_progress'&&<button disabled={t.busy} className="primary" onClick={()=>{if(confirm('Complete this journey? Confirm only once the trip has ended.'))t.click(`bookings/${b.id}/status`,{status:'completed'})}}>Complete journey</button>}
   {mode==='partner'&&live&&<a className="button" href={`https://www.google.com/maps/dir/?api=1&destination=${b.pickup_lat},${b.pickup_lng}`} target="_blank" rel="noreferrer"><Navigation size={15}/>Navigate to pickup</a>}
   {mode==='customer'&&live&&<button onClick={t.onLocation}><LocateFixed size={15}/>Driver location</button>}
   {mode==='customer'&&b.status!=='no_driver'&&<button onClick={t.onStatement}><FileText size={15}/>{b.invoice_number?'Invoice':'Fare statement'}</button>}
   {mode==='customer'&&!['cancelled','no_driver'].includes(b.status)&&<button onClick={t.onShare}><Share2 size={15}/>Share status</button>}
   {mode==='customer'&&['requested','assigned','arrived'].includes(b.status)&&<button disabled={t.busy} className="subtle" onClick={()=>{if(confirm('Cancel this booking?'))t.click(`bookings/${b.id}/status`,{status:'cancelled',reason:'Customer cancelled'})}}>Cancel booking</button>}

    {mode==='dispatch'&&live&&<button onClick={t.onLocation}><LocateFixed size={15}/>Partner location</button>}
   {mode==='dispatch'&&['assigned','arrived'].includes(b.status)&&<button disabled={t.busy} onClick={()=>t.click(`bookings/${b.id}/reassign`,{})}>Return to dispatch</button>}
   {mode==='dispatch'&&['requested','assigned','arrived'].includes(b.status)&&<button disabled={t.busy} className="subtle" onClick={()=>{if(confirm('Cancel this booking for the customer?'))t.click(`bookings/${b.id}/status`,{status:'cancelled',reason:'Cancelled by operations'})}}>Cancel</button>}
   {mode==='dispatch'&&b.status==='requested'&&<button disabled={t.busy} className="dark" onClick={()=>t.click(`bookings/${b.id}/auto-assign`,{})}><Zap size={15}/>Auto-assign nearest</button>}
   {mode==='dispatch'&&b.status==='requested'&&<Form button="Assign partner" buttonClass="" onSubmit={f=>t.act(`bookings/${b.id}/assign`,{driverId:f.get('driverId')})}><Field title={`Approved online partners · ${eligible.length}`}><select name="driverId" required defaultValue=""><option value="" disabled>Select partner</option>{eligible.map((d:any)=><option key={d.user_id} value={d.user_id}>{d.name}</option>)}</select></Field></Form>}
  </div>}
   {mode==='partner'&&['assigned','arrived'].includes(b.status)&&<details className="partner-cancel"><summary>Cancel ride</summary><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const pick=String(f.get('reason')||''),note=String(f.get('note')||'').trim();const reason=pick==='Other'?note:pick;if(reason.length<3){alert(pick==='Other'?'Write a short reason.':'Choose a reason.');return}if(confirm('Cancel this accepted ride? The customer will be notified. You can only cancel before the journey starts.'))t.click(`bookings/${b.id}/status`,{status:'cancelled',reason:reason.slice(0,500)})}}><label>Why do you need to cancel?<select name="reason" required defaultValue=""><option value="" disabled>Choose a reason</option><option>Vehicle or travel issue</option><option>Personal emergency</option><option>Customer not responding</option><option>Other</option></select></label><label>Details (for “Other”)<input name="note" maxLength={500}/></label><p className="helper">The customer will be notified. The ride stays in booking history.</p><button className="subtle" disabled={t.busy}>Confirm cancellation</button></form></details>}
  {after}
 </article>;
}

function StartCode({bookingId,t}:{bookingId:string;t:TripActions}){
 const [at,setAt]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setAt(Date.now()),1000);return()=>clearInterval(timer)},[]);
 const seconds=Math.max(0,Math.ceil(((t.codeExpiresAt||0)-at)/1000));
 async function generate(){try{const r=await t.act(`bookings/${bookingId}/start-code`,{});t.onCode?.(r.code,r.expiresAt)}catch{}}
 return <div className="start-code-control">
  {t.code&&<><strong className="code">{seconds>0?t.code:'Expired'}</strong><small role="status">{seconds>0?`Valid for ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · share on arrival`:'Generate a new code before starting.'}</small></>}
  <button className="primary sm" disabled={t.busy} onClick={generate}><KeyRound size={15}/>{t.code?'Regenerate start code':'Get start code'}</button>
  {t.code&&<small>The previous code stops working when you regenerate.</small>}
 </div>;
}

function retryBooking(booking:any){
 const details=breakdown(booking);
 const fields={
  cityId:booking.city_id,tripType:booking.trip_type,pickup:booking.pickup,destination:booking.destination,
  pickupPoint:JSON.stringify({lat:booking.pickup_lat,lng:booking.pickup_lng}),
  destinationPoint:JSON.stringify({lat:booking.destination_lat,lng:booking.destination_lng}),
  transmission:booking.transmission,vehicleCategory:details.vehicleCategory||'hatchback',
  hours:String(details.hours||''),outstationDirection:details.outstationDirection||'one-way',
  timing:booking.scheduled_at?'schedule':'now',
 };
 try{sessionStorage.setItem(bookingDraftKey,JSON.stringify({savedAt:Date.now(),fields}))}catch{}
 location.assign('/?resume=booking#customer');
}
