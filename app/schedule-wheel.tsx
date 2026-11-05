 'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {wheelIndex,pickupChoice,pickupDates,pickupHours,pickupMinutes,pickupPeriods,pickupTimestamp,pickupTime,type PickupChoice} from '@/lib/pickup-wheel';
const rowHeight=44;
function Wheel({label,options,value,onChange,active}:{active:boolean;label:string;options:{value:string;label:string}[];value:string;onChange:(v:string)=>void}){
 const loop=label!=='Date',length=options.length;
 const rows=useMemo(()=>loop?Array.from({length:length*5},(_,i)=>options[i%length]):options,[options,loop,length]);
 const index=Math.max(0,options.findIndex(o=>o.value===value));
 const ref=useRef<HTMLDivElement>(null),settle=useRef<ReturnType<typeof setTimeout>|null>(null),scrolling=useRef(false),position=useRef((loop?length*2:0)+index);
 const [visible,V]=useState(position.current);
 const change=useRef(onChange),lastValue=useRef(value);change.current=onChange;lastValue.current=value;
 function notify(next:string){if(lastValue.current!==next){lastValue.current=next;change.current(next)}}
 const bounded=(i:number)=>Math.max(0,Math.min(rows.length-1,i));
 function select(i:number){const next=bounded(i);position.current=next;V(next);notify(options[wheelIndex(next,length)].value);ref.current?.scrollTo({top:next*rowHeight,behavior:'auto'})}
 useEffect(()=>{const frame=requestAnimationFrame(()=>{if(ref.current&&!scrolling.current){const next=(loop?length*2:0)+index;position.current=next;V(next);ref.current.scrollTop=next*rowHeight}});return()=>cancelAnimationFrame(frame)},[index,active,loop,length]);
 useEffect(()=>()=>{if(settle.current)clearTimeout(settle.current)},[]);
 return <div className="wheel-column"><span>{label}</span><div className="wheel-scroll" ref={ref} role="listbox" aria-label={label} tabIndex={0} aria-activedescendant={'wheel-'+label+'-'+visible} onKeyDown={e=>{const step=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;if(step){e.preventDefault();select(loop?length*2+wheelIndex(position.current+step,length):position.current+step)}else if(e.key==='Home'||e.key==='End'){e.preventDefault();select((loop?length*2:0)+(e.key==='Home'?0:length-1))}}} onScroll={()=>{scrolling.current=true;const next=bounded(Math.round((ref.current?.scrollTop||0)/rowHeight));position.current=next;V(next);notify(options[next%length].value);if(settle.current)clearTimeout(settle.current);settle.current=setTimeout(()=>{const centered=loop?length*2+wheelIndex(position.current,length):position.current;select(centered);scrolling.current=false},120)}}>{rows.map((option,i)=><div key={i} id={'wheel-'+label+'-'+i} role="option" aria-selected={i===visible} className={i===visible?'selected':''} onClick={()=>select(i)}>{option.label}</div>)}</div></div>;
}
export default function ScheduleWheel({initial,onChange,timeZone='Asia/Kolkata'}:{timeZone?:string;initial?:Record<string,string>;onChange:()=>void}){
 const [date,D]=useState(initial?.pickupDate||''),[time,T]=useState(initial?.pickupTime||''),[open,O]=useState(false),[choice,C]=useState<PickupChoice>(()=>pickupChoice(initial?.pickupDate,initial?.pickupTime)),[error,E]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const dates=useMemo(()=>pickupDates(date,Date.now(),timeZone),[date,open,timeZone]);
 useEffect(()=>{if(open)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close()},[open]);
 const timestamp=pickupTimestamp(choice,timeZone),future=Number.isFinite(timestamp)&&timestamp>Date.now();
 function close(){O(false);trigger.current?.focus()}
 const summary=date&&time?`${new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(date+'T'+time+':00+05:30'))} · ${pickupChoice(date,time,0,timeZone).hour}:${time.slice(3)} ${pickupChoice(date,time,0,timeZone).period}`:'Choose pickup date & time';
 return <><input type="hidden" name="pickupDate" value={date}/><input type="hidden" name="pickupTime" value={time}/><button ref={trigger} type="button" className="schedule-wheel-trigger" aria-haspopup="dialog" onClick={()=>{C(pickupChoice(date,time,Date.now(),timeZone));E('');O(true)}}><span>Pickup date & time · {timeZone}</span><strong>{summary}</strong><span aria-hidden="true">⌄</span></button>
 <dialog ref={dialog} className="schedule-wheel-dialog" aria-labelledby="schedule-wheel-title" onCancel={()=>O(false)} onClose={()=>O(false)}><div className="wheel-dialog-heading"><div><h2 id="schedule-wheel-title">Schedule your pickup</h2><p>{timeZone}</p></div><button type="button" onClick={close} aria-label="Close date and time picker">×</button></div><div className="wheel-grid"><div className="wheel-selection-line" aria-hidden="true"/><Wheel active={open} label="Date" options={dates} value={choice.date} onChange={date=>C(c=>({...c,date}))}/><Wheel active={open} label="Hour" options={pickupHours} value={choice.hour} onChange={hour=>C(c=>({...c,hour}))}/><Wheel active={open} label="Minute" options={pickupMinutes} value={choice.minute} onChange={minute=>C(c=>({...c,minute}))}/><Wheel active={open} label="AM/PM" options={pickupPeriods} value={choice.period} onChange={period=>C(c=>({...c,period}))}/></div>
 {!future&&<p role="status" className="wheel-error">Choose a pickup time in the future.</p>}{error&&<p role="alert">{error}</p>}<div className="wheel-dialog-actions"><button type="button" onClick={close}>Cancel</button><button type="button" className="primary" disabled={!future} onClick={()=>{if(!Number.isFinite(pickupTimestamp(choice,timeZone))||pickupTimestamp(choice,timeZone)<=Date.now()){E('Choose a pickup time in the future.');return}D(choice.date);T(pickupTime(choice));onChange();close()}}>Confirm pickup time</button></div></dialog></>;
}
