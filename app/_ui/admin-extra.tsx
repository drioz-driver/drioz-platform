'use client';
/**
 * Operations sections added in v5: live map, analytics, pricing (busy-time surge),
 * corporate accounts, partner incentives and today's shift plans.
 */
import {useEffect,useMemo,useRef,useState} from 'react';
import {Activity,BadgeCheck,Building2,CalendarClock,Clock3,Gauge,IndianRupee,MapPinned,Percent,ShieldAlert,Star,Trash2,TrendingUp,Users} from 'lucide-react';
import {maps} from '../maps-address';
import {Badge,Empty,Field,Form,Metric} from './primitives';
import {api,errorMessage,fmt,when} from './client';

type Act=(path:string,payload:unknown)=>Promise<any>;
const dayBits=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const hhmm=(m:number)=>`${String(Math.floor(Number(m)/60)).padStart(2,'0')}:${String(Number(m)%60).padStart(2,'0')}`;
const pct=(v:number|null|undefined)=>v==null?'—':Math.round(v*100)+'%';
const mins=(ms:number|null|undefined)=>ms==null?'—':ms<60000?Math.round(ms/1000)+' s':Math.round(ms/60000)+' min';

/** Online partners and live trips on one map. */
export function LiveMap({data}:{data:any}){
 const el=useRef<HTMLDivElement>(null);const [failed,setFailed]=useState(false);
 const fresh=(d:any)=>d.lat!=null&&d.lng!=null&&Number(d.location_at)>Date.now()-10*60000;
 const drivers=(data.drivers||[]).filter((d:any)=>d.verification==='approved'&&fresh(d));
 const busy=new Set((data.bookings||[]).filter((b:any)=>['assigned','arrived','in_progress'].includes(b.status)).map((b:any)=>b.driver_id));
 const waiting=(data.bookings||[]).filter((b:any)=>b.status==='requested');
 const key=drivers.map((d:any)=>d.user_id+d.location_at).join()+waiting.map((b:any)=>b.id).join();
 useEffect(()=>{let on=true;maps().then(g=>{if(!on||!el.current)return;
  const points=[...drivers.map((d:any)=>({lat:Number(d.lat),lng:Number(d.lng)})),...waiting.map((b:any)=>({lat:Number(b.pickup_lat),lng:Number(b.pickup_lng)}))];
  const map=new g.Map(el.current,{center:points[0]||{lat:17.385,lng:78.4867},zoom:11,disableDefaultUI:true,zoomControl:true});
  const bounds=new g.LatLngBounds();
  for(const d of drivers){const position={lat:Number(d.lat),lng:Number(d.lng)};bounds.extend(position);new g.Marker({map,position,title:`${d.name} · ${busy.has(d.user_id)?'on a trip':d.online?'online':'offline'}`,label:{text:'●',color:busy.has(d.user_id)?'#2563eb':d.online?'#00c784':'#93a19b'}})}
  for(const b of waiting){const position={lat:Number(b.pickup_lat),lng:Number(b.pickup_lng)};bounds.extend(position);new g.Marker({map,position,title:`Waiting: ${b.pickup}`,label:{text:'P',color:'#fff'}})}
  if(points.length>1)map.fitBounds(bounds,48);
 }).catch(()=>{if(on)setFailed(true)});return()=>{on=false}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key]);
 return <section className="panel">
  <div className="section-heading"><h2><MapPinned size={18} style={{verticalAlign:-3}}/> Live map</h2><span>{drivers.length} PARTNERS · {waiting.length} WAITING</span></div>
  {failed?<Empty icon={MapPinned} title="Map unavailable." text="Set GOOGLE_MAPS_BROWSER_KEY to show partners and waiting pickups on a live map."/>:<div ref={el} className="map-frame" style={{height:460}} aria-label="Live map of partners and waiting pickups"/>}
  <div className="map-legend"><span><i style={{background:'#00c784'}}/>Online</span><span><i style={{background:'#2563eb'}}/>On a trip</span><span><i style={{background:'#93a19b'}}/>Offline</span><span><i style={{background:'var(--ink)'}}/>Waiting pickup</span></div>
  <p className="helper">Partner positions older than 10 minutes are hidden. Positions are shared only by partners who opted in.</p>
 </section>;
}

