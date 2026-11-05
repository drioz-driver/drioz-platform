export type PickupChoice={date:string;hour:string;minute:string;period:string};
export function wheelIndex(index:number,length:number){return ((index%length)+length)%length}
const dateLabel=new Intl.DateTimeFormat('en-IN',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'});
const pad=(n:number)=>String(n).padStart(2,'0');
function wallParts(at:number,timeZone:string){const p=new Intl.DateTimeFormat('en-CA',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(at);const v=(t:string)=>p.find(x=>x.type===t)!.value;return {date:`${v('year')}-${v('month')}-${v('day')}`,time:`${v('hour')}:${v('minute')}`}}
export function zonedTimestamp(date:string,time:string,timeZone='Asia/Kolkata'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return NaN;
 try{const target=Date.parse(`${date}T${time}:00Z`);let guess=target;for(let i=0;i<5;i++){const p=wallParts(guess,timeZone),wall=Date.parse(`${p.date}T${p.time}:00Z`),delta=target-wall;if(!delta)return p.date===date&&p.time===time?guess:NaN;guess+=delta}const p=wallParts(guess,timeZone);return p.date===date&&p.time===time?guess:NaN}catch{return NaN}
}
export function pickupTimestamp(choice:PickupChoice,timeZone='Asia/Kolkata'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(choice.date)||! /^(0?[1-9]|1[0-2])$/.test(choice.hour)||! /^[0-5]\d$/.test(choice.minute)||!['AM','PM'].includes(choice.period))return NaN;
 const hour=Number(choice.hour)%12+(choice.period==='PM'?12:0);
 return zonedTimestamp(choice.date,`${pad(hour)}:${choice.minute}`,timeZone);
}
export function pickupChoice(date?:string,time?:string,now=Date.now(),timeZone='Asia/Kolkata'):PickupChoice{
 const next=wallParts(Math.ceil((now+1800000)/300000)*300000,timeZone);
 const valid=!!date&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'');
 const hour=valid?Number(time!.slice(0,2)):Number(next.time.slice(0,2));
 return {date:valid?date!:next.date,hour:pad(hour%12||12),minute:valid?time!.slice(3,5):next.time.slice(3,5),period:hour>=12?'PM':'AM'};
}
export function pickupTime(choice:PickupChoice){return `${pad(Number(choice.hour)%12+(choice.period==='PM'?12:0))}:${choice.minute}`}
export function pickupDates(selected:string,now=Date.now(),timeZone='Asia/Kolkata'){
 const today=wallParts(now,timeZone).date;
 const start=Date.parse(today+'T00:00:00Z');
 const dates=Array.from({length:366},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
 if(selected>=today&&!dates.includes(selected)&&/^\d{4}-\d{2}-\d{2}$/.test(selected))dates.push(selected);
 return dates.map(value=>({value,label:value===today?'Today':dateLabel.format(new Date(value+'T00:00:00Z'))}));
}
export const pickupHours=Array.from({length:12},(_,i)=>({value:pad(i+1),label:pad(i+1)}));
export const pickupMinutes=Array.from({length:60},(_,i)=>({value:pad(i),label:pad(i)}));
export const pickupPeriods=['AM','PM'].map(value=>({value,label:value}));
