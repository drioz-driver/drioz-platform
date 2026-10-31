'use client';
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {CountdownWheel,SteeringStrip,SteeringWheel} from './steering';
import {errorMessage,fmt,tripTypeName} from './client';

export type Offer={id:string;bookingId:string;round:number;expiresAt:number;seconds:number;pickup:string;destination:string;tripType:string;transmission:string;scheduledAt:number|null;partnerFare:number;hours:number|null;vehicleCategory:string|null;pickupDistanceKm:number|null};
type Phase='offer'|'accepting'|'won'|'missed'|'leaving';

/** Web version of the partner ride-offer popup (same behaviour as DRIOZ Partner on mobile). */
export default function OfferPopup({offer,skew,onAccept,onDecline,onMissed,onDone}:{offer:Offer;skew:number;onAccept:(o:Offer)=>Promise<void>;onDecline:(o:Offer)=>Promise<void>;onMissed:(o:Offer)=>void;onDone:()=>void}){
 const remaining=()=>Math.max(0,offer.expiresAt-(Date.now()+skew));
 const [left,setLeft]=useState(remaining()),[phase,setPhase]=useState<Phase>('offer'),[error,setError]=useState('');
 const startLeft=useRef(remaining());
 const seconds=Math.ceil(left/1000);
 useEffect(()=>{const t=setInterval(()=>setLeft(remaining()),250);try{navigator.vibrate?.([300,120,300])}catch{};return()=>clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[offer.id]);
 useEffect(()=>{if(phase==='offer'&&left<=0){setPhase('missed');setTimeout(()=>{setPhase('leaving');setTimeout(()=>{onMissed(offer);onDone()},320)},900)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[left,phase]);
 const close=(after=0)=>setTimeout(()=>{setPhase('leaving');setTimeout(onDone,320)},after);
 async function accept(){if(phase!=='offer')return;setPhase('accepting');try{await onAccept(offer);setPhase('won');close(1500)}catch(e){setError(errorMessage(e,'This ride is no longer available'));setPhase('missed');close(1800)}}
 async function decline(){if(phase!=='offer')return;setPhase('leaving');onDecline(offer).catch(()=>{});setTimeout(onDone,320)}
 const urgent=seconds<=Math.min(8,Math.ceil(offer.seconds*0.4))&&phase==='offer';
 const chips=[offer.pickupDistanceKm!=null?`${offer.pickupDistanceKm} km to pickup`:null,tripTypeName(offer.tripType)+(offer.hours?` · ${offer.hours} hrs`:''),offer.transmission,offer.vehicleCategory,offer.scheduledAt?new Date(offer.scheduledAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'Pickup now'].filter(Boolean) as string[];
 return <div className={'offer-backdrop'+(phase==='leaving'?' leaving':'')} role="dialog" aria-modal="true" aria-label={`New ride request, ${fmt(offer.partnerFare)}`}>
  <section className={'offer-card'+(urgent?' urgent':'')+(phase==='missed'&&!error?' shake':'')+(phase==='leaving'?' leaving':'')}>
   <div className="offer-strip">
    <SteeringStrip height={56} urgent={urgent}/>
    <span className="offer-label"><i/>{phase==='won'?'RIDE CONFIRMED':offer.round>1?'RIDE IS BACK':'NEW RIDE REQUEST'}</span>
    <div className="offer-bar"><b style={{animationDuration:startLeft.current+'ms',transform:`scaleX(${startLeft.current/(offer.seconds*1000)})`}}/></div>
   </div>
   <div className="offer-body">
    <div className="offer-head">
     {phase==='won'?<div className="offer-won"><SteeringWheel size={110} rim="#e9f2ee" hub="var(--night-2)"/></div>:<CountdownWheel size={136} total={offer.seconds*1000} remaining={startLeft.current} seconds={Math.max(0,seconds)}/>}
     <div><small>{phase==='won'?'Ride confirmed':'Your earnings'}</small><strong>{fmt(offer.partnerFare)}</strong>
      {offer.round>1&&phase==='offer'&&<em>Still unclaimed — offered to you again</em>}
      {phase==='won'&&<em>It’s yours! Head to the pickup.</em>}</div>
    </div>
    <div className="offer-chips">{chips.map(c=><span key={c}>{c}</span>)}</div>
    <div className="offer-route"><div><small>Pickup</small><p>{offer.pickup}</p></div><div><small>{offer.tripType==='return'?'Return to':'Destination'}</small><p>{offer.destination}</p></div></div>
    {error&&<p className="offer-error" role="alert">{error}</p>}
    {phase!=='won'&&<div className="offer-actions"><button className="pass" aria-label="Pass this ride" disabled={phase!=='offer'} onClick={decline}><X size={22}/></button><button className="take" disabled={phase!=='offer'} onClick={accept}><SteeringWheel size={26} color="#04140e" rim="#04140e" hub="var(--brand)" className={phase==='accepting'?'spin':''}/>{phase==='accepting'?'Securing ride…':phase==='missed'?(error?'Not available':'Missed'):'Accept ride'}</button></div>}
   </div>
  </section>
 </div>;
}
