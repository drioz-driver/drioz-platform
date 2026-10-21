 'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,WalletCards} from 'lucide-react';
import {sessionFetch} from '@/lib/browser-api';
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n/100);
export default function DriverWalletSummary(){
 const [data,D]=useState<any>(null),[failed,F]=useState(false);
 useEffect(()=>{let active=true,pending=false;const controller=new AbortController();async function refresh(){if(pending||document.hidden)return;pending=true;try{const r=await sessionFetch('/api/wallet',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const value:any=await r.json();if(active){D(value);F(false)}}catch{if(active)F(true)}finally{pending=false}}refresh();const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh)}},[]);
 const driver=data?.driver;
 return <a className="driver-wallet-summary" href="/wallet"><div className="driver-wallet-summary-top"><span><WalletCards size={18} aria-hidden="true"/>Ride credit</span><span>Wallet<ArrowUpRight size={17} aria-hidden="true"/></span></div><strong>{driver?money(Math.max(0,Number(driver.promo)+Number(driver.recharge))):failed?'Open wallet':'—'}</strong><div className="driver-wallet-summary-bottom"><span>{driver&&!driver.couponRedeemed?'DRIOZ500 welcome offer available':driver?.couponRedeemed?'Includes your remaining welcome credit':'For ride commission'}</span><span>{driver?'Earnings '+money(driver.earnings):'View balances'}</span></div></a>;
}
