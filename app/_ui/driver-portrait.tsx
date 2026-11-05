 'use client';
import {useEffect,useState} from 'react';
import {api,initials} from './client';
export default function DriverPortrait({bookingId,name}:{bookingId:string;name:string}){
 const [url,setUrl]=useState<string|null>(null);
 useEffect(()=>{let active=true;const load=()=>api(`bookings/${bookingId}/driver-photo`).then(r=>{if(active)setUrl(r.url||null)}).catch(()=>{});load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer)}},[bookingId,name]);
 return <div style={{display:'flex',alignItems:'center',gap:10,margin:'12px 0'}}><span className="avatar" style={{width:52,height:52,flexShrink:0,overflow:'hidden'}}>{url?<img src={url} alt={name} onError={()=>setUrl(null)} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>:initials(name)}</span><span><small className="muted">Your driver</small><strong style={{display:'block'}}>{name}</strong></span></div>;
}
