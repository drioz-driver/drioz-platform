'use client';
import {ArrowRight,Bell,BellOff,Car,CheckCheck,KeyRound,LifeBuoy,LogOut,MapPin,MessageSquare,ShieldCheck,Siren,Trash2,Wallet} from 'lucide-react';
import DriverPhotoUpload from './driver-photo-upload';
import {useState} from 'react';
import {Badge,Callout,Empty,Field,Form} from './primitives';
import {ago,api,errorMessage,label,ref,when} from './client';
import {sessionFetch} from '@/lib/browser-api';

export function SupportView({data,me,act,openTicket}:{data:any;me:any;act:(p:string,d:unknown)=>Promise<any>;openTicket:(id:string)=>void}){
 const staff=['admin','support','operator'].includes(me.role);
 const tickets=data.tickets;const open=tickets.filter((t:any)=>t.status==='open');
 return <div className="two-col">
  <section className="panel"><h2>Start a conversation</h2><p>Our team replies here and in your inbox. Include your trip reference for faster help.</p>
   <Callout icon={Siren}>Safety emergency? This inbox is not monitored around the clock. Contact local emergency services (112 in India) if you are in immediate danger.</Callout>
   <Form reset button={<>Send to support <ArrowRight size={16}/></>} onSubmit={async f=>{const r=await act('tickets',{bookingId:f.get('bookingId')||null,category:f.get('category'),subject:f.get('subject'),message:f.get('message')});return {...r,message:'Ticket created. We will reply shortly.'}}}>
    <div className="fields"><Field title="Related journey"><select name="bookingId"><option value="">General enquiry</option>{data.bookings.map((b:any)=><option key={b.id} value={b.id}>DR-{ref(b.id)} · {String(b.pickup).slice(0,28)}</option>)}</select></Field><Field title="Category"><select name="category">{['booking','payment','safety','account'].map(c=><option key={c} value={c}>{label(c)}</option>)}</select></Field></div>
    <Field title="Subject"><input name="subject" minLength={5} maxLength={150} required placeholder="Briefly describe the issue"/></Field>
    <Field title="How can we help?"><textarea name="message" minLength={10} maxLength={3000} required placeholder="Share as much detail as you can"/></Field>
   </Form>
  </section>
  <section className="panel"><div className="section-heading"><h2>{staff?'Support queue':'Your tickets'}</h2><span>{open.length} OPEN</span></div>
   {tickets.length?tickets.map((t:any)=><button className="ticket-row" key={t.id} onClick={()=>openTicket(t.id)}><span className="row" style={{flexWrap:'nowrap'}}><span className="tile-icon"><MessageSquare size={17}/></span><span style={{display:'flex',flexDirection:'column',minWidth:0}}><strong>{t.subject}</strong><small>{staff?t.name+' · ':''}{label(t.category)} · {ago(t.created_at)}</small></span></span><Badge value={t.status}/></button>):<Empty icon={LifeBuoy} title="All clear." text="Your support conversations will appear here."/>}
  </section>
 </div>;
}

export function TicketThread({ticket,me,act,reload}:{ticket:any;me:any;act:(p:string,d:unknown)=>Promise<any>;reload:()=>Promise<void>}){
 const staff=['admin','support','operator'].includes(me.role);
 return <><h2>{ticket.ticket.subject}</h2><div className="row" style={{marginBottom:12}}><Badge value={ticket.ticket.status}/><small className="muted">{label(ticket.ticket.category)} · opened {when(ticket.ticket.created_at)}</small></div>
  {ticket.messages.map((m:any)=><div className={'message'+(m.user_id===me.id?' mine':'')} key={m.id}><strong>{m.user_id===me.id?'You':m.name}</strong><p>{m.message}</p><small>{when(m.created_at)}</small></div>)}
  <Form reset button="Send reply" onSubmit={async f=>{await act('tickets/'+ticket.ticket.id,{message:f.get('message'),...(staff?{status:f.get('status')}:{})});await reload();return {message:'Reply sent.'}}}><Field title="Reply"><textarea name="message" maxLength={3000} required/></Field>{staff&&<Field title="Ticket status"><select name="status" defaultValue={ticket.ticket.status}><option value="open">Open</option><option value="resolved">Resolved</option></select></Field>}</Form>
 </>;
}

export function InboxView({data,click}:{data:any;click:(p:string,d:unknown)=>Promise<void>}){
 const unread=data.notifications.filter((n:any)=>!n.read).length;
 return <section className="panel"><div className="section-heading"><h2>Notifications</h2><button className="sm" disabled={!unread} onClick={()=>click('notifications/read',{})}><CheckCheck size={15}/>Mark all read</button></div>
  {data.notifications.length?data.notifications.map((n:any)=><div className={'notification '+(!n.read?'unread':'')} key={n.id}><span className={'tile-icon'+(!n.read?' brand':'')}><Bell size={17}/></span><div><p>{n.message}</p><small>{ago(n.created_at)} · {when(n.created_at)}</small></div></div>):<Empty icon={BellOff} title="You’re up to date." text="Trip and support updates will appear here."/>}
 </section>;
}

