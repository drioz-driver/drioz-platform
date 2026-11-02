'use client';
/**
 * Partner-portal trip controls: mandatory before/after car inspections,
 * completion extras, quick messages to the customer, SOS and customer rating.
 * Rendered through TripCard's `actions` slot in partner mode.
 */
import {useEffect,useRef,useState} from 'react';
import {Camera,ClipboardCheck,Flag,MessageSquare,Navigation,Phone,Siren,Star,X} from 'lucide-react';
import {localPricing,localMoney} from '@/lib/local-money';
import {Callout,Field,Form,Modal} from './primitives';
import {errorMessage,fmt} from './client';
import type {TripActions} from './trip-card';

export const checklistItems=[
 ['exterior','Exterior body & glass'],
 ['interior','Interior & seats'],
 ['tyres','Tyres'],
 ['lights','Lights & indicators'],
 ['dashboard_warnings','Dashboard warning lights'],
 ['documents','RC, insurance & PUC in car'],
] as const;
const fuelLevels=[0,25,50,75,100];
const MAX_PHOTOS=6;
const photoHints=['Front','Back','Left side','Right side','Dashboard','Interior'];
export const quickTemplates=[
 ['on_way','On my way'],
 ['late5','5 min late'],
 ['late10','10 min late'],
 ['arrived_gate','At the gate'],
 ['cant_find','Can’t find the car'],
] as const;

function breakdownOf(b:any){try{return JSON.parse(b.breakdown||'{}')}catch{return {}}}

/** Downscale a camera photo to ≤1280 px JPEG (~250 KB) so six photos fit the 4 MB upload limit. */
async function shrink(file:File):Promise<File>{
 try{
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob:Blob|null=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.68));
  if(!blob)return file;
  return new File([blob],file.name.replace(/\.\w+$/,'')+'.jpg',{type:'image/jpeg'});
 }catch{return file}
}

