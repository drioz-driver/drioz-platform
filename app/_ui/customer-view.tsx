'use client';
import {ArrowRight,BadgeCheck,Clock,KeyRound,MapPinned,RefreshCw,Repeat,Route,ShieldCheck,Sparkles,Star,Wallet} from 'lucide-react';
import BookingForm from '../booking-form';
import {Badge,Empty} from './primitives';
import {TripCard,type TripActions} from './trip-card';
import {fmt,ref,tripTypeName} from './client';
import {SteeringWheel} from './steering';
import {useState} from 'react';
import {BillTo,CustomerTripAfter,LiveTrack} from './customer-trip';

export default function CustomerView({data,me,t,onBook,refresh}:{data:any;me:any;t:(b:any)=>TripActions;onBook:(input:any,total:number,key:string,billTo?:'personal'|'company')=>Promise<void>;refresh:()=>void}){
 const [billTo,setBillTo]=useState<'personal'|'company'>('personal');
 const mine=data.bookings.filter((b:any)=>b.customer_id===me.id);
 const requests=(data.locationRequests||[]).filter((r:any)=>r.customer_id===me.id&&r.status!=='converted');
 const priced=data.cities.filter((c:any)=>!c.id.startsWith('region-')&&Number(c.base)>0);
 const from=priced.length?Math.min(...priced.map((c:any)=>Number(c.base))):0;
 const live=mine.filter((b:any)=>['requested','assigned','arrived','in_progress'].includes(b.status));
 const actions=t({});
 return <>
  <section className="hero">
   <SteeringWheel size={560} className="hero-wheel" rim="#e9f2ee" hub="transparent"/>
   <div className="hero-copy">
    <span className="eyebrow"><Sparkles size={14}/>Personal drivers, reimagined</span>
    <h1>Take the back seat.<br/><em>Own your day.</em></h1>
    <p>Your own car, driven by a verified professional. Book in seconds for a one-way drop, a few hours around town, or the open road.</p>
    <div className="hero-proof">
     <div><strong>{priced.length||6}+</strong><span>Launch cities</span></div>
     <div><strong>3-step</strong><span>Driver verification</span></div>
     <div><strong>{from?fmt(from):'Fixed'}</strong><span>Fares from, before tax</span></div>
    </div>
   </div>
   <div className="booking-panel" id="book">
    <span className="eyebrow">Your next journey</span>
    <h2>Where shall we take you?</h2>
    <BillTo company={data.company} value={billTo} onChange={setBillTo}/>
    <BookingForm cities={data.cities} onBook={(input,total,key)=>onBook(input,total,key,data.company?billTo:'personal')}/>
   </div>
  </section>

  {(live.length>0||requests.length>0)&&<section className="section tight customer-journeys" aria-label="Active journeys">
   <div className="section-heading"><div><span className="eyebrow">Happening now</span><h2>Active journeys.</h2></div></div>
   <div className="trip-grid">{live.map((b:any)=><TripCard key={b.id} b={b} mode="customer" t={t(b)} before={<LiveTrack b={b}/>} after={<CustomerTripAfter b={b} t={t(b)}/>}/>)}
    {requests.map((r:any)=><section className="trip" key={r.id}>
     <div className="trip-top"><span>REQ-{ref(r.id)}</span><Badge value={r.status==='pending'?'address verification':r.status}/></div>
     <div className="trip-route"><div><small>Pickup</small><strong>{r.pickup}</strong></div><div><small>Destination</small><strong>{r.destination}</strong></div></div>
     <div className="meta"><span>{tripTypeName(r.tripType)}{r.hours?` · ${r.hours}h`:''}</span><span>{actions.cityName(r.city_id)}</span></div>
     <div className="trip-fare"><span>Package estimate<strong>{fmt(r.fare)}</strong></span>{r.status==='pending'&&<button className="subtle sm" disabled={actions.busy} onClick={()=>actions.click(`location-requests/${r.id}/cancel`,{})}>Cancel request</button>}</div>
     {r.status==='pending'&&<p className="helper">Our operations team is confirming the exact pickup and drop points before dispatch.</p>}
    </section>)}
   </div>
  </section>}

  <section className="section" id="services">
   <div className="section-intro"><span className="eyebrow">Three ways to ride</span><h2>A driver for every <em>kind</em> of day.</h2><p>Transparent package pricing calculated on our servers, so the fare you see is the fare you agree.</p></div>
   <div className="service-grid">
    <article className="service"><span className="tile-icon brand"><Route size={24}/></span><h3>One way</h3><p>Airport runs, late dinners, a drop across the city. Your driver takes you there and heads off.</p><div className="price-from">From <strong>{from?fmt(from):'—'}</strong></div></article>
    <article className="service dark"><span className="tile-icon"><Repeat size={24}/></span><h3>Round trip</h3><p>Errands, meetings, a day of appointments. Choose a 2 to 12 hour package and keep your driver on hand.</p><div className="price-from">Packages <strong>2 – 12 hrs</strong></div></article>
    <article className="service"><span className="tile-icon brand"><MapPinned size={24}/></span><h3>Outstation</h3><p>Weekend escapes and long highway drives with an experienced driver, scheduled in advance.</p><div className="price-from">Usage <strong>12 – 72 hrs</strong></div></article>
   </div>
  </section>

  <section className="section tight">
   <div className="section-intro"><span className="eyebrow">How it works</span><h2>Booked in under a minute.</h2></div>
   <div className="how">
    <div><h3>Set your route</h3><p>Pick your journey type and choose addresses from the map search.</p></div>
    <div><h3>See your fare</h3><p>A server-calculated estimate with tax and night charges itemised.</p></div>
    <div><h3>Meet your driver</h3><p>A verified, approved driver accepts and arrives at your car.</p></div>
    <div><h3>Start with a code</h3><p>Share your one-time six-digit code so the trip starts only with you.</p></div>
   </div>
  </section>

  <section className="section tight">
   <div className="trust">
    <div><span className="eyebrow light"><ShieldCheck size={14}/>Safety by design</span><h2>Every driver is checked. Every trip is accounted for.</h2><p>We verify licences and identity, review a driving assessment, and keep an audit trail of every journey from request to completion.</p><a className="primary" href="#book" style={{marginTop:26}}>Book a driver <ArrowRight size={16}/></a></div>
    <ul>
     <li><BadgeCheck size={20}/><div><strong>Verified drivers</strong><span>Licence, identity and an assessed drive before approval.</span></div></li>
     <li><KeyRound size={20}/><div><strong>Trip start codes</strong><span>Single-use, time-limited codes with automatic lockout.</span></div></li>
     <li><Wallet size={20}/><div><strong>Locked-in fares</strong><span>Agreed prices are stored with your booking and never change.</span></div></li>
     <li><Clock size={20}/><div><strong>Live status sharing</strong><span>Send a private status link to family for 24 hours.</span></div></li>
    </ul>
   </div>
  </section>

  <section className="section customer-journeys" id="journeys">
   <div className="section-heading"><div><span className="eyebrow">All in one place</span><h2>Your journeys.</h2></div><button onClick={refresh}><RefreshCw size={15}/>Refresh</button></div>
   <div className="trip-grid">{mine.length?mine.map((b:any)=><TripCard key={b.id} b={b} mode="customer" t={t(b)} before={<LiveTrack b={b}/>} after={<CustomerTripAfter b={b} t={t(b)}/>}/>):<Empty icon={Star} title="Make room for your first journey." text="Bookings you make will appear here with live status, start codes and fare statements."><a className="primary" href="#book">Plan a journey <ArrowRight size={16}/></a></Empty>}</div>
  </section>
 </>;
}