export function Analytics({canKyc,act}:{canKyc:boolean;act:Act}){
 const [a,setA]=useState<any>(null),[error,setError]=useState('');
 const load=()=>api('analytics').then(setA).catch(e=>setError(errorMessage(e)));
 useEffect(()=>{load()},[]);
 if(error)return <Empty icon={Activity} title="Analytics unavailable." text={error}/>;
 if(!a)return <div className="panel"><p className="helper">Loading analytics…</p></div>;
 const max=Math.max(1,...a.daily.map((d:any)=>d.bookings));
 return <>
  <div className="metrics">
   <Metric feature icon={IndianRupee} title="Revenue · 14 days" value={fmt(a.daily.reduce((n:number,d:any)=>n+d.revenue,0))} note={`${a.daily.reduce((n:number,d:any)=>n+d.completed,0)} completed trips`}/>
   <Metric icon={BadgeCheck} title="Offer acceptance" value={pct(a.offers.acceptanceRate)} note={`${a.offers.accepted}/${a.offers.total} offers · avg ${mins(a.offers.avgAcceptMs)} to accept`}/>
   <Metric icon={Clock3} title="Time to assign" value={mins(a.avgAssignMs)} note="Booking to driver assigned · 30 days"/>
   <Metric icon={Star} title="Customer rating" value={a.rating.avg?Number(a.rating.avg).toFixed(2):'—'} note={`${a.rating.n} ratings · cancellations ${pct(a.totals.cancellationRate)}`}/>
  </div>
  <div className="two-col">
   <section className="panel"><div className="section-heading"><h2><TrendingUp size={18} style={{verticalAlign:-3}}/> Bookings per day</h2><span>LAST 14 DAYS · IST</span></div>
    <div className="bar-chart" role="img" aria-label="Bookings per day for the last 14 days">{a.daily.map((d:any)=><div key={d.day} className="bar" title={`${d.day}: ${d.bookings} bookings, ${d.completed} completed, ${fmt(d.revenue)}`}>
     <span className="bar-fill" style={{height:Math.max(2,d.bookings/max*100)+'%'}}><i style={{height:d.bookings?d.completed/d.bookings*100+'%':0}}/></span><small>{d.day.slice(8)}</small></div>)}</div>
    <div className="map-legend"><span><i style={{background:'var(--line-strong)'}}/>Booked</span><span><i style={{background:'var(--brand)'}}/>Completed</span></div>
   </section>
   <section className="panel"><div className="section-heading"><h2>Revenue by city</h2><span>30 DAYS</span></div>
    {a.byCity.length?a.byCity.map((c:any)=><div className="ledger-row" key={c.city_id}><span><strong>{c.name}</strong><small>{c.trips} completed trips</small></span><strong>{fmt(c.revenue)}</strong></div>):<p className="helper">No completed trips in the last 30 days.</p>}
    <div className="ledger-row"><span><strong>Offers</strong><small>{a.offers.declined} passed · {a.offers.expired} expired</small></span><strong>{a.offers.total}</strong></div>
   </section>
  </div>
  <section className="panel" style={{marginTop:20}}><div className="section-heading"><h2><ShieldAlert size={18} style={{verticalAlign:-3}}/> Partner health</h2><span>{a.partnerHealth.filter((p:any)=>p.flags.length).length} FLAGGED</span></div>
   <div className="table-wrap"><table className="data"><thead><tr><th>Partner</th><th>Offers · 30 d</th><th>Missed</th><th>Rating</th><th>Licence check</th><th>Flags</th>{canKyc&&<th/>}</tr></thead><tbody>
    {a.partnerHealth.map((p:any)=><tr key={p.user_id}><td>{p.name}</td><td>{p.offers}</td><td>{p.offers?Math.round(p.missed/p.offers*100)+'%':'—'}</td><td>{p.rating!=null?p.rating.toFixed(2)+` (${p.ratings})`:'—'}</td><td><Badge value={String(p.kyc_status||'not_run').replace('_',' ')}/></td><td>{p.flags.length?p.flags.map((f:string)=><span className="flag" key={f}>{f}</span>):<span className="muted">None</span>}</td>
     {canKyc&&<td><button className="sm" onClick={()=>act(`drivers/${p.user_id}/kyc`,{}).then(load).catch(()=>{})}>Check licence</button></td>}</tr>)}
   </tbody></table></div>
  </section>
 </>;
}