export function InspectionModal({b,phase,t,onClose}:{b:any;phase:'pre'|'post';t:TripActions;onClose:()=>void}){
 const [items,setItems]=useState<Record<string,'ok'|'issue'|undefined>>({});
 const [fuel,setFuel]=useState<number|null>(null);
 const [odometer,setOdometer]=useState('');
 const [notes,setNotes]=useState('');
 const [photos,setPhotos]=useState<{file:File;url:string}[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>()=>photos.forEach(p=>URL.revokeObjectURL(p.url)),[photos]);
 const hasIssue=Object.values(items).includes('issue');
 const complete=checklistItems.every(([k])=>items[k]);
 async function addPhotos(list:FileList|null){
  if(!list)return;
  const room=MAX_PHOTOS-photos.length;
  const picked=Array.from(list).filter(f=>/^image\/(jpeg|png)$/.test(f.type)).slice(0,room);
  const next:{file:File;url:string}[]=[];
  for(const f of picked){const small=await shrink(f);if(small.size>1.5*1024*1024){setError('A photo is too large. Try another photo.');continue}next.push({file:small,url:URL.createObjectURL(small)})}
  setPhotos(p=>[...p,...next]);
  if(input.current)input.current.value='';
 }
 async function submit(){
  setError('');
  if(!complete){setError('Mark every checklist item as OK or Issue.');return}
  if(hasIssue&&notes.trim().length<5){setError('Describe the issue you found (at least 5 characters).');return}
  const form=new FormData();
  form.set('phase',phase);
  form.set('checklist',JSON.stringify({items,...(fuel!=null?{fuelPercent:fuel}:{}),...(odometer?{odometerKm:Math.round(Number(odometer))}:{})}));
  form.set('notes',notes.trim());
  if(photos.reduce((n,p)=>n+p.file.size,0)>4*1024*1024){setError('Photos are too large together. Remove one and try again.');return}
  photos.forEach(p=>form.append('photos',p.file));
  setBusy(true);
  try{await t.act(`bookings/${b.id}/inspection`,form);onClose()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 return <Modal title={phase==='pre'?'Before-trip car check':'After-trip car check'} onClose={onClose}>
  <h2>{phase==='pre'?'Before-trip car check':'After-trip car check'}</h2>
  <p>{phase==='pre'?'Check the customer’s car with them before you drive. This protects you and the customer if there is a damage dispute.':'Check the car again before you hand it back. Note anything that changed during the trip.'}</p>
  <div className="inspect-list">
   {checklistItems.map(([k,name])=><div className="inspect-row" key={k}>
    <span>{name}</span>
    <div className="seg" role="radiogroup" aria-label={name}>
     <button type="button" role="radio" aria-checked={items[k]==='ok'} className={items[k]==='ok'?'on ok':''} onClick={()=>setItems(x=>({...x,[k]:'ok'}))}>OK</button>
     <button type="button" role="radio" aria-checked={items[k]==='issue'} className={items[k]==='issue'?'on issue':''} onClick={()=>setItems(x=>({...x,[k]:'issue'}))}>Issue</button>
    </div>
   </div>)}
  </div>
  <div className="field"><span>Fuel level</span><div className="chip-row">{fuelLevels.map(f=><button type="button" key={f} className={'chip'+(fuel===f?' on':'')} aria-pressed={fuel===f} onClick={()=>setFuel(f)}>{f}%</button>)}</div></div>
  <Field title="Odometer (km) · optional"><input type="number" inputMode="numeric" min={0} max={2000000} value={odometer} onChange={e=>setOdometer(e.target.value)}/></Field>
  <Field title={hasIssue?'Notes · required for issues':'Notes · optional'}><textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000} placeholder={hasIssue?'e.g. Scratch on rear bumper, left side':'Anything worth recording'}/></Field>
  <div className="field"><span>Photos · {photos.length}/{MAX_PHOTOS}</span>
   <p className="helper" style={{margin:'0 0 8px'}}>Suggested: {photoHints.join(', ')}.</p>
   <div className="photo-grid">
    {photos.map((p,i)=><figure key={p.url}><img src={p.url} alt={`Inspection photo ${i+1}`}/><figcaption>{photoHints[i]||`Photo ${i+1}`}</figcaption><button type="button" aria-label="Remove photo" onClick={()=>setPhotos(x=>x.filter(y=>y!==p))}><X size={14}/></button></figure>)}
    {photos.length<MAX_PHOTOS&&<label className="photo-add"><Camera size={22}/><span>Add photo</span><input ref={input} type="file" accept="image/jpeg,image/png" capture="environment" multiple onChange={e=>addPhotos(e.target.files)}/></label>}
   </div>
  </div>
  {error&&<p className="form-message err" role="alert">{error}</p>}
  <button className="primary block" disabled={busy} onClick={submit}><ClipboardCheck size={16}/>{busy?'Saving check…':'Save car check'}</button>
 </Modal>;
}

export function CompleteModal({b,t,onClose}:{b:any;t:TripActions;onClose:()=>void}){
 const info=breakdownOf(b);
 const hourly=['return','outstation','hourly'].includes(b.trip_type)&&info.hours;
 return <Modal title="Complete journey" onClose={onClose}>
  <h2>Complete journey</h2>
  <p>Confirm only once the trip has ended. Extra hours beyond the package are charged to the customer; tolls and parking you paid are reimbursed in full.</p>
  <Form button={<><Flag size={16}/>Complete journey</>} onSubmit={async f=>{
   const rupees=(k:string)=>Math.max(0,Math.round(Number(f.get(k)||0)*100*(localPricing(b.breakdown)?.inrPerUnit||1)));
   const payload:any={status:'completed',tolls:rupees('tolls'),parking:rupees('parking')};
   if(hourly)payload.actualHours=Number(f.get('actualHours'));
   const r=await t.act(`bookings/${b.id}/status`,payload);onClose();return r;
  }}>
   {hourly&&<Field title={`Hours used · package ${info.hours} h`} hint="Rounded up per extra hour beyond the package."><input name="actualHours" type="number" step="0.25" min={0} max={200} defaultValue={info.hours} required/></Field>}
   <div className="fields">
    <Field title={'Tolls paid · '+(localPricing(b.breakdown)?.currency||'INR')}><input name="tolls" type="number" step="1" min={0} max={5000} defaultValue={0}/></Field>
    <Field title={'Parking paid · '+(localPricing(b.breakdown)?.currency||'INR')}><input name="parking" type="number" step="1" min={0} max={5000} defaultValue={0}/></Field>
   </div>
  </Form>
 </Modal>;
}

export function QuickMessages({b,t}:{b:any;t:TripActions}){
 return <div className="quick-msgs" aria-label="Quick updates to the customer">
  <small><MessageSquare size={13}/> Update the customer</small>
  <div className="chip-row">{quickTemplates.map(([k,text])=><button key={k} type="button" className="chip" disabled={t.busy} onClick={()=>t.click(`bookings/${b.id}/message`,{template:k})}>{text}</button>)}</div>
 </div>;
}

export function sosAvailable(b:any){
 if(['assigned','arrived','in_progress'].includes(b.status))return true;
 return b.status==='completed'&&Date.now()-Number(b.completed_at||b.updated_at)<6*3600000;
}

export function SosButton({b,t}:{b:any;t:TripActions}){
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false);
 async function raise(){
  if(!confirm('Send an SOS to the DRIOZ safety team? If you are in immediate danger, call 112 first.'))return;
  setBusy(true);
  const point=await new Promise<{lat:number;lng:number}|undefined>(resolve=>{
   if(!navigator.geolocation){resolve(undefined);return}
   navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve(undefined),{enableHighAccuracy:true,timeout:6000,maximumAge:30000});
  });
  try{await t.act(`bookings/${b.id}/sos`,point?{point}:{});setSent(true)}catch{}finally{setBusy(false)}
 }
 return sent
  ?<a className="button sos-call" href="tel:112"><Phone size={15}/>Call 112</a>
  :<button className="sos" disabled={busy} onClick={raise}><Siren size={15}/>{busy?'Sending SOS…':'SOS'}</button>;
}

