'use client';
/**
 * Customer trip extras: live tracking with ETA, driver rating, SOS, online payment,
 * GST invoice view and company billing. Rendered through TripCard slots.
 */
import {useEffect,useState} from 'react';
import {Building2,CreditCard,LocateFixed,MapPin,Phone,Printer,Siren,Star,X} from 'lucide-react';
import {Form} from './primitives';
import {api,errorMessage,fmt,tripTypeName,when} from './client';
import type {TripActions} from './trip-card';
import {sosAvailable,StarPicker} from './partner-trip';

const rateTags=['Smooth driving','On time','Polite','Knew the route','Careful with my car'];

/** Live position + ETA while a trip is assigned, at pickup or on the road. Refreshes every 20 s. */
export function LiveTrack({b}:{b:any}){
 const live=['assigned','arrived','in_progress'].includes(b.status);
 const [info,setInfo]=useState<any>(null);
 useEffect(()=>{if(!live)return;let on=true;const load=()=>{if(document.hidden)return;api(`bookings/${b.id}/location`).then(r=>{if(on)setInfo(r)}).catch(()=>{})};load();const t=setInterval(load,20000);return()=>{on=false;clearInterval(t)}},[b.id,live]);
 if(!live)return null;
 const target=b.status==='in_progress'?'destination':'pickup';
 const eta=info?.etaMinutes;
 return <div className="track-card" aria-live="polite">
  <div className="track-info">
   <span className="track-pulse" aria-hidden="true"/>
   <div className="grow"><strong>{b.status==='arrived'?'Your driver is at the pickup':b.status==='in_progress'?'On the way to your destination':(b.driver_name?b.driver_name.split(' ')[0]+' is on the way':'Driver on the way')}</strong>
    <small>{info?.location?`Updated ${when(info.location.location_at)}${info.distanceKm!=null?` · ${info.distanceKm} km from ${target}`:''}`:'Waiting for the driver’s live location'}</small></div>
   {eta!=null&&b.status!=='arrived'&&<div className="track-eta"><b>{eta}</b><span>min</span></div>}
  </div>
  {info?.location&&<a className="button block" style={{borderRadius:0,border:0,borderTop:'1px solid var(--line)'}} href={`https://www.google.com/maps/search/?api=1&query=${info.location.lat},${info.location.lng}`} target="_blank" rel="noreferrer"><LocateFixed size={15}/>Open live position in Google Maps</a>}
 </div>;
}

export function RateDriver({b,t}:{b:any;t:TripActions}){
 const [stars,setStars]=useState(0),[tags,setTags]=useState<string[]>([]);
 if(b.status!=='completed'||!b.driver_id)return null;
 if(b.my_rating)return <p className="helper rated"><Star size={14}/>You rated this trip {b.my_rating}/5. Thank you.</p>;
 return <div className="rate-box">
  <strong>How was {b.driver_name?b.driver_name.split(' ')[0]:'your driver'}?</strong>
  <StarPicker value={stars} onChange={setStars}/>
  {stars>0&&<>
   <div className="tag-chips">{rateTags.map(x=><button type="button" key={x} className={tags.includes(x)?'on':''} aria-pressed={tags.includes(x)} onClick={()=>setTags(v=>v.includes(x)?v.filter(y=>y!==x):[...v,x].slice(0,5))}>{x}</button>)}</div>
   <Form button="Submit rating" buttonClass="primary sm" onSubmit={f=>t.act(`bookings/${b.id}/rate`,{stars,tags,comment:String(f.get('comment')||'').trim()})}><textarea name="comment" maxLength={500} placeholder={stars<=3?'What went wrong? Our team reviews every low rating.':'Anything else? (optional)'} style={{minHeight:70}}/></Form>
  </>}
 </div>;
}

export function CustomerSos({b,t}:{b:any;t:TripActions}){
 const [result,setResult]=useState<any>(null),[busy,setBusy]=useState(false);
 if(!sosAvailable(b))return null;
 async function raise(){
  if(!confirm('Alert the DRIOZ safety team now? If you are in immediate danger, call 112 first.'))return;
  setBusy(true);
  const point=await new Promise<{lat:number;lng:number}|undefined>(resolve=>{if(!navigator.geolocation){resolve(undefined);return}navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve(undefined),{enableHighAccuracy:true,timeout:6000,maximumAge:30000})});
  try{setResult(await t.act(`bookings/${b.id}/sos`,point?{point}:{}))}catch{}finally{setBusy(false)}
 }
 return result?<div className="sos-result" role="status"><span>Safety team alerted. We’re calling you shortly.</span><a className="call" href={'tel:'+(result.emergencyNumber||'112')}><Phone size={15}/>Call {result.emergencyNumber||'112'}</a></div>
  :<button className="sos" disabled={busy} onClick={raise}><Siren size={15}/>{busy?'Alerting…':'SOS'}</button>;
}

/** Below the action row: online payment, rating and SOS. */
export function CustomerTripAfter({b,t}:{b:any;t:TripActions}){
 const live=['assigned','arrived','in_progress'].includes(b.status);
 return <>
  {(live||sosAvailable(b))&&<div className="actions" style={{marginTop:10}}><CustomerSos b={b} t={t}/></div>}
  {b.status==='completed'&&<div className="actions" style={{marginTop:10}}><a className="button primary" href="/wallet"><CreditCard size={15}/>Pay online or with wallet</a>
   <SavePlace t={t} address={b.pickup} lat={b.pickup_lat} lng={b.pickup_lng} what="pickup"/>{b.trip_type!=='return'&&<SavePlace t={t} address={b.destination} lat={b.destination_lat} lng={b.destination_lng} what="drop"/>}</div>}
  <RateDriver b={b} t={t}/>
 </>;
}

