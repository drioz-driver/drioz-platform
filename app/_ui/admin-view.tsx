'use client';
import {useEffect,useState} from 'react';
import {SteeringWheel} from './steering';
import {Activity,ArrowUpRight,Building2,CircleCheck,Download,FileText,Headphones,IndianRupee,MapPinned,Plug,Route,ShieldCheck,Users,Wallet} from 'lucide-react';
import DriverReviewSummary from '../driver-review-summary';
import {Badge,Callout,Empty,Field,Form,Metric} from './primitives';
import {TripCard,type TripActions} from './trip-card';
import {fmt,label,ref,tripTypeName,when} from './client';
import {Analytics,Companies,Incentives,LiveMap,Pricing,ShiftPlans} from './admin-extra';

export default function AdminView({data,me,section,setSection,goSupport,t}:{data:any;me:any;section:string;setSection:(s:string)=>void;goSupport:()=>void;t:(b:any)=>TripActions}){
 const {cities,bookings,documents,drivers,users,tickets,payouts,payments,audit,integrations}=data;const base=t({});
 const dispatch=['admin','operator'].includes(me.role),finance=['admin','finance'].includes(me.role);
 const [city,setCity]=useState('all'),[status,setStatus]=useState('open');
 const pendingDrivers=drivers.filter((d:any)=>d.verification==='pending'),pendingCount=data.pendingDriverReviews??pendingDrivers.length;
 const live=bookings.filter((b:any)=>!['completed','cancelled'].includes(b.status));
 const completedFare=bookings.filter((b:any)=>b.status==='completed').reduce((s:number,b:any)=>s+Number(b.fare||0),0);
 const received=payments.reduce((s:number,p:any)=>s+(p.status==='received'?1:-1)*Number(p.amount||0),0);
 const name=(id:string)=>drivers.find((x:any)=>x.user_id===id)?.name||users?.find((u:any)=>u.id===id)?.name||id.slice(0,12);
 const filtered=bookings.filter((b:any)=>(city==='all'||b.city_id===city)&&(status==='all'||(status==='open'?!['completed','cancelled'].includes(b.status):b.status===status)));
 const addressQueue=(data.locationRequests||[]).filter((r:any)=>r.status==='pending'&&(city==='all'||r.city_id===city));
 return <>
  {section==='overview'&&<>
   {dispatch&&<DriverReviewSummary pending={pendingDrivers} total={pendingCount} onReview={()=>setSection('partners')}/>}
   <div className="metrics">
    <Metric feature icon={Activity} title="Active journeys" value={live.length} note={`${bookings.filter((b:any)=>b.status==='requested').length} awaiting assignment · ${(data.locationRequests||[]).filter((r:any)=>r.status==='pending').length} address reviews`}/>
    <Metric icon={IndianRupee} title="Completed fares" value={fmt(completedFare)} note={`${fmt(received)} reconciled receipts`}/>
    <Metric icon={Users} title="Approved partners" value={drivers.filter((d:any)=>d.verification==='approved').length} note={`${drivers.filter((d:any)=>d.online&&d.verification==='approved').length} online now`}/>
    <Metric icon={Headphones} title="Open tickets" value={tickets.filter((x:any)=>x.status==='open').length} note={<button className="link" onClick={goSupport}>Open support queue →</button>}/>
   </div>
   <div className="two-col">
    <section className="panel"><div className="section-heading"><h2>Service coverage</h2><span>{cities.filter((c:any)=>c.enabled).length} / {cities.length} EXPLICITLY OPEN</span></div><p>Seeded cities open automatically once an approved partner joins, unless paused under Cities.</p>
     <div className="list">{cities.map((c:any)=><div className="list-item" key={c.id}><span className="tile-icon brand"><Building2 size={18}/></span><div className="grow"><strong>{c.name}</strong><small>{c.id.startsWith('region-')?'Registration region':`Base ${fmt(c.base)} · ${drivers.filter((d:any)=>d.city_id===c.id&&d.verification==='approved').length} partners`}</small></div><Badge value={c.enabled?'pilot open':'closed'}/></div>)}</div>
    </section>
    <section className="panel"><div className="section-heading"><h2>Recent journeys</h2>{dispatch&&<button className="sm" onClick={()=>setSection('bookings')}>Dispatch <ArrowUpRight size={14}/></button>}</div>
     {bookings.length?<div className="list">{bookings.slice(0,7).map((b:any)=><div className="list-item" key={b.id}><span className="tile-icon"><Route size={18}/></span><div className="grow"><strong>{b.pickup}</strong><small>DR-{ref(b.id)} · {tripTypeName(b.trip_type)} · {when(b.created_at)}</small></div><Badge value={b.status}/></div>)}</div>:<Empty icon={Route} title="No journeys yet." text="Customer bookings appear here the moment they are requested."/>}
    </section>
   </div>
  </>}

  {section==='bookings'&&dispatch&&<>
   <div className="filter-bar">
    <Field title="City"><select value={city} onChange={e=>setCity(e.target.value)}><option value="all">All cities</option>{cities.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field title="Status"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="open">Open journeys</option><option value="all">All statuses</option>{['requested','assigned','arrived','in_progress','completed','cancelled'].map(s=><option key={s} value={s}>{label(s)}</option>)}</select></Field>
    <p>Latest 100 journeys. Scheduled requests stay in dispatch until assigned.</p>
   </div>
   <LiveDispatch data={data}/>
   {addressQueue.length>0&&<><div className="section-heading"><h2>Address verification</h2><span>{addressQueue.length} PENDING</span></div><div className="trip-grid" style={{marginBottom:28}}>{addressQueue.map((r:any)=><section className="panel" key={r.id}><div className="section-heading"><h2 style={{fontSize:16}}>{r.pickup} → {r.destination}</h2><Badge value="pending"/></div><p>{tripTypeName(r.tripType)}{r.hours?` · ${r.hours} hours`:''} · {fmt(r.fare)} · {base.cityName(r.city_id)}</p>
    <Form button="Verify & send to dispatch" onSubmit={f=>base.act(`location-requests/${r.id}/verify`,{pickupPoint:{lat:Number(f.get('pickupLat')),lng:Number(f.get('pickupLng'))},...(r.tripType!=='return'?{destinationPoint:{lat:Number(f.get('destinationLat')),lng:Number(f.get('destinationLng'))}}:{})})}><div className="fields"><Field title="Pickup latitude"><input name="pickupLat" type="number" step="any" min="-90" max="90" required/></Field><Field title="Pickup longitude"><input name="pickupLng" type="number" step="any" min="-180" max="180" required/></Field>{r.tripType!=='return'&&<><Field title="Drop latitude"><input name="destinationLat" type="number" step="any" min="-90" max="90" required/></Field><Field title="Drop longitude"><input name="destinationLng" type="number" step="any" min="-180" max="180" required/></Field></>}</div></Form>
    <button className="subtle" disabled={base.busy} onClick={()=>base.click(`location-requests/${r.id}/cancel`,{})}>Reject request</button></section>)}</div></>}
   <div className="trip-grid">{filtered.length?filtered.map((b:any)=><TripCard key={b.id} b={b} mode="dispatch" t={t(b)}/>):<Empty icon={Route} title="A clear dispatch queue." text="Journeys matching these filters will appear here."/>}</div>
  </>}

  {section==='partners'&&dispatch&&<div className="trip-grid">{drivers.length?drivers.map((d:any)=>{const docs=documents.filter((doc:any)=>doc.owner_id===d.user_id);return <section className="panel" key={d.user_id}>
   <div className="row" style={{marginBottom:14}}><span className="avatar">{String(d.name||'?').slice(0,2).toUpperCase()}</span><div style={{flex:1,minWidth:0}}><h2 style={{fontSize:17}}>{d.name}</h2><small className="muted">{d.email}</small></div><Badge value={d.verification}/></div>
   <div className="list" style={{marginBottom:12}}>
    <div className="ledger-row"><small>City</small><strong>{base.cityName(d.city_id)}</strong></div>
    <div className="ledger-row"><small>Phone</small><strong>{d.phone}</strong></div>
    <div className="ledger-row"><small>Licence</small><strong>{d.licence} · exp {d.licence_expiry}</strong></div>
    <div className="ledger-row"><small>Evidence approved</small><strong>{['licence','identity','assessment'].filter(k=>docs.some((x:any)=>x.kind===k&&x.status==='approved')).length} / 3</strong></div>
    <div className="ledger-row"><small>Status</small><strong>{d.online?'Online':'Offline'}{d.disabled?' · suspended':''}</strong></div>
   </div>
   <button className="sm ghost" onClick={()=>setSection('documents')}><FileText size={14}/>Review documents</button>
   <Form button="Save decision" onSubmit={f=>base.act(`drivers/${d.user_id}/review`,{status:f.get('status')==='override'?'approved':f.get('status'),note:f.get('note'),...(f.get('status')==='override'?{override:true}:{})})}><Field title="Decision"><select name="status" defaultValue={d.verification}><option value="pending">Pending</option><option value="approved">Approve verified partner</option>{me.role==='admin'&&<option value="override">Force approve without document verification</option>}<option value="rejected">Reject / revoke approval</option></select></Field><Field title="Review note"><textarea name="note" minLength={5} maxLength={500} required defaultValue={d.review_note} placeholder="Reason shared with the partner and recorded in audit history"/></Field></Form>
  </section>}):<Empty icon={Users} title="Your partner network starts here." text="Driver applications appear after onboarding."/>}</div>}

  {section==='documents'&&dispatch&&<section className="panel"><h2>Document review queue</h2><p>Document approval and driver approval are separate. Files marked Approved need no further approval. Open Partners to approve the driver. Admins can record a document-verification override there.</p><button type="button" onClick={()=>setSection('partners')}>Review driver approvals →</button>{documents.length?documents.map((d:any)=><div className="document-row" key={d.id}><div><strong>{name(d.owner_id)}</strong><p>{label(d.kind)} · {Math.round(d.size/1024)} KB · {when(d.created_at)}</p><a href={'/api/ops/documents/'+d.id}><Download size={14}/>Download private file</a></div><Badge value={d.status}/><div className="actions"><button className="primary" disabled={base.busy||d.status==='approved'} onClick={()=>base.click(`documents/${d.id}/review`,{status:'approved'})}>{d.status==='approved'?'Already approved':'Approve document'}</button><button className="subtle" disabled={base.busy||d.status==='rejected'} onClick={()=>base.click(`documents/${d.id}/review`,{status:'rejected'})}>Reject</button></div></div>):<Empty icon={FileText} title="No documents awaiting review." text="Partner uploads appear here."/>}</section>}

  {section==='map'&&dispatch&&<LiveMap data={data}/>}
  {section==='analytics'&&<Analytics canKyc={dispatch} act={base.act}/>}
  {section==='pricing'&&me.role==='admin'&&<Pricing data={data} act={base.act}/>}
  {section==='companies'&&me.role==='admin'&&<Companies data={data} act={base.act}/>}
  {section==='incentives'&&(me.role==='admin'||me.role==='finance')&&<Incentives data={data} act={base.act} role={me.role}/>}
  {section==='partners'&&dispatch&&<ShiftPlans plans={data.shiftPlans||[]} cityName={base.cityName}/>}
  {section==='cities'&&me.role==='admin'&&<div className="trip-grid">
   <section className="panel"><span className="tile-icon brand" style={{marginBottom:14}}><MapPinned size={18}/></span><h2>Add a region</h2><p>New regions accept partner registration. Customer pricing in other currencies still requires rate support.</p><Form button="Add region" reset onSubmit={f=>base.act('regions',{name:f.get('name'),center:{lat:Number(f.get('lat')),lng:Number(f.get('lng'))},radiusKm:Number(f.get('radius'))})}><Field title="City and country"><input name="name" minLength={3} maxLength={120} required placeholder="Chennai, India"/></Field><div className="fields"><Field title="Centre latitude"><input name="lat" type="number" step="any" min="-90" max="90" required/></Field><Field title="Centre longitude"><input name="lng" type="number" step="any" min="-180" max="180" required/></Field></div><Field title="Radius · km"><input name="radius" type="number" min="0.1" max="300" step="any" defaultValue={30} required/></Field></Form></section>
   {cities.filter((c:any)=>!c.id.startsWith('region-')).map((c:any)=><CityCard key={c.id} city={c} save={payload=>base.act('cities',payload)}/>)}
   {cities.filter((c:any)=>c.id.startsWith('region-')).map((c:any)=><section className="panel" key={c.id}><h2>{c.name}</h2><p>Registration region · local pricing not yet configured.</p></section>)}
  </div>}

  {section==='team'&&me.role==='admin'&&<section className="panel"><h2>People & permissions</h2><p>Accounts appear after their first sign-in. Staff roles are assigned here and never by self sign-up.</p>{users.map((u:any)=><div className="team-row" key={u.id}><div className="row"><span className="avatar">{String(u.name||'?').slice(0,2).toUpperCase()}</span><div><strong>{u.name}</strong><p>{u.email} · joined {when(u.created_at)}</p></div></div>{u.id===me.id?<Badge value="owner" tone="good"/>:<Form button="Update" buttonClass="sm" onSubmit={f=>base.act('staff',{id:u.id,role:f.get('role'),disabled:f.get('disabled')==='on'})}><select name="role" defaultValue={u.role} aria-label="Role">{['customer','driver','operator','support','finance'].map(r=><option key={r} value={r}>{label(r)}</option>)}</select><label className="check"><input type="checkbox" name="disabled" defaultChecked={!!u.disabled}/>Suspend</label></Form>}</div>)}</section>}

  {section==='finance'&&finance&&<>
   <div className="metrics three"><Metric feature icon={Wallet} title="Net receipts" value={fmt(received)} note="Recorded manually"/><Metric icon={IndianRupee} title="Payouts pending" value={fmt(payouts.filter((p:any)=>p.status==='pending').reduce((s:number,p:any)=>s+Number(p.amount),0))} note={`${payouts.filter((p:any)=>p.status==='pending').length} partners`}/><Metric icon={CircleCheck} title="Payouts sent" value={fmt(payouts.filter((p:any)=>p.status==='paid').reduce((s:number,p:any)=>s+Number(p.amount),0))}/></div>
   <div className="two-col"><section className="panel"><h2>Receipts & refunds</h2><Callout tone="info">Record money already received or refunded outside the app. This form does not move money.</Callout><Form reset button="Record transaction" onSubmit={f=>base.act('payments',{bookingId:f.get('bookingId'),amount:Math.round(Number(f.get('amount'))*100),method:f.get('method'),reference:f.get('reference'),status:f.get('status')})}><Field title="Completed trip"><select name="bookingId" required defaultValue=""><option value="" disabled>Choose trip</option>{bookings.filter((b:any)=>b.status==='completed').map((b:any)=><option key={b.id} value={b.id}>DR-{ref(b.id)} · {fmt(b.fare)} · {b.customer_name}</option>)}</select></Field><div className="fields"><Field title="Amount · INR"><input type="number" step=".01" min=".01" name="amount" required/></Field><Field title="Type"><select name="status"><option value="received">Receipt</option><option value="refunded">Refund</option></select></Field></div><Field title="Method"><select name="method"><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option></select></Field><Field title="Unique transaction reference"><input name="reference" minLength={5} maxLength={100} required/></Field></Form>
    <h3>Ledger</h3>{payments.length?payments.map((p:any)=><div className="ledger-row" key={p.id}><span><strong>{p.reference}</strong><small>{label(p.method)} · {when(p.created_at)}</small></span><strong>{fmt(p.amount)}</strong><Badge value={p.status}/></div>):<p className="helper">No transactions recorded.</p>}</section>
   <section className="panel"><h2>Partner payouts</h2><p>Mark a payout only after sending the money and reconciling the customer receipt.</p>{payouts.length?payouts.map((p:any)=><div key={p.id} style={{borderBottom:'1px solid var(--line)',paddingBottom:6}}><div className="ledger-row" style={{borderBottom:0}}><span><strong>{name(p.driver_id)}</strong><small>Trip DR-{ref(p.booking_id)}</small></span><strong>{fmt(p.amount)}</strong><Badge value={p.status}/></div>{p.wallet_managed&&<p className="helper">Managed in the driver wallet — the partner withdraws it from Bank & transfers. Do not send a separate manual payout.</p>}{p.status==='pending'&&!p.wallet_managed&&<Form button="Record payout sent" buttonClass="sm" onSubmit={f=>base.act('payouts',{id:p.id,reference:f.get('reference')})}><Field title="Transfer reference"><input name="reference" minLength={5} maxLength={100} required/></Field></Form>}</div>):<Empty icon={Wallet} title="No payouts due yet." text="Completed trips create partner earnings entries."/>}</section></div>
  </>}

  {section==='audit'&&me.role==='admin'&&<section className="panel"><h2>Activity & audit history</h2><p>The latest 100 recorded actions across the platform.</p><div className="list">{audit.map((r:any)=><div className="list-item" key={r.id}><span className="tile-icon"><ShieldCheck size={17}/></span><div className="grow"><strong style={{textTransform:'capitalize'}}>{label(r.action)}</strong><small>{name(r.actor_id)} · target {r.target.slice(0,12)}</small></div><small className="muted">{when(r.created_at)}</small></div>)}</div></section>}

  {section==='integrations'&&me.role==='admin'&&<section className="panel"><h2>Integrations</h2><p>Provider status for this deployment. Credentials are configured as runtime secrets, never in source.</p><div className="list">{Object.entries(integrations).map(([k,v])=><div className="list-item" key={k}><span className="tile-icon brand"><Plug size={17}/></span><div className="grow"><strong style={{textTransform:'capitalize'}}>{label(k.replace(/([A-Z])/g,' $1'))}</strong><small>{String(v)}</small></div></div>)}</div><Callout>No SMS, payment, refund or emergency request is sent to an external provider by this pilot.</Callout></section>}
 </>;
}

function CityCard({city,save}:{city:any;save:(p:any)=>Promise<unknown>}){
 let zone:any;try{zone=JSON.parse(city.zones)[0]}catch{}
 let card:any={};try{card=JSON.parse(city.pricing||'{}')}catch{}
 const packages=Object.entries(card.packages||{}).map(([h,p])=>`${h}:${Number(p)/100}`).join(', ');
 // "2:269, 4:440" → {"2":26900,"4":44000}
 const parsePackages=(text:string)=>Object.fromEntries(text.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const [h,p]=x.split(':').map(v=>v.trim());return [String(Number(h)),Math.round(Number(p)*100)]}).filter(([h,p])=>Number(h)>0&&Number(p)>0));
 return <section className="panel"><div className="section-heading"><h2>{city.name}</h2><Badge value={city.enabled?'pilot open':'closed'}/></div>
  <Form button="Save configuration" onSubmit={f=>save({id:city.id,enabled:f.get('enabled')==='on',base:Math.round(Number(f.get('base'))*100),hourly:Math.round(Number(f.get('hourly'))*100),night:Math.round(Number(f.get('night'))*100),taxBps:Math.round(Number(f.get('tax'))*100),commissionBps:Math.round(Number(f.get('commission'))*100),cancellation:Math.round(Number(f.get('cancellation')||0)*100),pricing:{oneWayCharge:Math.round(Number(f.get('oneWayCharge')||0)*100),perMinute:Math.round(Number(f.get('perMinute')||0)*100),perKm:Math.round(Number(f.get('perKm')||0)*100),includedMinutes:Math.round(Number(f.get('includedMinutes')||60)),packages:parsePackages(String(f.get('packages')||''))},zones:f.get('lat')!==''&&f.get('lng')!==''?[{lat:Number(f.get('lat')),lng:Number(f.get('lng')),radiusKm:Number(f.get('radius'))}]:[]})}>
   <div className="fields"><Field title="Base fare · ₹" hint="First hour of a one-way trip"><input name="base" type="number" step=".01" min="0" defaultValue={city.base/100} required/></Field><Field title="Outstation extra hour · ₹"><input name="hourly" type="number" step=".01" min="0" defaultValue={city.hourly/100} required/></Field><Field title="Night surcharge · ₹"><input name="night" type="number" step=".01" min="0" defaultValue={city.night/100} required/></Field><Field title="Tax · %"><input name="tax" type="number" step=".01" min="0" max="100" defaultValue={city.tax_bps/100} required/></Field></div>
   <div className="fields"><Field title="Platform commission · %"><input name="commission" type="number" step=".01" min="0" max="100" defaultValue={city.commission_bps/100} required/></Field><Field title="Late cancellation fee · ₹" hint="Charged after the 5-minute free window"><input name="cancellation" type="number" step="1" min="0" max="10000" defaultValue={Number(city.cancellation||0)/100}/></Field></div>
   <h3>Time &amp; distance rates</h3><p className="helper" style={{marginBottom:12}}>Leave per-minute at 0 and packages empty to keep the old flat pricing.</p>
   <div className="fields"><Field title="One-way charge · ₹"><input name="oneWayCharge" type="number" step=".01" min="0" defaultValue={Number(card.oneWayCharge||0)/100}/></Field><Field title="Extra minute · ₹"><input name="perMinute" type="number" step=".01" min="0" defaultValue={Number(card.perMinute||0)/100}/></Field><Field title="Extra km · ₹"><input name="perKm" type="number" step=".01" min="0" defaultValue={Number(card.perKm||0)/100}/></Field><Field title="Included minutes"><input name="includedMinutes" type="number" step="1" min="15" max="240" defaultValue={card.includedMinutes||60}/></Field></div>
   <Field title="Hourly packages · hours:₹" hint="For example 2:269, 4:440, 6:629, 8:800, 12:1115"><input name="packages" defaultValue={packages} placeholder="2:269, 4:440, 6:629, 8:800, 12:1115"/></Field>
   <h3>Service area</h3><p className="helper" style={{marginBottom:12}}>Pickup and destination must fall inside this circle.</p>
   <div className="fields"><Field title="Centre latitude"><input name="lat" type="number" step="any" min="-90" max="90" defaultValue={zone?.lat??''}/></Field><Field title="Centre longitude"><input name="lng" type="number" step="any" min="-180" max="180" defaultValue={zone?.lng??''}/></Field></div>
   <Field title="Radius · km"><input name="radius" type="number" min=".1" max="300" step=".1" defaultValue={zone?.radiusKm??30}/></Field>
   <label className="check"><input name="enabled" type="checkbox" defaultChecked={!!city.enabled}/>Accept bookings in this city</label>
   <p className="helper">Night window 10 PM – 6 AM IST. Changes apply to new quotes only.</p>
  </Form></section>;
}

