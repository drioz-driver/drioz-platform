'use client';
import {useEffect,useState} from 'react';
import Logo from '../logo';
const steps=['requested','assigned','arrived','in_progress','completed'];
const names:Record<string,string>={requested:'Requested',assigned:'Driver assigned',arrived:'Driver arrived',in_progress:'On the way',completed:'Completed',cancelled:'Cancelled'};
export default function SharedStatus(){
 const [trip,T]=useState<any>(null),[message,M]=useState('Loading shared journey…');
 useEffect(()=>{let active=true;const token=new URLSearchParams(location.search).get('token')||'';const load=()=>fetch('/api/ops/share?token='+encodeURIComponent(token),{cache:'no-store'}).then(async r=>{const body:any=await r.json().catch(()=>({}));if(!r.ok)throw Error(body.message||'This link is unavailable.');if(active)T(body)}).catch(e=>{if(active)M(e.message)});load();const i=setInterval(load,20000);return()=>{active=false;clearInterval(i)}},[]);
 const at=trip?steps.indexOf(trip.status):-1;
 return <main className="loading"><Logo className="loading-logo"/><div className="card" style={{alignItems:'stretch',textAlign:'left'}}>
  <span className="badge" style={{alignSelf:'flex-start'}}>Shared journey</span>
  <h1 style={{fontSize:30}}>{trip?names[trip.status]||trip.status:'Journey status'}</h1>
  {trip?<><p>Trip {trip.id.slice(0,8).toUpperCase()} · {String(trip.city_id).replace(/-/g,' ')}</p>
   {trip.status!=='cancelled'&&<ol style={{listStyle:'none',padding:0,margin:'8px 0',display:'grid',gap:10}}>{steps.map((s,i)=><li key={s} style={{display:'flex',gap:12,alignItems:'center',color:i<=at?'#fff':'#5f7a70'}}><span style={{width:12,height:12,borderRadius:'50%',background:i<=at?'var(--brand)':'#1d342c',boxShadow:i===at?'0 0 0 5px rgba(0,230,153,.18)':'none'}}/>{names[s]}</li>)}</ol>}
   <p style={{fontSize:13}}>Last updated {new Date(trip.updated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST · refreshes automatically</p></>:<p role="status">{message}</p>}
  <a className="primary" href="/">Open DRIOZ</a>
 </div></main>;
}
