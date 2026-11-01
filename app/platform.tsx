'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Bell,Car,CircleAlert,CircleCheck,Copy,ExternalLink,Gauge,LayoutDashboard,LifeBuoy,Printer,RefreshCw,UserRound,X,type LucideIcon} from 'lucide-react';
import Logo from './logo';
import {maps} from './maps-address';
import {allowedWorkspace,customerViews,homePortal,partnerViews,type Portal} from '@/lib/workspace-access';
import {api,errorMessage,fmt,initials,label,when} from './_ui/client';
import {Badge,Modal} from './_ui/primitives';
import type {TripActions} from './_ui/trip-card';
import CustomerView from './_ui/customer-view';
import DriverView from './_ui/driver-view';
import AdminView from './_ui/admin-view';
import {AccountView,InboxView,SupportView,TicketThread} from './_ui/other-views';
import {SteeringLoader} from './_ui/steering';
import OfferPopup,{type Offer} from './_ui/offer-popup';
import {InvoiceView} from './_ui/customer-trip';

type Toast={id:number;text:string;tone:'ok'|'error'};
const tabs=['partners','documents','bookings','map','analytics','pricing','companies','incentives','onboarding','trips','earnings','planner','cities','finance','team','audit','integrations'];
const headings:Record<string,[string,string,string]>={
 driver:['Drive','Your next opportunity.','Go online, accept ride offers and track your earnings.'],
 admin:['Operations','A clear view of your city.','People, journeys and money — connected in one place.'],
 support:['Support','We’re here to help.','Questions about a trip, a payment or your account.'],
 notifications:['Inbox','Your latest updates.','Trip, onboarding and support activity.'],
 account:['Account','Your account.','Profile, security and sign-in options.'],
};

