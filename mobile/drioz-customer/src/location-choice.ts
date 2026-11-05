export type LocationChoice={lat:number;lng:number;label:string;city?:string;country?:string};
export function locationChoice(raw:unknown):LocationChoice|null{
 if(!raw||typeof raw!=='object')return null;
 const p=raw as Record<string,unknown>;
 if(typeof p.lat!=='number'||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||typeof p.lng!=='number'||!Number.isFinite(p.lng)||Math.abs(p.lng)>180||typeof p.label!=='string'||!p.label.trim()||p.label.length>200)return null;
 return {lat:p.lat,lng:p.lng,label:p.label.trim(),...(typeof p.city==='string'?{city:p.city.slice(0,100)}:{}),...(typeof p.country==='string'?{country:p.country.slice(0,2)}:{})};
}
