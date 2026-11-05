'use client';
import {useEffect,useRef,useState} from 'react';
import {Gift,X,CheckCircle2} from 'lucide-react';
import {sessionFetch} from '@/lib/browser-api';
import Logo from './logo';

const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(n||0)/100);
export default function DriverWelcomeOffer({guest=false,userId='',onVerify,autoShow=true}:{guest?:boolean;userId?:string;onVerify?:()=>void;autoShow?:boolean}){
 const [wallet,W]=useState<any>(null),[loaded,L]=useState(guest),[open,O]=useState(false),[busy,B]=useState(false),[error,E]=useState(''),[message,M]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),claiming=useRef(false);
 const reason=guest?'guest':wallet?.couponReason||(wallet?.couponRedeemed?'already_redeemed':wallet?.approved?'eligible':'verification_pending');
 const seenKey='drioz-welcome-v1-'+(guest?'guest':userId)+'-'+reason;
 async function refresh(){const r=await sessionFetch('/api/wallet',{cache:'no-store'});if(!r.ok)throw Error('Unable to check your welcome credit. Please retry.');const data:any=await r.json();W(data.driver);L(true);return data.driver}
 useEffect(()=>{let active=true;if(guest)return;sessionFetch('/api/wallet',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();const data:any=await r.json();if(active){W(data.driver);L(true)}}).catch(()=>{if(active)E('Welcome credit is reconnecting. Open Wallet to check your balance.')});return()=>{active=false}},[guest,userId]);
 useEffect(()=>{if(!loaded||!autoShow||['already_redeemed','licence_already_used'].includes(reason))return;try{if(!localStorage.getItem(seenKey)){localStorage.setItem(seenKey,'1');O(true)}}catch{}},[loaded,autoShow,reason,seenKey]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(open&&!d.open)d.showModal();else if(!open&&d.open)d.close()},[open]);
 async function claim(){if(claiming.current)return;claiming.current=true;B(true);E('');try{const r=await sessionFetch('/api/driver/coupon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'DRIOZ500'})});const result:any=await r.json();if(!r.ok)throw Error(result.message||'Unable to claim welcome credit.');M(result.message);await refresh();window.dispatchEvent(new Event('drioz-wallet-updated'));O(false)}catch(e){E(e instanceof Error?e.message:'Unable to claim welcome credit.');void refresh().catch(()=>{})}finally{claiming.current=false;B(false)}}
 return <>
  <button type="button" className="welcome-offer-trigger" onClick={()=>O(true)}><Gift size={24}/><span><strong>{reason==='already_redeemed'?'Your welcome credit':'₹500 to start your journey'}</strong><small>{reason==='already_redeemed'?money(wallet?.promo)+' remaining':'DRIOZ500 · new partner benefit'}</small></span><span aria-hidden="true">↗</span></button>
  {message&&<p className="helper" role="status">{message}</p>}
  <dialog ref={dialog} className="welcome-offer-dialog" aria-labelledby="welcome-offer-title" onCancel={()=>O(false)} onClose={()=>O(false)}>
   <div className="welcome-poster">
    <div className="welcome-poster-art"><img src="/driver-welcome-art.webp" alt="" width={960} height={640}/><Logo tone="light"/><button type="button" className="welcome-close" aria-label="Close welcome offer" onClick={()=>O(false)}><X size={22}/></button></div>
    <div className="welcome-poster-copy"><span className="welcome-kicker">YOUR FIRST MILES, ON US</span><h2 id="welcome-offer-title">A little boost.<br/><em>A great beginning.</em></h2><div className="welcome-amount">₹500<span>WELCOME RIDE CREDIT</span></div><div className="welcome-code"><span>YOUR COUPON</span><strong>DRIOZ500</strong></div>
     <p>Use your welcome credit towards platform deductions as you start driving with DRIOZ.</p>
     {!guest&&!loaded?<p role="status">Checking your offer…</p>:reason==='already_redeemed'?<div className="welcome-claimed"><CheckCircle2 size={20}/><span>Welcome credit claimed<strong>{money(wallet?.promo)} remaining</strong></span></div>:reason==='licence_already_used'?<p role="status">This driving licence has already used the welcome offer.</p>:guest?<a className="primary block" href="/partner/signup">Join DRIOZ Partner →</a>:reason==='eligible'?<button className="primary block" disabled={busy} onClick={claim}>{busy?'Adding your credit…':'Claim ₹500 ride credit'}</button>:<><button className="primary block" onClick={()=>{O(false);onVerify?.()}}>Complete verification</button><small className="welcome-verification">Your offer becomes available after driver approval.</small></>}
     {error&&<p role="alert" className="form-message err">{error}</p>}
     <p className="welcome-terms">One claim per approved driving licence. Platform deductions only. Not cash or withdrawable earnings. Existing credit is shown after redemption.</p>
    </div>
   </div>
  </dialog>
 </>;
}
