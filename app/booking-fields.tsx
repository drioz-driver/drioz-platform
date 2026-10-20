'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import MapsAddresses from './maps-address';
export const packageHours=[2,4,6,8,12];
export const outstationHours=[12,24,36,48,60,72];
function Field({title,children}:{title:string;children:ReactNode}){return <label className="field"><span>{title}</span>{children}</label>}
export default function BookingFields({cities,city,setCity,type,setType,onLocationChange,initial}:{initial?:Record<string,string>;cities:any[];city:string;setCity:(s:string)=>void;type:string;setType:(s:string)=>void;onLocationChange?:()=>void}){
 const scheduleFields=useRef<HTMLDivElement>(null);
 const focusSchedule=useRef(false);
 const [timing,setTiming]=useState(initial?.timing||'now');const scheduled=type==='outstation'||timing==='schedule';
 useEffect(()=>{if(!scheduled||!focusSchedule.current)return;focusSchedule.current=false;requestAnimationFrame(()=>{scheduleFields.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});scheduleFields.current?.querySelector('input')?.focus({preventScroll:true})})},[scheduled]);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return <><div className="booking-journey"><div className="booking-trip-tabs" aria-label="Journey type">{[['one-way','One Way'],['return','Round Trip'],['outstation','Outstation']].map(([value,title])=><button type="button" key={value} aria-pressed={type===value} className={type===value?'active':''} onClick={()=>setType(value)}>{title}</button>)}</div><input type="hidden" name="tripType" value={type}/><input type="hidden" name="cityId" value={city}/><MapsAddresses initial={initial} city={city} roundTrip={type==='return'} onLocationChange={onLocationChange}/>
 {type!=='outstation'&&<Field title="When is driver needed?"><select name="timing" value={timing} onChange={e=>{focusSchedule.current=e.target.value==='schedule';setTiming(e.target.value)}}><option value="now">Now</option><option value="schedule">Schedule for later</option></select></Field>}
 {type==='return'&&<Field title="Select Package"><select name="hours" key="return-package" defaultValue={initial?.hours||""} required><option value="" disabled>Package Hours</option>{packageHours.map(n=><option value={n} key={n}>{n} Hours</option>)}</select></Field>}
 {type==='outstation'&&<div className="fields"><Field title="Trip type"><select name="outstationDirection" defaultValue={initial?.outstationDirection||"return"}><option value="return">Round Trip</option><option value="one-way">One Way</option></select></Field><Field title="Estimated usage"><select name="hours" key="outstation-usage" defaultValue={initial?.hours||12} required>{outstationHours.map(n=><option key={n} value={n}>{n} Hrs</option>)}</select></Field></div>}
 {scheduled&&<div ref={scheduleFields} className="fields booking-schedule-fields"><Field title="Pickup date · IST"><input name="pickupDate" type="date" min={today} defaultValue={initial?.pickupDate} required/></Field><Field title="Pickup time · IST"><input name="pickupTime" type="time" defaultValue={initial?.pickupTime} required/></Field></div>}
 </div><div className="fields booking-car-options"><Field title="Transmission"><select name="transmission" defaultValue={initial?.transmission||"manual"}><option value="manual">Manual</option><option value="automatic">Automatic</option></select></Field><Field title="Car type"><select name="vehicleCategory" defaultValue={initial?.vehicleCategory||"hatchback"}><option value="hatchback">Hatchback</option><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="luxury">Luxury</option></select></Field></div></>;
}