export function StarPicker({value,onChange}:{value:number;onChange:(n:number)=>void}){
 return <div className="stars" role="radiogroup" aria-label="Rating">{[1,2,3,4,5].map(n=><button type="button" key={n} role="radio" aria-checked={value===n} aria-label={`${n} star${n>1?'s':''}`} className={n<=value?'on':''} onClick={()=>onChange(n)}><Star size={22}/></button>)}</div>;
}

export function RateCustomer({b,t}:{b:any;t:TripActions}){
 const [stars,setStars]=useState(0);
 if(b.my_rating)return <p className="helper rated"><Star size={13}/> You rated this customer {b.my_rating}★</p>;
 return <div className="rate-box">
  <strong>How was {b.customer_name?b.customer_name.split(' ')[0]:'the customer'}?</strong>
  <StarPicker value={stars} onChange={setStars}/>
  {stars>0&&<Form button="Submit rating" buttonClass="primary sm" onSubmit={f=>t.act(`bookings/${b.id}/rate`,{stars,comment:String(f.get('comment')||'').trim()})}><textarea name="comment" maxLength={500} placeholder="Optional comment (only visible to DRIOZ)" style={{minHeight:70}}/></Form>}
 </div>;
}

/** Full partner action area for a trip card (TripCard `actions` slot). */
export function PartnerTripActions({b,t}:{b:any;t:TripActions}){
 const [check,setCheck]=useState<'pre'|'post'|null>(null);
 const [completing,setCompleting]=useState(false);
 const phases=String(b.inspections||'');
 const hasPre=phases.includes('pre'),hasPost=phases.includes('post');
 const live=['assigned','arrived','in_progress'].includes(b.status);
 return <div className="partner-actions">
  {b.status==='assigned'&&<div className="actions">
   <button disabled={t.busy} className="primary" onClick={()=>t.click(`bookings/${b.id}/status`,{status:'arrived'})}>Confirm arrival</button>
   {!hasPre&&<button disabled={t.busy} onClick={()=>setCheck('pre')}><ClipboardCheck size={15}/>Before-trip car check</button>}
  </div>}
  {b.status==='arrived'&&(hasPre
   ?<Form onSubmit={f=>t.act(`bookings/${b.id}/status`,{status:'in_progress',code:f.get('code')})} button="Start journey"><Field title="Customer’s six-digit code"><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="••••••" style={{letterSpacing:'.4em',fontSize:20,textAlign:'center'}}/></Field></Form>
   :<div className="step-required"><Callout tone="info" icon={ClipboardCheck}>Step 1 of 2: record the before-trip car check with the customer. Then enter their start code.</Callout><button className="primary block" onClick={()=>setCheck('pre')}><ClipboardCheck size={16}/>Before-trip car check</button></div>)}
  {b.status==='in_progress'&&(hasPost
   ?<button className="primary block" disabled={t.busy} onClick={()=>setCompleting(true)}><Flag size={16}/>Complete journey</button>
   :<div className="step-required"><Callout tone="info" icon={ClipboardCheck}>Before completing, record the after-trip car check.</Callout><button className="primary block" onClick={()=>setCheck('post')}><ClipboardCheck size={16}/>After-trip car check</button></div>)}
  {['assigned','arrived'].includes(b.status)&&<QuickMessages b={b} t={t}/>}
  {(live||sosAvailable(b))&&<div className="actions">
   {live&&<a className="button" href={`https://www.google.com/maps/dir/?api=1&destination=${b.status==='in_progress'?`${b.destination_lat},${b.destination_lng}`:`${b.pickup_lat},${b.pickup_lng}`}`} target="_blank" rel="noreferrer"><Navigation size={15}/>{b.status==='in_progress'?'Navigate to destination':'Navigate to pickup'}</a>}
   {sosAvailable(b)&&<SosButton b={b} t={t}/>}
  </div>}
  {b.status==='completed'&&<><RateCustomer b={b} t={t}/>{Number(b.paid_amount)<Number(b.fare)&&(()=>{try{return JSON.parse(b.payment_choice||'{}').method==='cash'}catch{return false}})()&&<button className="primary block" disabled={t.busy} onClick={()=>{if(confirm('Confirm cash received in full: '+localMoney(Number(b.fare)-Number(b.paid_amount||0),b.breakdown)+'?'))t.click(`bookings/${b.id}/cash-received`,{})}}>Received cash</button>}</>}
  {b.status==='cancelled'&&b.cancellation_fee>0&&<p className="helper">Cancellation fee charged to the customer: {fmt(b.cancellation_fee)}. Your share is added to payouts.</p>}
  {check&&<InspectionModal b={b} phase={check} t={t} onClose={()=>setCheck(null)}/>}
  {completing&&<CompleteModal b={b} t={t} onClose={()=>setCompleting(false)}/>}
 </div>;
}
