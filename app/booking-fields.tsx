'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import MapsAddresses from './maps-address';
import ScheduleWheel from './schedule-wheel';
export const packageHours=[2,4,6,8,12];
export const outstationHours=[12,24,36,48,60,72];
function Field({title,children}:{title:string;children:ReactNode}){return <label className="field"><span>{title}</span>{children}</label>}
export default function BookingFields({cities,city,setCity,type,setType,onLocationChange,initial}:{initial?:Record<string,string>;cities:any[];city:string;setCity:(s:string)=>void;type:string;setType:(s:string)=>void;onLocationChange?:()=>void}){
 const scheduleFields=useRef<HTMLDivElement>(null);
 const focusSchedule=useRef(false);
 const [timing,setTiming]=useState(initial?.timing||'now');const scheduled=type==='outstation'||timing==='schedule';
 useEffect(()=>{if(!scheduled||!focusSchedule.current)return;focusSchedule.current=false;requestAnimationFrame(()=>{scheduleFields.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});})},[scheduled]);
 return <><div className="booking-journey"><div className="booking-trip-tabs" aria-label="Journey type">{[['one-way','One Way'],['return','Round Trip'],['outstation','Outstation']].map(([value,title])=><button type="button" key={value} aria-pressed={type===value} className={type===value?'active':''} onClick={()=>setType(value)}>{title}</button>)}</div><input type="hidden" name="tripType" value={type}/><input type="hidden" name="cityId" value={city}/><MapsAddresses initial={initial} city={city} roundTrip={type==='return'} onLocationChange={onLocationChange}/>
 {type!=='outstation'&&<div className="booking-timing"><span id="booking-timing-label">When is driver needed?</span><input type="hidden" name="timing" value={timing}/><div className="booking-timing-options" role="group" aria-labelledby="booking-timing-label">{[['now','Now'],['schedule','Schedule for later']].map(([value,title])=><button type="button" key={value} aria-pressed={timing===value} aria-controls={value==='schedule'?'booking-schedule-options':undefined} aria-expanded={value==='schedule'?scheduled:undefined} onClick={()=>{focusSchedule.current=value==='schedule';setTiming(value);onLocationChange?.()}}>{title}</button>)}</div></div>}

 <div hidden={!scheduled} id="booking-schedule-options" ref={scheduleFields} className="booking-schedule-fields"><ScheduleWheel initial={initial} onChange={()=>onLocationChange?.()}/></div>
 {type==='return'&&<Field title="Select Package"><select name="hours" key="return-package" defaultValue={initial?.hours||""} required><option value="" disabled>Package Hours</option>{packageHours.map(n=><option value={n} key={n}>{n} Hours</option>)}</select></Field>}
 {type==='outstation'&&<div className="fields"><Field title="Trip type"><select name="outstationDirection" defaultValue={initial?.outstationDirection||"return"}><option value="return">Round Trip</option><option value="one-way">One Way</option></select></Field><Field title="Estimated usage"><select name="hours" key="outstation-usage" defaultValue={initial?.hours||12} required>{outstationHours.map(n=><option key={n} value={n}>{n} Hrs</option>)}</select></Field></div>}

 </div><div className="fields booking-car-options"><Field title="Transmission"><select name="transmission" defaultValue={initial?.transmission||"manual"}><option value="manual">Manual</option><option value="automatic">Automatic</option></select></Field><Field title="Car type"><select name="vehicleCategory" defaultValue={initial?.vehicleCategory||"hatchback"}><option value="hatchback">Hatchback</option><option value="sedan">Sedan</option><option value="suv">SUV</option><option value="luxury">Luxury</option></select></Field></div></>;
}