function PointMap({lat,lng}:{lat:number;lng:number}){
 const el=useRef<HTMLDivElement>(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;maps().then(g=>{if(!active||!el.current)return;const center={lat,lng};const map=new g.Map(el.current,{center,zoom:15,disableDefaultUI:true,zoomControl:true});new g.Marker({map,position:center})}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[lat,lng]);
 return failed?null:<div ref={el} className="map-frame" style={{height:240,margin:'12px 0'}} aria-label="Map of last reported location"/>;
}

export default function Platform({portal='customer'}:{portal?:Portal}){
 const partnerPortal=portal==='partner',home=partnerPortal?'driver':'customer',views=partnerPortal?partnerViews:customerViews,base=partnerPortal?'/partner':'/';
 const [data,setData]=useState<any>(null),[requestedView,setView]=useState(home),[section,setSection]=useState('overview');
 const [loading,setLoading]=useState(true),[fatal,setFatal]=useState(''),[busy,setBusy]=useState(false),[toasts,setToasts]=useState<Toast[]>([]);
 const [codes,setCodes]=useState<Record<string,string>>({}),[detail,setDetail]=useState<any>(null),[ticket,setTicket]=useState<any>(null);
 const [gps,setGps]=useState(false),[position,setPosition]=useState<{lat:number;lng:number;accuracy:number;at:number}|null>(null);
 const watch=useRef<number|null>(null),lastLocation=useRef(0),toastId=useRef(0);
 const view=allowedWorkspace(requestedView,data?.me?.role||'customer',!!data?.driver,portal);

 const toast=useCallback((text:string,tone:'ok'|'error'='ok')=>{const id=++toastId.current;setToasts(t=>[...t.slice(-2),{id,text,tone}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),tone==='error'?7000:4200)},[]);
 const refresh=useCallback(async()=>{const r=await api('snapshot');setData(r);return r},[]);

 useEffect(()=>{if(data&&requestedView!==view){setView(view);history.replaceState(null,'','#'+view)}},[data,requestedView,view]);
 useEffect(()=>{
  let active=true;
  const fromHash=()=>{const [h,tab]=location.hash.slice(1).split('/');setView(views.includes(h)?h:home);setSection(tabs.includes(tab)?tab:'overview')};
  fromHash();window.addEventListener('hashchange',fromHash);
  refresh().then(r=>{if(active&&!partnerPortal&&homePortal(r.me.role)==='partner')location.replace('/partner')}).catch(e=>{if(active)setFatal(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});
  const expired=()=>{setData(null);setFatal('Your session has ended. Sign in again to continue.')};window.addEventListener('drioz-session-expired',expired);
  // Poll a tiny change marker; download the full snapshot only when something changed (or every 60 s as a safety net).
  let pulse='',fullAt=0,busy=false;
  const sync=async(force=false)=>{if(document.hidden||busy)return;busy=true;try{
   // Read the marker before the snapshot so a change landing in between is caught on the next tick.
   const p=await api('pulse');if(!force&&pulse&&p.v===pulse&&Date.now()-fullAt<60000)return;
   await refresh();pulse=p.v;fullAt=Date.now()}catch{}finally{busy=false}};
  const interval=setInterval(()=>{sync()},10000);
  const visible=()=>{sync(true)};document.addEventListener('visibilitychange',visible);
  return()=>{active=false;clearInterval(interval);window.removeEventListener('drioz-session-expired',expired);window.removeEventListener('hashchange',fromHash);document.removeEventListener('visibilitychange',visible);if(watch.current!==null)navigator.geolocation.clearWatch(watch.current)};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[refresh]);
 // Ride offers: one exclusive 10-second offer per partner (lib/ride-offers.ts). Polling every 2 s is also the
 // partner's presence heartbeat — only partners who polled in the last 15 s are offered rides.
 const [offer,setOffer]=useState<Offer|null>(null),[skew,setSkew]=useState(0);const handledOffers=useRef(new Set<string>()),seenBookings=useRef(new Set<string>());
 const considerOffer=useCallback((raw:any,server?:number)=>{if(server)setSkew(server-Date.now());if(!raw||handledOffers.current.has(raw.offer_id))return;
  const o:Offer={id:raw.offer_id,bookingId:raw.id,round:seenBookings.current.has(raw.id)?2:1,expiresAt:Number(raw.expires_at),seconds:Number(raw.seconds||Math.round((raw.expires_at-raw.offered_at)/1000)||10),pickup:raw.pickup,destination:raw.destination,tripType:raw.trip_type,transmission:raw.transmission,scheduledAt:raw.scheduled_at?Number(raw.scheduled_at):null,partnerFare:Number(raw.partner_fare),hours:raw.hours??null,vehicleCategory:raw.vehicleCategory??null,pickupDistanceKm:raw.pickupDistanceKm??null};
  setOffer(c=>c?.id===o.id?c:(c&&c.expiresAt>Date.now()+(server?server-Date.now():0)?c:o))},[]);
 const activeTrip=!!data?.bookings?.some((b:any)=>b.driver_id===data.me.id&&['assigned','arrived','in_progress'].includes(b.status));
 const pollOffers=partnerPortal&&data?.driver?.verification==='approved'&&!!data?.driver?.online&&!activeTrip;
 useEffect(()=>{if(!pollOffers)return;let active=true,pending=false;const poll=()=>{if(document.hidden||pending)return;pending=true;api('driver/offers').then(r=>{if(active)considerOffer(r.offers?.[0]||null,r.serverNow)}).catch(()=>{}).finally(()=>{pending=false})};poll();const timer=setInterval(poll,2000);window.addEventListener('focus',poll);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',poll)}},[pollOffers,considerOffer]);
 // Stop GPS automatically once a partner is offline with no active trip.
 useEffect(()=>{if(!data)return;const mine=data.bookings.some((b:any)=>b.driver_id===data.me.id&&['assigned','arrived','in_progress'].includes(b.status));if(!mine&&!data.driver?.online&&watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;setGps(false)}},[data]);

 function go(v:string,s='overview'){history.pushState(null,'','#'+(s==='overview'?v:v+'/'+s));setView(v);setSection(s);setDetail(null);setTicket(null);window.scrollTo({top:0})}
 function pickSection(s:string){history.pushState(null,'','#'+(s==='overview'?view:view+'/'+s));setSection(s)}
 async function act(path:string,payload:unknown){setBusy(true);try{const result=await api(path,payload);await refresh();toast(result?.message||(result?.requiresLocationReview?'Request received. Operations will verify your addresses before assigning a driver.':'Updated successfully.'));return result}catch(e){toast(errorMessage(e,'Request failed'),'error');throw e}finally{setBusy(false)}}
 async function click(path:string,payload:unknown){try{await act(path,payload)}catch{}}
 function shareGps(){
  if(!navigator.geolocation){toast('Location is unavailable on this device','error');return}
  if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;setGps(false);return}
  lastLocation.current=0;
  watch.current=navigator.geolocation.watchPosition(pos=>{setPosition({lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,at:pos.timestamp});if(Date.now()-lastLocation.current<15000)return;lastLocation.current=Date.now();api('driver/location',{lat:pos.coords.latitude,lng:pos.coords.longitude}).catch(e=>toast(errorMessage(e),'error'))},e=>{toast(e.message||'Location permission denied','error');if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);watch.current=null;setGps(false)},{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
  setGps(true);
 }
 async function openTicket(id:string){try{setTicket(await api('tickets/'+id))}catch(e){toast(errorMessage(e),'error')}}

 if(loading)return <main className="loading"><Logo className="loading-logo"/>{partnerPortal&&<span className="portal-tag">PARTNER</span>}<SteeringLoader dark label="Connecting your workspace…"/></main>;
 if(!data)return <main className="loading"><Logo className="loading-logo"/><div className="card"><span className="badge">Secure access</span><h1 style={{fontSize:30}}>{partnerPortal?'Your wheel. Your hours.':'Your car. Your time.'}</h1><p>{fatal||(partnerPortal?'Sign in to go online, accept rides and track your earnings.':'Sign in to book a driver.')}</p><a className="primary" href={partnerPortal?'/partner/login':'/login'}>{partnerPortal?'Sign in to DRIOZ Partner':'Sign in to DRIOZ'}</a><a href={partnerPortal?'/partner/signup':'/signup'} style={{fontSize:14}}>{partnerPortal?'New partner? Apply to drive':'New here? Create an account'}</a></div></main>;

 const {me,cities,driver,drivers,notifications}=data;
 const admin=['admin','operator','finance','support'].includes(me.role);
 const pendingCount=data.pendingDriverReviews??drivers.filter((d:any)=>d.verification==='pending').length;
 const unread=notifications.filter((n:any)=>!n.read).length;
 const cityName=(id:string)=>cities.find((c:any)=>c.id===id)?.name||id;
 const nav:[string,string,LucideIcon,number?][]=partnerPortal?[['driver','Drive',Gauge],['support','Support',LifeBuoy],['notifications','Inbox',Bell,unread]]:[['customer','Book a driver',Car],...(admin?[['admin','Operations',LayoutDashboard,pendingCount] as [string,string,LucideIcon,number]]:[]),['support','Support',LifeBuoy],['notifications','Inbox',Bell,unread]];
 // Staff can hop between the two portals to check both workflows; customers and drivers never see these links.
 const staffLinks:[string,string][]=['admin','operator'].includes(me.role)?(partnerPortal?[['/#admin','Operations'],['/','Customer site']]:[['/partner','Partner portal']]):[];
 const mobileNav=(()=>{const all=[...nav,['account','Account',UserRound] as [string,string,LucideIcon,number?]];return all.length>5?all.filter(([v])=>v!=='support'):all})();
 const sectionTabs=view==='admin'?(me.role==='admin'?['overview','bookings','map','partners','documents','analytics','cities','pricing','companies','incentives','finance','team','audit','integrations']:me.role==='operator'?['overview','bookings','map','partners','documents','analytics']:me.role==='finance'?['overview','analytics','finance','incentives']:['overview']):view==='driver'?['overview','trips','earnings','planner','onboarding']:[];
 const activeSection=sectionTabs.length&&!sectionTabs.includes(section)?'overview':section;
 const t=(b:any):TripActions=>({busy,act,click,cityName,drivers,code:codes[b.id],onCode:code=>setCodes(x=>({...x,[b.id]:code})),
  onStatement:async()=>{try{setDetail({statement:await api(`bookings/${b.id}/invoice`)})}catch(e){toast(errorMessage(e),'error')}},
  onLocation:async()=>{try{const r=await api(`bookings/${b.id}/location`);setDetail({location:r.location,trip:b.id})}catch(e){toast(errorMessage(e),'error')}},
  onShare:async()=>{try{const r=await act(`bookings/${b.id}/share`,{});setDetail({shareUrl:location.origin+r.path})}catch{}}});
 const onBook=async(input:any,total:number,key:string,billTo:'personal'|'company'='personal')=>{const quote=await api('quote',input);if(quote.total!==total)throw Error('The fare has changed. Refresh the estimate before requesting a driver.');await act('bookings',{quoteId:quote.id,key,...(billTo==='company'?{billTo}:{})});setTimeout(()=>document.getElementById('journeys')?.scrollIntoView({behavior:'smooth'}),150)};

 const overlays=<>
  <div className="toast-stack" aria-live="polite">{toasts.map(x=><div key={x.id} role={x.tone==='error'?'alert':'status'} className={'alert '+x.tone}><span>{x.tone==='error'?<CircleAlert size={18}/>:<CircleCheck size={18} color="var(--brand-strong)"/>}{x.text}</span><button aria-label="Dismiss" onClick={()=>setToasts(t=>t.filter(y=>y.id!==x.id))}><X size={15}/></button></div>)}</div>
  {detail?.statement&&<InvoiceView inv={detail.statement} onClose={()=>setDetail(null)}/>}
  {detail&&!detail.statement&&<Modal title="Trip details" onClose={()=>setDetail(null)}>{detail.shareUrl?<><h2>Share trip status</h2><p>This private link expires in 24 hours and shows journey status only.</p><input readOnly value={detail.shareUrl} onFocus={e=>e.currentTarget.select()}/><button className="primary block" onClick={()=>navigator.clipboard?.writeText(detail.shareUrl).then(()=>toast('Link copied.')).catch(()=>toast('Select and copy the link manually.','error'))}><Copy size={16}/>Copy link</button></>
   :detail.trip?<><h2>Driver location</h2>{detail.location?<><p>Last reported {when(detail.location.location_at)}</p><PointMap lat={detail.location.lat} lng={detail.location.lng}/><a className="button btn block" href={`https://www.google.com/maps/search/?api=1&query=${detail.location.lat},${detail.location.lng}`} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Open in Google Maps</a></>:<p>No recent location shared yet. Positions older than two minutes are hidden for privacy.</p>}</>
   :<><h2>Fare statement</h2><p>{detail.statement.pickup} → {detail.statement.destination}</p><Badge value={detail.statement.status}/><div className="statement">{Object.entries(detail.statement.breakdown).filter(([k,v])=>['base','extra','night','tax','total'].includes(k)&&(k==='base'||k==='total'||Number(v)>0)).map(([k,v])=><div className="ledger-row" key={k}><span>{k==='base'?'Service fare':k==='extra'?'Additional hours':k==='night'?'Night charge':k==='tax'?'Tax':'Total'}</span><strong>{fmt(Number(v))}</strong></div>)}</div>{detail.statement.payments?.length>0&&<p className="helper">Payments recorded: {detail.statement.payments.map((p:any)=>`${fmt(p.amount)} ${label(p.status)} (${label(p.method)})`).join(', ')}</p>}<p className="helper">Reference {detail.statement.reference} · {detail.statement.note}</p><button className="block" onClick={()=>window.print()}><Printer size={16}/>Print statement</button></>}</Modal>}
  {offer&&<OfferPopup key={offer.id} offer={offer} skew={skew}
   onAccept={async o=>{await api(`bookings/${o.bookingId}/assign`,{driverId:me.id,offerId:o.id});await refresh().catch(()=>{});toast('Ride accepted. Head to the pickup point.')}}
   onDecline={async o=>{await api('driver/offers/pass',{offerId:o.id});toast('Ride passed to the next driver.')}}
   onMissed={()=>toast('You missed that ride. If nobody else takes it, it will come back to you.','error')}
   onDone={()=>{setOffer(c=>{if(c){handledOffers.current.add(c.id);seenBookings.current.add(c.bookingId)}return null})}}/>}
  {ticket&&<Modal title="Support conversation" onClose={()=>setTicket(null)}><TicketThread ticket={ticket} me={me} act={act} reload={async()=>{setTicket(await api('tickets/'+ticket.ticket.id))}}/></Modal>}
 </>;

 if(view==='customer')return <div className="site">
  <header className="site-header"><a href="/" aria-label="DRIOZ home"><Logo/></a>
   <nav aria-label="Workspaces">{nav.map(([v,text,Icon,count])=><button className={view===v?'selected':''} key={v} onClick={()=>go(v)}><Icon/>{text}{!!count&&<i/>}</button>)}</nav>
   <button className="identity ghost" style={{color:'#fff'}} onClick={()=>go('account')}><span className="avatar" style={{width:34,height:34,fontSize:12}}>{initials(me.name)}</span><span style={{textAlign:'left'}}>{me.name}<small>{label(me.role)}</small></span></button>
  </header>
  <CustomerView data={data} me={me} t={t} onBook={onBook} refresh={()=>refresh().catch(e=>toast(errorMessage(e),'error'))}/>
  <footer className="site-footer"><div className="cols"><div><Logo className="footer-logo"/><p style={{marginTop:14,maxWidth:320}}>A verified personal driver for your own car — whenever, wherever you need one.</p></div><div><h4>Ride</h4><ul><li><a href="#book">One way</a></li><li><a href="#book">Round trip</a></li><li><a href="#book">Outstation</a></li></ul></div><div><h4>Help</h4><ul><li><button className="link" style={{color:'inherit',fontWeight:400}} onClick={()=>go('support')}>Support</button></li><li><button className="link" style={{color:'inherit',fontWeight:400}} onClick={()=>go('notifications')}>Inbox</button></li></ul></div><div><h4>Account</h4><ul><li><button className="link" style={{color:'inherit',fontWeight:400}} onClick={()=>go('account')}>Profile</button></li><li><a href="/forgot-password">Reset password</a></li></ul></div></div><div className="base"><span>© {new Date().getFullYear()} DRIOZ. All times shown in IST.</span><span>Fares exclude tolls, parking and permits.</span></div></footer>
  <nav className="mobile-nav" aria-label="Workspaces">{mobileNav.map(([v,text,Icon,count])=><button key={v} className={view===v?'selected':''} onClick={()=>go(v)}><Icon size={20}/>{text.split(' ')[0]}{!!count&&<i/>}</button>)}</nav>
  {overlays}
 </div>;

 const [eyebrow,title,sub]=headings[view]||headings.account;
 return <div className="app-shell">
  <aside className={'sidebar'+(partnerPortal?' partner':'')}><a className="wordmark" href={base} aria-label="DRIOZ home"><Logo/>{partnerPortal&&<span className="portal-tag">PARTNER</span>}</a>
   <span className="sidebar-label">{partnerPortal?'Partner':'Workspace'}</span>
   {nav.map(([v,text,Icon,count])=><button className={'nav-item'+(view===v?' selected':'')} key={v} onClick={()=>go(v)}><Icon/>{text}{!!count&&<span className="count">{count}</span>}</button>)}
   <button className={'nav-item'+(view==='account'?' selected':'')} onClick={()=>go('account')}><UserRound/>Account</button>
   {staffLinks.length>0&&<><span className="sidebar-label">Staff</span>{staffLinks.map(([href,text])=><a key={href} className="nav-item btn" href={href}><ArrowUpRight/>{text}</a>)}</>}
   <div className="sidebar-foot">{admin&&<div className="pilot-pill"><span className="dot pulse"/><span>{data.integrations?.payments?.startsWith('Razorpay')?'Live · Razorpay & wallet connected':'Private pilot · payments recorded manually'}</span></div>}<button className="user-chip ghost" style={{border:0,justifyContent:'flex-start',width:'100%',minHeight:0}} onClick={()=>go('account')}><span className="avatar">{initials(me.name)}</span><span style={{textAlign:'left'}}><strong>{me.name}</strong><small>{label(me.role)}</small></span></button></div>
  </aside>
  <div className="main">
   <header className="topbar"><div className="crumbs"><span className="mobile-only"><Logo tone="dark"/></span>{partnerPortal&&<span className="portal-tag mobile-only" style={{color:'var(--brand-deep)'}}>PARTNER</span>}<span>{partnerPortal?'DRIOZ Partner':'DRIOZ'}</span><span>/</span><strong>{eyebrow}</strong>{sectionTabs.length>0&&activeSection!=='overview'&&<><span>/</span><strong style={{textTransform:'capitalize'}}>{label(activeSection)}</strong></>}</div>
    <div className="topbar-actions">
     {view==='driver'&&driver?.verification==='approved'&&<button disabled={busy} className={'availability'+(driver.online?' on':'')} onClick={()=>click('driver/availability',{online:!driver.online})} aria-pressed={!!driver.online}><span className="switch"/>{driver.online?'Online':'Offline'}</button>}
     <button className="icon-btn" aria-label="Refresh" onClick={()=>refresh().then(()=>toast('Up to date.')).catch(e=>toast(errorMessage(e),'error'))}><RefreshCw size={17}/></button>
     <button className="icon-btn" aria-label="Inbox" onClick={()=>go('notifications')}><Bell size={17}/>{unread>0&&<i/>}</button>
    </div>
   </header>
   <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{sub}</p></div></div>
    {sectionTabs.length>1&&<div className="section-tabs" role="tablist">{sectionTabs.map(s=><button role="tab" aria-selected={activeSection===s} className={activeSection===s?'selected':''} onClick={()=>pickSection(s)} key={s}>{label(s)}{s==='partners'&&pendingCount>0&&<span className="review-count">{pendingCount}</span>}</button>)}</div>}
    {view==='driver'&&<DriverView data={data} me={me} section={activeSection} setSection={pickSection} t={t} gps={gps} position={position} shareGps={shareGps}/>}
    {view==='admin'&&<AdminView data={data} me={me} section={activeSection} setSection={pickSection} goSupport={()=>go('support')} t={t}/>}
    {view==='support'&&<SupportView data={data} me={me} act={act} openTicket={openTicket}/>}
    {view==='notifications'&&<InboxView data={data} click={click}/>}
    {view==='account'&&<AccountView me={me} portal={portal} places={data.places||[]} act={act} onError={m=>toast(m,'error')}/>}
   </main>
  </div>
  <nav className="mobile-nav" aria-label="Workspaces">{mobileNav.map(([v,text,Icon,count])=><button key={v} className={view===v?'selected':''} onClick={()=>go(v)}><Icon size={20}/>{text.split(' ')[0]}{!!count&&<i/>}</button>)}</nav>
  {overlays}
 </div>;
}