export function AccountView({me,portal,documents=[],places=[],act,onError}:{documents?:any[];me:any;portal:'customer'|'partner';places?:any[];act:(p:string,d:unknown)=>Promise<any>;onError:(m:string)=>void}){
 const partner=portal==='partner';const [confirmText,setConfirm]=useState('');
 async function signOut(){try{const r=await sessionFetch('/api/auth/signout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});if(!r.ok)throw Error('Unable to sign out. Try again.');location.assign(partner?'/partner/login':'/login')}catch(e){onError(errorMessage(e))}}
 async function remove(){try{await act('account/delete',{confirm:'DELETE'});await signOut()}catch{}}
 return <div className="two-col">
  <div className="stack">
   {partner&&<DriverPhotoUpload documents={documents} act={act}/>}
   <section className="panel"><div className="row" style={{gap:18,marginBottom:20}}><span className="avatar lg">{String(me.name||'?').slice(0,2).toUpperCase()}</span><div><h2 style={{fontSize:22}}>{me.name}</h2><p className="muted">{me.email.endsWith('@phone.drioz.invalid')?me.phone:me.email}</p><div style={{marginTop:8}}><Badge value={me.role} tone="good"/></div></div></div>
    <Form button="Save profile" buttonClass="primary sm" onSubmit={f=>act('account/profile',{name:String(f.get('name')||'').trim(),...(String(f.get('phone')||'').trim()?{phone:String(f.get('phone')).replace(/[\s()-]/g,'')}:{})})}>
     <div className="fields"><Field title="Full name"><input name="name" defaultValue={me.name} minLength={2} maxLength={80} required/></Field><Field title="Mobile for trip SMS"><input name="phone" type="tel" defaultValue={me.phone||''} placeholder="+91 98765 43210" pattern="\+?[0-9\s()-]{10,20}"/></Field></div>
    </Form>
    <div className="list" style={{marginTop:18}}>
     {!partner&&<div className="list-item"><span className="tile-icon brand"><Wallet size={17}/></span><div className="grow"><strong>Wallet & payments</strong><small>Add money, pay for trips online, see receipts</small></div><a className="button sm btn" href="/wallet">Open</a></div>}
     {partner&&<div className="list-item"><span className="tile-icon brand"><Wallet size={17}/></span><div className="grow"><strong>Driver wallet & bank</strong><small>Recharge, DRIOZ500 credit, earnings and transfers</small></div><a className="button sm btn" href="/wallet">Open</a></div>}
     <div className="list-item"><span className="tile-icon"><KeyRound size={17}/></span><div className="grow"><strong>Password</strong><small>Send a secure reset link to your email</small></div><a className="button sm btn" href="/forgot-password">Reset</a></div>
     <div className="list-item"><span className="tile-icon"><LogOut size={17}/></span><div className="grow"><strong>Sign out</strong><small>End this session on this device</small></div><button className="sm" onClick={signOut}>Sign out</button></div>
    </div>
   </section>
   {!partner&&<section className="panel"><h2>Saved places</h2><p className="helper" style={{marginBottom:12}}>Save pickup and drop points from your past trips to find them quickly. Up to 10.</p>
    {places.length?places.map((p:any)=><div className="place-row" key={p.id}><span className="tile-icon"><MapPin size={16}/></span><div className="grow"><strong>{p.label}</strong><small>{p.address}</small></div><button className="sm subtle" aria-label={`Remove ${p.label}`} onClick={()=>act(`places/${p.id}/delete`,{}).catch(()=>{})}><Trash2 size={15}/></button></div>):<p className="helper">No saved places yet. Use “Save place” on a completed trip.</p>}
   </section>}
  </div>
  <div className="stack">
   <section className="panel"><span className="tile-icon brand" style={{marginBottom:14}}>{partner?<Car size={18}/>:<ShieldCheck size={18}/>}</span>
    <h2>Privacy{partner?' & location':''}</h2>
    <p className="helper">{partner?'Your documents are private to you and authorised operations staff. Your device location is shared only after you opt in, while you are online or on an active trip, and you can stop at any time.':'Your trips, payments and support conversations are private to you and authorised DRIOZ staff. Share links you create expire after 24 hours.'}</p>
    <p className="helper" style={{marginTop:10}}><a href="/privacy">Privacy policy</a> · <a href="/terms">Terms of service</a></p>
   </section>
   {me.role!=='admin'&&<section className="panel danger-zone"><h2>Delete account</h2><p className="helper">Your name, email and phone are removed and you are signed out. Trip, payment and tax records are kept anonymously as the law requires. This cannot be undone and is not possible during an active trip.</p>
    <Field title="Type DELETE to confirm"><input value={confirmText} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/></Field>
    <button className="danger" disabled={confirmText!=='DELETE'} onClick={remove}><Trash2 size={15}/>Delete my account</button>
   </section>}
  </div>
 </div>;
}

export async function loadTicket(id:string){return api('tickets/'+id)}
