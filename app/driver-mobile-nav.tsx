 'use client';
import {House,CarFront,WalletCards,UserRound} from 'lucide-react';
type Section='home'|'rides'|'wallet'|'account';
export default function DriverMobileNav({active}:{active:Section}){
 const items=[{id:'home',label:'Home',href:'/#driver',Icon:House},{id:'rides',label:'Rides',href:'/#driver/trips',Icon:CarFront},{id:'wallet',label:'Wallet',href:'/wallet',Icon:WalletCards},{id:'account',label:'Account',href:'/#account',Icon:UserRound}] as const;
 return <nav className="driver-mobile-nav" aria-label="Driver navigation">{items.map(({id,label,href,Icon})=><a key={id} href={href} aria-current={active===id?'page':undefined} onClick={()=>window.scrollTo(0,0)}><span><Icon size={22} strokeWidth={1.8} aria-hidden="true"/></span><strong>{label}</strong></a>)}</nav>;
}
