'use client';
import {sessionFetch} from '@/lib/browser-api';
/** Shared browser helpers for the DRIOZ web client. */
export const fmt=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format((Number(n)||0)/100);
export const when=(n:number)=>new Date(n).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
export const ago=(n:number)=>{const s=Math.round((Date.now()-n)/1000);if(s<60)return 'just now';const m=Math.round(s/60);if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+' h ago';return when(n)};
export const label=(s:string)=>String(s||'').replaceAll('_',' ').replaceAll('-',' ');
export const tripTypeName=(t:string)=>t==='one-way'?'One way':t==='return'?'Round trip':t==='outstation'?'Outstation':t==='hourly'?'Hourly':label(t);
export const initials=(name:string)=>String(name||'?').split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';
export const errorMessage=(e:unknown,fallback='Something went wrong. Please try again.')=>e instanceof Error&&e.message?e.message:typeof e==='string'&&e?e:fallback;
export const ref=(id:string)=>String(id||'').slice(0,8).toUpperCase();
export class HttpError extends Error{constructor(message:string,public status:number){super(message)}}
export async function api(path:string,data?:unknown){
 const isForm=typeof FormData!=='undefined'&&data instanceof FormData;
 const r=await sessionFetch('/api/ops/'+path,{method:data===undefined?'GET':'POST',headers:isForm||data===undefined?undefined:{'Content-Type':'application/json'},body:data===undefined?undefined:isForm?data as FormData:JSON.stringify(data),cache:'no-store'});
 let result:any={};try{result=await r.json()}catch{result={message:r.ok?'':'The server returned an unexpected response.'}}
 if(!r.ok){if(r.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('drioz-session-expired'));throw new HttpError(result.message||'Request failed',r.status)}
 return result;
}
export function statusTone(value:string){
 if(['completed','approved','received','paid','online','pilot open','in progress','available'].includes(value))return 'good';
 if(['pending','requested','address verification','pending review','offline','open'].includes(value))return 'warn';
 if(['cancelled','rejected','refunded','closed','suspended'].includes(value))return 'bad';
 if(['assigned','arrived','resolved'].includes(value))return 'info';
 return '';
}
