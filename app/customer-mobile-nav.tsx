 'use client';
import {House,CarFront,WalletCards,UserRound} from 'lucide-react';
export default function CustomerMobileNav({active='home'}:{active?:string}){
 const items=[{id:'home',label:'Home',href:'/#customer',Icon:House},{id:'rides',label:'Rides',href:'/#customer/trips',Icon:CarFront},{id:'wallet',label:'Wallet',href:'/wallet',Icon:WalletCards},{id:'account',label:'Account',href:'/#account',Icon:UserRound}];
 return <nav className="driver-mobile-nav customer-mobile-nav" aria-label="Customer navigation">{items.map(({id,label,href,Icon})=><a key={id} href={href} aria-current={active===id?'page':undefined} onClick={()=>window.scrollTo(0,0)}><span><Icon size={22} strokeWidth={1.8} aria-hidden="true"/></span><strong>{label}</strong></a>)}</nav>;
}
