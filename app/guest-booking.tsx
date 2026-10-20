 'use client';
import {useEffect,useRef,useState} from 'react';
import Logo from './logo';
import BookingForm from './booking-form';
import {Spinner} from '@/components/ui/spinner';
export default function GuestBooking(){
 const modal=useRef<HTMLElement>(null);

 const [cities,C]=useState<any[]>([]),[error,E]=useState(''),[ready,R]=useState(false),[login,L]=useState(false);
 useEffect(()=>{if(!login)return;const previous=document.activeElement as HTMLElement|null;const first=modal.current?.querySelector<HTMLElement>('button,a');first?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')L(false);if(e.key==='Tab'){const items=Array.from(modal.current?.querySelectorAll<HTMLElement>('button,a[href]')||[]);const start=items[0],end=items[items.length-1];if(e.shiftKey&&document.activeElement===start){e.preventDefault();end?.focus()}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();start?.focus()}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus()}},[login]);
 async function load(){E('');try{const r=await fetch('/api/booking/cities');const body:any=await r.json();if(!r.ok)throw Error(body.message);C(body.cities);R(true)}catch{E('Booking is temporarily unavailable. Please try again.')}}
 useEffect(()=>{load()},[]);
 return <div className="guest-booking"><header className="site-header"><a className="wordmark" href="/" aria-label="DRIOZ home"><Logo/></a><nav><a className="button" href="/login?intent=driver">Become a driver</a><a className="primary" href="/login">Sign in</a></nav></header>
 <main><section className="hero"><div className="hero-copy"><span className="eyebrow">YOUR CAR. YOUR PERSONAL DRIVER.</span><h1>Take the <br/>back seat.<br/><em>Own your day.</em></h1><p>Your own car. A driver for the journey.<br/><span className="hero-secondary-copy">Make room for what matters.</span></p><div className="hero-cities">See your estimate first.<br/>Sign in when you’re ready to request a driver.</div></div><div className="booking-panel"><span className="eyebrow">YOUR NEXT JOURNEY</span><h2>Where shall we take you?</h2>{ready?<BookingForm cities={cities} guest onBook={async()=>L(true)}/>:error?<div role="alert"><p>{error}</p><button onClick={load}>Try again</button></div>:<p role="status"><Spinner/> Loading booking options…</p>}</div></section>
 <section className="customer-journeys"><span className="eyebrow">YOUR CAR, OUR DRIVER</span><h2>Plan your journey in a few steps.</h2><p>Choose your pickup, trip type and car. Review the estimate, then sign in to confirm your request.</p><p>Availability is confirmed when a driver accepts. Tolls and parking are extra.</p></section></main>
 <footer><a className="mobile-partner-link" href="/login?intent=driver">Become a driver</a><Logo className="footer-logo"/><span>Your personal driver, anytime.</span></footer>
 {login&&<div className="modal-backdrop"><section ref={modal} className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-login-title"><button className="close" onClick={()=>L(false)} aria-label="Close sign-in options">Close</button><span className="eyebrow">YOUR TRIP IS SAVED</span><h2 id="booking-login-title">Sign in to request your driver.</h2><p>Your trip details will be ready after sign-in. You’ll review the latest fare before confirming. No driver has been requested yet.</p><div className="actions"><a className="primary" href="/login?next=%2F%3Fresume%3Dbooking%23customer">Sign in</a><a className="button" href="/signup?next=%2F%3Fresume%3Dbooking%23customer">Create an account</a></div></section></div>}
 </div>;
}
