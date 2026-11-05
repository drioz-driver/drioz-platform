import {distance} from './domain.ts';
import type {LocalPricing} from './local-money.ts';

type Chart={id:string;country:string;label:string;currency:string;zone:string;lat:number;lng:number;radius:number;hourly:number;minimum:number;source:string};
// DRIOZ launch charts informed by the documented own-car service benchmarks.
// Geographic limits are DRIOZ matching rules, not competitors' coverage promises.
export const localCharts:Chart[]=[
 {id:'intl-dubai',country:'AE',label:'Dubai',currency:'AED',zone:'Asia/Dubai',lat:25.2048,lng:55.2708,radius:55,hourly:80,minimum:2,source:'https://saferdriverdubai.ae/pricing/'},
 {id:'intl-singapore',country:'SG',label:'Singapore',currency:'SGD',zone:'Asia/Singapore',lat:1.3521,lng:103.8198,radius:40,hourly:30,minimum:3,source:'https://www.idrive.sg/valet'},
 {id:'intl-london',country:'GB',label:'London',currency:'GBP',zone:'Europe/London',lat:51.5074,lng:-.1278,radius:55,hourly:45,minimum:2,source:'https://chauffeurz.london/private-driver/'},
 {id:'intl-sydney',country:'AU',label:'Sydney',currency:'AUD',zone:'Australia/Sydney',lat:-33.8688,lng:151.2093,radius:65,hourly:50,minimum:2,source:'https://angelift.com.au/'},
 {id:'intl-melbourne',country:'AU',label:'Melbourne',currency:'AUD',zone:'Australia/Melbourne',lat:-37.8136,lng:144.9631,radius:65,hourly:50,minimum:2,source:'https://drivenindulgence.com.au/designated-driver/'},
 {id:'intl-toronto',country:'CA',label:'Toronto GTA',currency:'CAD',zone:'America/Toronto',lat:43.6532,lng:-79.3832,radius:90,hourly:50,minimum:2,source:'https://www.sobdrive.ca/'},
 {id:'intl-auckland',country:'NZ',label:'Auckland',currency:'NZD',zone:'Pacific/Auckland',lat:-36.8485,lng:174.7633,radius:65,hourly:50,minimum:2,source:'https://www.aucklanddialadriver.co.nz/dial-a-driver'},
 {id:'intl-tokyo',country:'JP',label:'Tokyo',currency:'JPY',zone:'Asia/Tokyo',lat:35.6762,lng:139.6503,radius:50,hourly:4000,minimum:2,source:'https://tokyo-daiko.com/'},
 ...([
  ['new-york','New York',40.7128,-74.006,'America/New_York'],['los-angeles','Los Angeles',34.0522,-118.2437,'America/Los_Angeles'],
  ['chicago','Chicago',41.8781,-87.6298,'America/Chicago'],['houston','Houston',29.7604,-95.3698,'America/Chicago'],
  ['phoenix','Phoenix',33.4484,-112.074,'America/Phoenix'],['portland','Portland',45.5152,-122.6784,'America/Los_Angeles'],
  ['las-vegas','Las Vegas',36.1699,-115.1398,'America/Los_Angeles'],['miami','Miami',25.7617,-80.1918,'America/New_York'],
  ['san-francisco','San Francisco',37.7749,-122.4194,'America/Los_Angeles'],['seattle','Seattle',47.6062,-122.3321,'America/Los_Angeles'],
 ] as const).map(([id,label,lat,lng,zone])=>({id:'intl-'+id,country:'US',label,currency:'USD',zone,lat,lng,radius:65,hourly:55,minimum:2,source:'https://www.dryver.com/'})),
];
export function chartFor(point?:{lat:number;lng:number},country?:string){
 if(!point)return undefined;
 return localCharts.filter(c=>(!country||c.country===country)&&distance(point.lat,point.lng,c.lat,c.lng)<=c.radius).sort((a,b)=>distance(point.lat,point.lng,a.lat,a.lng)-distance(point.lat,point.lng,b.lat,b.lng))[0];
}
const rates=new Map<string,{value:{rate:number;date:string};expires:number;pending?:Promise<{rate:number;date:string}>}>();
export async function exchangeRate(currency:string,fetcher:typeof fetch=fetch){
 const saved=rates.get(currency);if(saved&&saved.expires>Date.now())return saved.value;if(saved?.pending)return saved.pending;
 const pending=(async()=>{const response=await fetcher('https://api.frankfurter.dev/v2/rate/'+currency+'/INR',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Exchange rate unavailable. Please retry.');const r=await response.json() as any;
  if(r.base!==currency||r.quote!=='INR'||!Number.isFinite(r.rate)||r.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||Date.now()-Date.parse(r.date)>10*86400000)throw Error('A current exchange rate is unavailable. Please retry.');
  const value={rate:r.rate,date:r.date};rates.set(currency,{value,expires:Date.now()+6*3600000});return value;
 })();rates.set(currency,{value:saved?.value||{rate:0,date:''},expires:0,pending});try{return await pending}catch(e){rates.delete(currency);throw e}
}
export function localFare(chart:Chart,input:{tripType:string;hours:number;transmission:string},at:number,route:{km:number;minutes:number}|null,fx:{rate:number;date:string},commissionBps=2000){
 const parts=new Intl.DateTimeFormat('en',{timeZone:chart.zone,hourCycle:'h23',hour:'numeric',weekday:'short'}).formatToParts(at),hour=Number(parts.find(p=>p.type==='hour')?.value),day=parts.find(p=>p.type==='weekday')?.value;
 const km=route?.km||0,minutes=route?.minutes||0,oneWay=input.tripType==='one-way';let base=0,extra=0,night=0;
 if(!oneWay)base=Math.max(chart.minimum,input.hours)*chart.hourly;
 else if(chart.country==='US'||chart.country==='GB')base=Math.max(chart.minimum,minutes/60)*chart.hourly;
 else if(chart.id==='intl-dubai'){const bands=[79,105,120,135,150,165,180];base=bands[Math.max(0,Math.min(6,Math.ceil(km/10)-1))];extra=Math.max(0,km-70)*1.5;}
 else if(chart.country==='SG'){base=hour>=21||hour<3?48:58;if(day==='Sun')extra+=10;if(input.transmission==='manual')extra+=10;}
 else if(chart.country==='CA'){base=km<=10?39.99:19.99;extra=km<=10?0:km*2.5;}
 else if(chart.country==='JP'){base=4000;extra=Math.ceil(Math.max(0,km-5))*400;}
 else if(chart.country==='NZ'){base=50;extra=Math.max(0,Math.min(10,km)-5)*2+Math.max(0,Math.min(20,km)-10)*4+Math.max(0,km-20)*(55/15);if(day!=='Sat'&&day!=='Sun'&&hour>=16&&hour<18)night=(base+extra)*.15;}
 else{base=90;extra=Math.max(0,km-10)*3;}
 if(!oneWay&&chart.id==='intl-dubai'&&input.hours>=8)base=500+Math.max(0,input.hours-8)*80;
 const digits=new Intl.NumberFormat('en',{style:'currency',currency:chart.currency}).resolvedOptions().maximumFractionDigits??2;
 const totalLocal=Math.round((base+extra+night)*10**digits)/10**digits;
 const paise=(n:number)=>Math.round(n*fx.rate*100),total=paise(totalLocal),b=paise(base),e=paise(extra),n=paise(night);
 const localPricing:LocalPricing={currency:chart.currency,inrPerUnit:fx.rate,rateDate:fx.date,chartId:chart.id,label:chart.label,version:'2026-11-02.1'};
 return {base:b,extra:e,night:n,surge:0,surgeLabel:null,tax:0,rounding:total-b-e-n,total,partner:Math.round(total*(10000-commissionBps)/10000),hours:oneWay?null:Math.max(chart.minimum,input.hours),currency:'INR',localPricing,localTotal:totalLocal,
  rates:{model:'time-distance',perMinute:paise(chart.hourly/60),perKm:0,includedMinutes:oneWay?Math.max(chart.minimum*60,minutes):Math.max(chart.minimum,input.hours)*60,includedKm:null,local:true},
  pricingNote:'Local DRIOZ rate chart. Cash fare is shown in local currency. Online payments and wallet settlement use the displayed INR equivalent. Tolls and parking are extra.'};
}