export function Pricing({data,act}:{data:any;act:Act}){
 const cities=(data.cities||[]).filter((c:any)=>!String(c.id).startsWith('region-'));
 const [days,setDays]=useState(127);
 return <div className="two-col">
  <section className="panel"><div className="section-heading"><h2><Percent size={18} style={{verticalAlign:-3}}/> Busy-time pricing</h2><span>{data.surgeRules?.length||0} RULES</span></div>
   <p className="helper" style={{marginBottom:12}}>A rule multiplies the base fare inside its time window. Customers see the charge as a separate line before they book.</p>
   {(data.surgeRules||[]).length?(data.surgeRules||[]).map((r:any)=><div className="ledger-row" key={r.id}><span><strong>{r.label} · {(Number(r.multiplier_bps)/10000).toFixed(2)}×</strong><small>{cities.find((c:any)=>c.id===r.city_id)?.name||r.city_id} · {hhmm(r.start_min)}–{hhmm(r.end_min)} · {dayBits.filter((_,i)=>Number(r.days)&(1<<i)).join(', ')}</small></span><button className="sm subtle" aria-label={`Delete ${r.label}`} onClick={()=>act(`surge-rules/${r.id}/delete`,{}).catch(()=>{})}><Trash2 size={15}/></button></div>):<p className="helper">No busy-time rules. Fares follow the city base and hourly rates.</p>}
  </section>
  <section className="panel"><h2>Add a rule</h2>
   <Form button="Add rule" reset onSubmit={f=>act('surge-rules',{cityId:f.get('cityId'),label:f.get('label'),multiplierBps:Math.round(Number(f.get('multiplier'))*10000),days,start:f.get('start'),end:f.get('end')})}>
    <Field title="City"><select name="cityId">{cities.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <div className="fields"><Field title="Label"><input name="label" placeholder="Evening peak" minLength={2} maxLength={40} required/></Field><Field title="Multiplier"><input name="multiplier" type="number" step="0.05" min={1.01} max={3} defaultValue={1.2} required/></Field></div>
    <div className="fields"><Field title="From"><input name="start" type="time" defaultValue="17:30" required/></Field><Field title="To"><input name="end" type="time" defaultValue="21:00" required/></Field></div>
    <div className="field"><span>Days</span><div className="chip-row">{dayBits.map((d,i)=><button type="button" key={d} className={'chip'+(days&(1<<i)?' on':'')} aria-pressed={!!(days&(1<<i))} onClick={()=>setDays(v=>(v^(1<<i))||v)}>{d}</button>)}</div></div>
   </Form>
   <p className="helper" style={{marginTop:14}}>Cancellation fees are set per city under Cities. Customers cancel free until 5 minutes after a driver is assigned.</p>
  </section>
 </div>;
}

export function Companies({data,act}:{data:any;act:Act}){
 const [edit,setEdit]=useState<any>(null);
 return <div className="two-col">
  <section className="panel"><div className="section-heading"><h2><Building2 size={18} style={{verticalAlign:-3}}/> Corporate accounts</h2><span>{data.companies?.length||0}</span></div>
   {(data.companies||[]).length?(data.companies||[]).map((c:any)=><div className="company" key={c.id}>
    <div className="ledger-row"><span><strong>{c.name}</strong><small>{c.gstin||'No GSTIN'} · {c.billing_email} · {c.members} members</small></span><span style={{textAlign:'right'}}><strong>{fmt(c.month_fare)}</strong><small style={{display:'block'}}>{c.month_trips} trips this month</small></span><Badge value={Number(c.active)?'active':'paused'}/></div>
    <div className="actions"><button className="sm" onClick={()=>setEdit(c)}>Edit</button>
     <Form className="inline-form" button="Add member" buttonClass="sm" reset onSubmit={f=>act(`companies/${c.id}/members`,{email:f.get('email')})}><input name="email" type="email" placeholder="employee@company.com" aria-label={`Add member to ${c.name}`} required/></Form></div>
   </div>):<Empty icon={Building2} title="No corporate accounts." text="Companies get monthly GST invoices for their employees’ trips."/>}
  </section>
  <section className="panel"><h2>{edit?`Edit ${edit.name}`:'New company'}</h2>
   <Form key={edit?.id||'new'} button={edit?'Save company':'Create company'} reset={!edit} onSubmit={async f=>{const r=await act('companies',{...(edit?{id:edit.id}:{}),name:f.get('name'),gstin:String(f.get('gstin')||''),billingEmail:f.get('billingEmail'),address:String(f.get('address')||''),active:f.get('active')==='on'});setEdit(null);return r}}>
    <Field title="Company name"><input name="name" defaultValue={edit?.name||''} minLength={2} maxLength={120} required/></Field>
    <div className="fields"><Field title="GSTIN"><input name="gstin" defaultValue={edit?.gstin||''} placeholder="36ABCDE1234F1Z5" maxLength={15} style={{textTransform:'uppercase'}}/></Field><Field title="Billing email"><input name="billingEmail" type="email" defaultValue={edit?.billing_email||''} required/></Field></div>
    <Field title="Billing address"><textarea name="address" defaultValue={edit?.address||''} maxLength={300}/></Field>
    <label className="check"><input type="checkbox" name="active" defaultChecked={edit?Number(edit.active)===1:true}/>Active — members can bill trips to this company</label>
   </Form>
   {edit&&<button className="subtle" style={{marginTop:8}} onClick={()=>setEdit(null)}>Cancel editing</button>}
  </section>
 </div>;
}

export function Incentives({data,act,role}:{data:any;act:Act;role:string}){
 const cities=(data.cities||[]).filter((c:any)=>!String(c.id).startsWith('region-'));
 const today=new Date(Date.now()+19800000).toISOString().slice(0,10),week=new Date(Date.now()+19800000+7*86400000).toISOString().slice(0,10);
 const pending=(data.incentiveAwards||[]).filter((w:any)=>w.status==='pending');
 return <div className="two-col">
  <div className="stack">
   <section className="panel"><div className="section-heading"><h2><Gauge size={18} style={{verticalAlign:-3}}/> Partner bonuses</h2><span>{(data.incentivesAdmin||[]).filter((i:any)=>Number(i.active)).length} ACTIVE</span></div>
    {(data.incentivesAdmin||[]).length?(data.incentivesAdmin||[]).map((i:any)=><div className="ledger-row" key={i.id}><span><strong>{i.title}</strong><small>{i.target_trips} trips → {fmt(i.bonus)} · {i.city_id?cities.find((c:any)=>c.id===i.city_id)?.name:'All cities'} · {when(i.starts_at)} – {when(i.ends_at)} · {i.awarded} awarded</small></span>{role==='admin'?<button className="sm" onClick={()=>act(`incentives/${i.id}/toggle`,{}).catch(()=>{})}>{Number(i.active)?'Pause':'Resume'}</button>:<Badge value={Number(i.active)?'active':'paused'}/>}</div>):<p className="helper">No bonus campaigns yet.</p>}
   </section>
   <section className="panel"><div className="section-heading"><h2>Awards to pay</h2><span>{pending.length} PENDING</span></div>
    {(data.incentiveAwards||[]).length?(data.incentiveAwards||[]).map((w:any)=><div className="ledger-row" key={w.id}><span><strong>{w.driver_name} · {w.title}</strong><small>{when(w.created_at)}{w.reference?' · Ref '+w.reference:''}</small></span><strong>{fmt(w.amount)}</strong>
     {w.status==='pending'&&['admin','finance'].includes(role)?<Form className="inline-form" button="Mark paid" buttonClass="sm" onSubmit={f=>act(`incentive-awards/${w.id}/paid`,{reference:f.get('reference')})}><input name="reference" placeholder="Transfer ref" minLength={5} maxLength={100} required aria-label="Transfer reference"/></Form>:<Badge value={w.status}/>}</div>):<p className="helper">Awards appear automatically when a partner reaches a target.</p>}
   </section>
  </div>
  {role==='admin'&&<section className="panel"><h2>New bonus campaign</h2>
   <Form button="Launch campaign" reset onSubmit={f=>act('incentives',{cityId:f.get('cityId')||null,title:f.get('title'),targetTrips:Number(f.get('target')),bonus:Math.round(Number(f.get('bonus'))*100),startsAt:Date.parse(f.get('start')+'T00:00:00+05:30'),endsAt:Date.parse(f.get('end')+'T23:59:59+05:30')})}>
    <Field title="Title"><input name="title" placeholder="Weekend warrior" minLength={3} maxLength={80} required/></Field>
    <Field title="City"><select name="cityId" defaultValue=""><option value="">All cities</option>{cities.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <div className="fields"><Field title="Trips to complete"><input name="target" type="number" min={1} max={500} defaultValue={10} required/></Field><Field title="Bonus · ₹"><input name="bonus" type="number" min={1} max={100000} defaultValue={500} required/></Field></div>
    <div className="fields"><Field title="Starts"><input name="start" type="date" defaultValue={today} required/></Field><Field title="Ends"><input name="end" type="date" defaultValue={week} required/></Field></div>
   </Form>
  </section>}
 </div>;
}

/** Today's and tomorrow's partner shift plans (shown on the partners page). */
export function ShiftPlans({plans,cityName}:{plans:any[];cityName:(id:string)=>string}){
 const byDay=useMemo(()=>{const m=new Map<string,any[]>();for(const p of plans){m.set(p.day,[...(m.get(p.day)||[]),p])}return [...m.entries()]},[plans]);
 return <section className="panel" style={{marginTop:20}}><div className="section-heading"><h2><CalendarClock size={18} style={{verticalAlign:-3}}/> Shift plans</h2><span><Users size={13} style={{verticalAlign:-2}}/> {plans.filter(p=>!Number(p.off)).length} PLANNED</span></div>
  {byDay.length?byDay.map(([day,list])=><div key={day}><h3 style={{margin:'10px 0 6px'}}>{new Date(day+'T00:00:00+05:30').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short',timeZone:'Asia/Kolkata'})}</h3>
   {list.map((p:any)=><div className="ledger-row" key={p.driver_id+day}><span><strong>{p.name}</strong><small>{cityName(p.city_id)}</small></span><span>{Number(p.off)?'Day off':`${hhmm(p.start_min)}–${hhmm(p.end_min)}`}</span></div>)}</div>)
  :<p className="helper">No partner has planned shifts for today or tomorrow yet.</p>}
 </section>;
}
