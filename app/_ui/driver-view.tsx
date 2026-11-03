'use client';
import {ArrowRight,ArrowUpRight,BadgeCheck,Car,CircleCheck,FileCheck,IndianRupee,LocateFixed,Radar,Route,ShieldCheck,Upload} from 'lucide-react';
import {localMoney} from '@/lib/local-money';
import DriverLocationMap from '../driver-location-map';
import {Badge,Empty,Field,Form,Metric} from './primitives';
import {TripCard,TripMeta,TripRoute,type TripActions} from './trip-card';
import {fmt,label,when} from './client';
import {SearchingWheel} from './steering';
import {useState} from 'react';
import {Award,CalendarClock,CalendarDays,Star,TriangleAlert,WalletCards} from 'lucide-react';
import DriverWelcomeOffer from '../driver-welcome-offer';
import DriverWalletSummary from '../driver-wallet-summary';
import {PartnerTripActions} from './partner-trip';
import {Callout} from './primitives';

const docKinds=[['licence','Driving licence'],['identity','Identity proof'],['assessment','Driving assessment']] as const;

export default function DriverView({data,me,section,setSection,t,gps,position,shareGps}:{data:any;me:any;section:string;setSection:(s:string)=>void;t:(b:any)=>TripActions;gps:boolean;position:any;shareGps:()=>void}){
 const {driver,cities,documents,payouts}=data;const base=t({});
 const partnerTrips=data.bookings.filter((b:any)=>b.driver_id===me.id);
 const completed=partnerTrips.filter((b:any)=>b.status==='completed');
 const earnings=completed.reduce((n:number,b:any)=>n+Number(b.partner_fare||0),0);
 const paid=payouts.filter((p:any)=>p.driver_id===me.id&&p.status==='paid').reduce((n:number,p:any)=>n+Number(p.amount||0),0);
 const active=partnerTrips.find((b:any)=>['assigned','arrived','in_progress'].includes(b.status));
 const myDocs=documents.filter((d:any)=>d.owner_id===me.id);
 const docState=(k:string)=>myDocs.find((d:any)=>d.kind===k&&d.status==='approved')?'approved':myDocs.find((d:any)=>d.kind===k&&d.status==='pending')?'pending':myDocs.find((d:any)=>d.kind===k)?'rejected':'missing';
 return <>
  <DriverWelcomeOffer userId={me.id} onVerify={()=>setSection('onboarding')}/>
  {data.offerAvailability?.error&&<Callout icon={TriangleAlert}>{data.offerAvailability.error}</Callout>}
  {driver?.online&&!active&&data.offerAvailability?.blockedCount>0&&<section className="panel" aria-label="Waiting ride requests" style={{marginBottom:20}}><h2>{data.offerAvailability.waitingCount} ride request{data.offerAvailability.waitingCount===1?'':'s'} waiting</h2><p>Add at least {new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(data.offerAvailability.minimumRecharge/100)} to receive an offer. Your available acceptance balance is {fmt(data.offerAvailability.availableFunds)}. Bookings are still searching for a driver.</p>{data.offerAvailability.requests?.map((r:any)=><div className="ledger-row" key={r.id}><span>{r.pickup} → {r.destination}<small>Your earnings: {localMoney(r.partnerFare,r)}</small></span></div>)}<a className="button primary" href="/wallet">Recharge to receive offers</a></section>}
  {section==='overview'&&<>
   {data.licenceDaysLeft!=null&&data.licenceDaysLeft<=30&&<Callout icon={TriangleAlert}>{data.licenceDaysLeft<0?'Your driving licence has expired. Renew it and update your profile to keep receiving rides.':`Your driving licence expires in ${data.licenceDaysLeft} day${data.licenceDaysLeft===1?'':'s'}. Renew it and upload the new copy in Profile.`}</Callout>}
   <div className="metrics">
    <Metric feature icon={IndianRupee} title="Today" value={fmt(data.earnings?.today||0)} note={`${data.earnings?.todayTrips||0} trips · week ${fmt(data.earnings?.week||0)}`}/>
    <Metric icon={Star} title="Your rating" value={data.driverRating?.count?Number(data.driverRating.avg).toFixed(1):'New'} note={data.driverRating?.count?`From ${data.driverRating.count} customer ratings`:'Ratings appear after trips'}/>
    <Metric icon={ShieldCheck} title="Verification" value={<span className="metric-word">{driver?label(driver.verification):'Not applied'}</span>} note={driver?base.cityName(driver.city_id):'Start onboarding'}/>
    <Metric icon={Radar} title="Ride offers" value={<span className="metric-word">{driver?.online?'Listening':'Paused'}</span>} note={driver?.online?'Keep this page open to receive offers':'Go online to receive ride offers'}/>
   </div>
   {driver?.verification==='approved'&&<div className="two-col" style={{marginBottom:20}}>
    <div className="stack"><DriverWalletSummary/><div className="driver-account-links"><a href="/wallet"><WalletCards size={18}/><span>Wallet, recharge & DRIOZ500</span><ArrowUpRight size={16}/></a><a href="/driver-finance"><IndianRupee size={18}/><span>Bank account & transfers</span><ArrowUpRight size={16}/></a></div></div>
    <Incentives incentives={data.incentives||[]} awards={data.awards||[]}/>
   </div>}
   {!driver||driver.verification!=='approved'?<div className="feature-panel">
    <span className="eyebrow light">Before your first trip</span><h2>Ready for the road.</h2><p>Three steps stand between you and your first journey with DRIOZ. Most partners finish in under ten minutes.</p>
    <ol className="steps"><li><b>1</b>Complete your partner profile and licence details.</li><li><b>2</b>Upload licence, identity and driving-assessment evidence.</li><li><b>3</b>Operations verifies everything and approves your account.</li></ol>
    <button className="primary" onClick={()=>setSection('onboarding')}>Continue onboarding <ArrowRight size={16}/></button>
   </div>:<div className="two-col">
    <div>
     <div className="section-heading"><h2>{active?'Active journey':'Your driving area'}</h2><Badge value={driver.online?'online':'offline'}/></div>
     {active?<TripCard b={active} mode="partner" t={t(active)} actions={<PartnerTripActions b={active} t={t(active)}/>}/>:<div className="area-panel"><span>{base.cityName(driver.city_id)}</span>{driver.online?<div style={{display:'grid',placeItems:'center'}}><SearchingWheel size={64}/></div>:<div className="radar idle"><Car size={30}/></div>}<h3>{driver.online?'Ready for your next journey.':'Take a breather.'}</h3><p>{driver.online?'Keep this page open. Ride offers pop up with a 10-second timer — accept and the ride is yours. Missed it? If nobody takes it, it comes back to you.':'Switch to online in the top bar to start receiving ride offers.'}</p></div>}
     <div className="gps-control"><button className={gps?'dark block':'block'} onClick={shareGps}><LocateFixed size={16}/>{gps?'Stop location sharing':'Share device location'}</button><p>Recent coordinates help dispatch match you while online. Assigned customers see them during a trip. You can stop at any time.</p></div>
    </div>
    <div>
     <div className="section-heading"><h2>How ride offers work</h2><span>10-SECOND OFFERS</span></div>
     <ol className="steps offer-steps"><li><b>1</b>Go online and keep DRIOZ Partner open. You only receive offers while the app is open.</li><li><b>2</b>A new ride appears as a pop-up with a rotating steering wheel and a 10-second timer — it is offered only to you.</li><li><b>3</b>Accept and the ride is yours. Pass or let it expire and it moves to the next partner; if nobody takes it, it comes back to you.</li><li><b>4</b>Scheduled rides are offered 30 minutes before pickup. Keep your wallet balance above the platform fee to stay eligible.</li></ol>
    </div>
   </div>}
   <div style={{marginTop:20}}><DriverLocationMap position={position} sharing={gps}/></div>
  </>}
  {section==='trips'&&<PartnerTrips trips={partnerTrips} t={t}/>}
  {section==='planner'&&<Planner plans={data.plans||[]} act={base.act}/>}
  {section==='earnings'&&<div className="two-col"><section className="panel"><span className="eyebrow">Partner earnings</span><div className="ledger-total">{fmt(earnings)}</div><p>Earned from {completed.length} completed trips. This month {fmt(data.earnings?.month||0)} across {data.earnings?.monthTrips||0} trips. Rides paid through the driver wallet settle in <a href="/wallet">Wallet</a>; withdraw to your bank from <a href="/driver-finance">Bank & transfers</a>.</p><div className="metrics" style={{gridTemplateColumns:'1fr 1fr',marginBottom:0}}><Metric icon={BadgeCheck} title="Paid out" value={fmt(paid)}/><Metric icon={IndianRupee} title="Pending" value={fmt(Math.max(0,earnings-paid))}/></div></section>
   <section className="panel"><h2>Payout history</h2>{payouts.filter((p:any)=>p.driver_id===me.id).length?payouts.filter((p:any)=>p.driver_id===me.id).map((p:any)=><div className="ledger-row" key={p.id}><span><strong>Trip {p.booking_id.slice(0,8).toUpperCase()}</strong><small>{when(p.created_at)}{p.reference?' · Ref '+p.reference:''}</small></span><strong>{fmt(p.amount)}</strong><Badge value={p.status}/></div>):<Empty icon={IndianRupee} title="No payouts yet." text="Each completed trip creates an earnings entry here."/>}</section></div>}
  {section==='onboarding'&&<div className="two-col">
   <section className="panel"><div className="section-heading"><h2>Partner profile</h2>{driver&&<Badge value={driver.verification}/>}</div>
    {driver?.verification==='pending'&&<div className="application-confirmation" role="status"><strong>Your application is awaiting review.</strong><p>Your profile is visible to Operations. Reference {driver.user_id.slice(-8).toUpperCase()}</p></div>}
    {driver?.review_note&&<p className="helper" style={{marginBottom:14}}>Operations note: {driver.review_note}</p>}
    <Form button="Submit for review" disabled={driver?.verification==='approved'} onSubmit={f=>base.act('driver/apply',{cityId:f.get('cityId'),phone:String(f.get('phone')||'').replace(/[\s()-]/g,''),licence:f.get('licence'),licenceExpiry:f.get('licenceExpiry')})}>
     <Field title="City"><select name="cityId" defaultValue={driver?.city_id||cities[0]?.id}>{cities.map((c:any)=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field>
     <Field title="Mobile number"><input type="tel" name="phone" defaultValue={driver?.phone||''} pattern="\+?[0-9\s()-]{10,20}" placeholder="+91 98765 43210" required/></Field>
     <div className="fields"><Field title="Driving licence number"><input name="licence" defaultValue={driver?.licence||''} minLength={5} maxLength={40} required/></Field><Field title="Licence valid until"><input type="date" name="licenceExpiry" min={new Date().toISOString().slice(0,10)} defaultValue={driver?.licence_expiry||''} required/></Field></div>
    </Form>
   </section>
   <section className="panel"><h2>Verification documents</h2><p>PDF, JPEG or PNG up to 4 MB. Files are private and only visible to you and authorised operations staff.</p>
    <div className="list" style={{marginBottom:18}}>{docKinds.map(([k,name])=>{const st=docState(k);return <div className="list-item" key={k}><span className={'tile-icon'+(st==='approved'?' brand':'')}><FileCheck size={18}/></span><div className="grow"><strong>{name}</strong><small>{st==='missing'?'Not uploaded yet':st==='approved'?'Verified':st==='pending'?'Awaiting review':'Rejected — upload again'}</small></div><Badge value={st==='missing'?'required':st}/></div>})}</div>
    <Form button={<><Upload size={16}/>Upload securely</>} reset onSubmit={f=>{const file=f.get('file');if(!(file instanceof File)||!file.size)throw Error('Choose a readable PDF, JPEG or PNG.');if(file.size>4*1024*1024)throw Error('Maximum file size is 4 MB. Compress the file or scan at a lower resolution and retry.');return base.act('documents',f)}}>
     <Field title="Document type"><select name="kind">{docKinds.map(([k,n])=><option key={k} value={k}>{n}</option>)}</select></Field>
     <Field title="File"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required/></Field>
    </Form>
    {myDocs.length>0&&<><h3>Uploaded files</h3>{myDocs.map((d:any)=><div className="ledger-row" key={d.id}><a href={'/api/ops/documents/'+d.id}>{label(d.kind)} · {Math.round(d.size/1024)} KB</a><Badge value={d.status}/></div>)}</>}
   </section>
  </div>}
 </>;
}

function PartnerTrips({trips,t}:{trips:any[];t:(b:any)=>TripActions}){
 const [filter,setFilter]=useState<'current'|'completed'|'all'>('current');
 const list=trips.filter((b:any)=>filter==='all'||(filter==='completed'?b.status==='completed':['assigned','arrived','in_progress'].includes(b.status)));
 return <>
  <div className="filter-bar" role="group" aria-label="Filter rides">{(['current','completed','all'] as const).map(f=><button key={f} aria-pressed={filter===f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f==='current'?'Active':f==='completed'?'Completed':'All rides'}</button>)}</div>
  <div className="trip-grid">{list.length?list.map((b:any)=><TripCard key={b.id} b={b} mode="partner" t={t(b)} actions={<PartnerTripActions b={b} t={t(b)}/>}/>):<Empty icon={Route} title={filter==='current'?'No active rides.':'No journeys here yet.'} text={filter==='current'?'Accepted rides appear here. Choose Completed to see past journeys.':'Your journeys will appear here once they match this filter.'}/>}</div>
 </>;
}

function Incentives({incentives,awards}:{incentives:any[];awards:any[]}){
 return <section className="panel incentives">
  <div className="section-heading"><h2><Award size={18} style={{verticalAlign:-3}}/> Bonuses</h2><span>{incentives.length} ACTIVE</span></div>
  {incentives.length?incentives.map((i:any)=>{const pct=Math.min(100,Math.round(Number(i.done)/Number(i.target)*100));return <div className="incentive" key={i.id}>
   <div className="incentive-top"><strong>{i.title}</strong><span>{fmt(i.bonus)}</span></div>
   <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={Number(i.target)} aria-valuenow={Number(i.done)}><i style={{width:pct+'%'}}/></div>
   <small>{i.achieved?'Unlocked — added to your payouts':`${i.done}/${i.target} trips · ends ${when(i.endsAt)}`}</small>
  </div>}):<p className="helper">No bonus campaigns right now. Operations announces new targets here.</p>}
  {awards.length>0&&<><h3 style={{marginTop:16}}>Your awards</h3>{awards.map((w:any)=><div className="ledger-row" key={w.id}><span><strong>{w.title}</strong><small>{when(w.created_at)}</small></span><strong>{fmt(w.amount)}</strong><Badge value={w.status}/></div>)}</>}
 </section>;
}

const hhmm=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
function Planner({plans,act}:{plans:any[];act:(p:string,d:unknown)=>Promise<any>}){
 const days=Array.from({length:14},(_,i)=>new Date(Date.now()+19800000+i*86400000).toISOString().slice(0,10));
 const byDay=new Map(plans.map((p:any)=>[p.day,p]));
 return <section className="panel">
  <div className="section-heading"><h2><CalendarDays size={18} style={{verticalAlign:-3}}/> Shift planner</h2><span>NEXT 14 DAYS</span></div>
  <p className="helper" style={{marginBottom:14}}>Tell operations when you plan to drive. Planned partners are prioritised for scheduled rides.</p>
  <div className="planner">{days.map(day=>{const p:any=byDay.get(day);const label=new Date(day+'T00:00:00+05:30').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Kolkata'});
   return <Form key={day+(p?.updated_at||'')} className="plan-row" button="Save" buttonClass="sm" onSubmit={f=>act('driver/plan',f.get('off')?{day,off:true}:{day,start:String(f.get('start')),end:String(f.get('end'))})}>
    <span className="plan-day"><CalendarClock size={15}/>{label}</span>
    <input type="time" name="start" aria-label={`Start on ${label}`} defaultValue={p&&!p.off?hhmm(Number(p.start_min)):'09:00'}/>
    <input type="time" name="end" aria-label={`End on ${label}`} defaultValue={p&&!p.off?hhmm(Number(p.end_min)):'18:00'}/>
    <label className="plan-off"><input type="checkbox" name="off" defaultChecked={!!p?.off}/>Day off</label>
    {p&&<Badge value={p.off?'day off':'planned'}/>}
   </Form>})}</div>
 </section>;
}