/** Fare statement / GST tax invoice, printable. */
export function InvoiceView({inv,onClose}:{inv:any;onClose:()=>void}){
 const cgst=inv.taxSplit?.cgst,sgst=inv.taxSplit?.sgst,igst=inv.taxSplit?.igst;
 const paid=(inv.payments||[]).reduce((n:number,p:any)=>n+(p.status==='received'?1:-1)*Number(p.amount||0),0);
 return <div className="invoice-overlay" role="dialog" aria-modal="true" aria-label="Invoice" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <article className="invoice">
   <button className="inv-close icon-btn" aria-label="Close" onClick={onClose}><X size={18}/></button>
   <div className="inv-head"><img src="/drioz-logo.png" alt="DRIOZ" height={28}/><span className={'tax-badge'+(inv.taxInvoice?'':' muted')}>{inv.taxInvoice?'TAX INVOICE':'FARE STATEMENT'}</span></div>
   <h2>{inv.taxInvoice?`Invoice ${inv.invoiceNumber}`:inv.invoiceNumber?`Statement ${inv.invoiceNumber}`:'Fare statement'}</h2>
   <div className="inv-meta"><span>Issued <b>{when(inv.issuedAt)}</b></span><span>Trip <b>DR-{String(inv.reference).slice(0,8).toUpperCase()}</b></span><span>Status <b style={{textTransform:'capitalize'}}>{String(inv.status).replace('_',' ')}</b></span></div>
   <div className="inv-parties">
    <div><small>From</small><strong>{inv.seller.legalName}</strong>{inv.seller.address&&<p>{inv.seller.address}</p>}{inv.seller.gstin&&<p>GSTIN {inv.seller.gstin}</p>}{inv.seller.sac&&<p>SAC {inv.seller.sac}</p>}</div>
    <div><small>Billed to</small><strong>{inv.buyer.name}</strong>{inv.buyer.address&&<p>{inv.buyer.address}</p>}{inv.buyer.gstin&&<p>GSTIN {inv.buyer.gstin}</p>}{inv.buyer.email&&<p>{inv.buyer.email}</p>}</div>
   </div>
   <div className="inv-trip"><span>{tripTypeName(inv.tripType)}</span><p>{inv.pickup} → {inv.destination}</p>{inv.startedAt&&<small>{when(inv.startedAt)}{inv.completedAt?` – ${when(inv.completedAt)}`:''}</small>}</div>
   <table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>
    {inv.lines.map((l:any,i:number)=><tr key={i}><td>{l.label}{!l.taxable&&<small style={{display:'block',color:'var(--muted)'}}>Not taxable</small>}</td><td>{fmt(l.amount)}</td></tr>)}
    {cgst!=null?<><tr><td>CGST</td><td>{fmt(cgst)}</td></tr><tr><td>SGST</td><td>{fmt(sgst)}</td></tr></>:igst!=null?<tr><td>IGST</td><td>{fmt(igst)}</td></tr>:inv.tax>0&&<tr><td>Tax</td><td>{fmt(inv.tax)}</td></tr>}
    <tr className="total"><td>Total</td><td>{fmt(inv.total)}</td></tr>
    {paid>0&&<tr><td>Recorded payments</td><td>{fmt(paid)}</td></tr>}
   </tbody></table>
   <p className="inv-note">{inv.note||(inv.taxInvoice?'This is a computer-generated tax invoice.':'This fare statement is not a GST tax invoice.')}</p>
   <div className="inv-actions"><button className="primary" onClick={()=>window.print()}><Printer size={15}/>Print or save as PDF</button><button onClick={onClose}>Close</button></div>
  </article>
 </div>;
}

/** "Bill to" switch shown above the booking form for company members. */
export function BillTo({company,value,onChange}:{company:any;value:'personal'|'company';onChange:(v:'personal'|'company')=>void}){
 if(!company)return null;
 return <div className="bill-to" role="radiogroup" aria-label="Bill this trip to">
  <button type="button" role="radio" aria-checked={value==='personal'} className={value==='personal'?'on':''} onClick={()=>onChange('personal')}>Personal</button>
  <button type="button" role="radio" aria-checked={value==='company'} className={value==='company'?'on':''} onClick={()=>onChange('company')}><Building2 size={14}/>{company.name}</button>
 </div>;
}

export function useInvoice(){
 const [inv,setInv]=useState<any>(null),[error,setError]=useState('');
 return {inv,error,close:()=>setInv(null),open:async(id:string)=>{try{setError('');setInv(await api(`bookings/${id}/invoice`))}catch(e){setError(errorMessage(e))}}};
}

function SavePlace({t,address,lat,lng,what}:{t:TripActions;address:string;lat:number;lng:number;what:string}){
 const [done,setDone]=useState(false);
 if(done||lat==null||lng==null)return null;
 return <button className="sm" disabled={t.busy} onClick={async()=>{const label=(window.prompt(`Name this ${what} (e.g. Home, Work)`,what==='pickup'?'Home':'Work')||'').trim();if(!label)return;try{await t.act('places',{label:label.slice(0,40),address,lat:Number(lat),lng:Number(lng)});setDone(true)}catch{}}}><MapPin size={14}/>Save {what}</button>;
}