/** Live ride-offer pipeline: which partner is holding each waiting ride, and for how long. */
function LiveDispatch({data}:{data:any}){
 const [,tick]=useState(0);useEffect(()=>{const t=setInterval(()=>tick(n=>n+1),1000);return()=>clearInterval(t)},[]);
 const skew=(data.serverTime||Date.now())-Date.now();const offers:any[]=data.offers||[];
 const waiting=data.bookings.filter((b:any)=>b.status==='requested'&&(!b.scheduled_at||b.scheduled_at<=Date.now()+1800000));
 return <section className="panel" style={{marginBottom:24}}>
  <div className="section-heading"><div><span className="eyebrow">Live dispatch</span><h2>Ride offers in progress</h2></div><span>{waiting.length} WAITING</span></div>
  <p>Each ride is offered to one partner at a time for {data.offerSeconds||30} seconds. Passed or missed rides move to the next nearest partner; when everyone has had a chance a new round starts.</p>
  {waiting.length?<div className="stack">{waiting.map((b:any)=>{const live=offers.find(o=>o.booking_id===b.id&&o.status==='offered');const left=live?Math.max(0,Math.ceil((live.expires_at-(Date.now()+skew))/1000)):0;const tried=offers.filter(o=>o.booking_id===b.id);
   return <div key={b.id} className="list-item" style={{flexWrap:'wrap'}}><SteeringWheel size={34} className={live?'steer':''} rim="var(--ink)" hub="var(--surface)"/><div className="grow"><strong>{b.pickup}</strong><small>DR-{ref(b.id)} · {fmt(b.fare)} · {tried.length?tried.slice(0,5).map(o=>`${o.driver_name} (${o.status})`).join(' · '):'not offered yet'}</small></div>
    {live?<div className="live-offer">Offered to <strong>{live.driver_name}</strong> · round {live.round}<b className={left<=8?'urgent':''}>{left}s</b></div>:<Badge value="waiting for a free partner" tone="warn"/>}</div>})}</div>
  :<p className="helper">No rides waiting — every request has a partner.</p>}
 </section>;
}
