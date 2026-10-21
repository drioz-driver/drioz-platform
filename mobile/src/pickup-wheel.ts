export type PickupChoice={date:string;hour:string;minute:string;period:string};
const pad=(n:number)=>String(n).padStart(2,'0');
export function pickupTimestamp(choice:PickupChoice){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(choice.date)||! /^(0?[1-9]|1[0-2])$/.test(choice.hour)||! /^[0-5]\d$/.test(choice.minute)||!['AM','PM'].includes(choice.period))return NaN;
 const hour=Number(choice.hour)%12+(choice.period==='PM'?12:0);
 const value=Date.parse(`${choice.date}T${pad(hour)}:${choice.minute}:00+05:30`);
 return Number.isFinite(value)&&new Date(value+19800000).toISOString().slice(0,10)===choice.date?value:NaN;
}
export function pickupChoice(date?:string,time?:string,now=Date.now()):PickupChoice{
 const next=new Date((Math.ceil((now+1800000)/300000)*300000)+19800000);
 const valid=!!date&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'');
 const hour=valid?Number(time!.slice(0,2)):next.getUTCHours();
 return {date:valid?date!:next.toISOString().slice(0,10),hour:pad(hour%12||12),minute:valid?time!.slice(3,5):pad(next.getUTCMinutes()),period:hour>=12?'PM':'AM'};
}
export function pickupTime(choice:PickupChoice){return `${pad(Number(choice.hour)%12+(choice.period==='PM'?12:0))}:${choice.minute}`}
export function pickupDates(selected:string,now=Date.now()){
 const today=new Date(now+19800000).toISOString().slice(0,10);
 const start=Date.parse(today+'T00:00:00Z');
 const dates=Array.from({length:366},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
 if(selected>=today&&!dates.includes(selected)&&/^\d{4}-\d{2}-\d{2}$/.test(selected))dates.push(selected);
 return dates.map(value=>({value,label:value===today?'Today':new Intl.DateTimeFormat('en-IN',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}).format(new Date(value+'T00:00:00Z'))}));
}
export const pickupHours=Array.from({length:12},(_,i)=>({value:pad(i+1),label:pad(i+1)}));
export const pickupMinutes=Array.from({length:60},(_,i)=>({value:pad(i),label:pad(i)}));
export const pickupPeriods=['AM','PM'].map(value=>({value,label:value}));
