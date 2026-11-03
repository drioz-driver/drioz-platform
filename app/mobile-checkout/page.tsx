'use client';
import {useEffect,useState} from 'react';
import {loadCheckout,openCheckout} from '@/lib/checkout';

type Order={order_id:string;key_id:string;amount:number;currency:'INR';mode:'live'|'test'};

export default function MobileCheckout(){
 const [order,setOrder]=useState<Order|null>(null);
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const params=new URLSearchParams(location.hash.slice(1));
  const id=params.get('order')||'',key=params.get('key')||'';
  if(!/^order_[a-zA-Z0-9]+$/.test(id)||!(/^[a-f0-9-]{36}$/i.test(key))){
   setError('This payment link is invalid. Return to the DRIOZ app to start again.');
   return;
  }
  const controller=new AbortController();
  fetch('/api/mobile-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:id,key}),signal:controller.signal})
   .then(async response=>{const data=await response.json() as Order & {message?:string};if(!response.ok)throw Error(data.message);setOrder(data);})
   .catch(e=>{if(!controller.signal.aborted)setError(e.message||'Checkout could not load.');});
  return()=>controller.abort();
 },[]);
 async function pay(){
  if(!order||busy||done)return;
  setBusy(true);setError('');
  try{
   await openCheckout(await loadCheckout(),order);
   setDone(true);
  }catch(e){setError(e instanceof Error?e.message:'Checkout could not open.');}
  finally{setBusy(false)}
 }
 return <main className="location-search-page mobile-checkout-page">
  <img src="/drioz-logo.png" alt="DRIOZ" width={168} height={58} className="mobile-checkout-logo"/>
  <p className="eyebrow">DRIOZ SECURE CHECKOUT</p>
  <h1>{done?'Payment submitted':'Pay with Razorpay'}</h1>
  {done?<p>Return to the DRIOZ app to check confirmation.</p>:order&&<>
   <p>Amount: {new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(order.amount/100)}</p>
   <button className="primary" disabled={busy} onClick={pay}>{busy?'Opening checkout…':'Continue to payment'}</button>
  </>}
  {!order&&!error&&<p role="status">Preparing your secure checkout…</p>}
  {error&&<p role="alert">{error}</p>}
 </main>;
}
