export const cityDefaults=[['hyderabad','Hyderabad',24900,14900],['bengaluru','Bengaluru',29900,17900],['delhi-ncr','Delhi NCR',29900,17900],['mumbai','Mumbai',34900,19900],['visakhapatnam','Visakhapatnam',24900,14900],['vijayawada','Vijayawada',24900,14900]] as const;
export function assertTransition(from:string,to:string){const allowed:Record<string,string[]>={requested:['assigned','cancelled'],assigned:['arrived','cancelled','requested'],arrived:['in_progress','cancelled','requested'],in_progress:['completed'],completed:[],cancelled:[]};if(!allowed[from]?.includes(to))throw Error('Invalid trip transition');}
/** Per-city rate card for the time-and-distance model. Empty means the legacy flat model. All amounts in paise. */
export type RateCard={oneWayCharge?:number;perMinute?:number;perKm?:number;includedMinutes?:number;packages?:Record<string,number>};
export function rateCard(city:any):RateCard{try{const r=typeof city?.pricing==='string'?JSON.parse(city.pricing||'{}'):city?.pricing||{};return r&&typeof r==='object'?r:{}}catch{return {}}}
/** Package price for any whole number of hours: exact table price, or linear between the nearest packages (extrapolated per minute past the largest). */
export function packagePrice(packages:Record<string,number>,hours:number,perMinute:number){
 const points=Object.entries(packages).map(([h,p])=>[Number(h),Number(p)] as [number,number]).filter(([h,p])=>h>0&&p>0).sort((a,b)=>a[0]-b[0]);
 if(!points.length)return 0;const exact=points.find(([h])=>h===hours);if(exact)return exact[1];
 if(hours<points[0][0])return points[0][1];
 const last=points[points.length-1];if(hours>last[0])return last[1]+Math.round((hours-last[0])*60*perMinute);
 const hi=points.findIndex(([h])=>h>hours),[h0,p0]=points[hi-1],[h1,p1]=points[hi];return Math.round(p0+(p1-p0)*(hours-h0)/(h1-h0));
}
const isNight=(at:number)=>{const h=new Date(at+19800000).getUTCHours();return h>=22||h<6};
/**
 * Fare estimate. With a rate card: one way = first-hour base + one-way charge + per-minute time past the included hour
 * (from the estimated route); hourly round trips use the package table. Night charge applies when the trip is expected
 * to end 10 PM–6 AM. The total is rounded up to the whole rupee and the rounding is shown as its own line.
 * Without a rate card (or for outstation) the legacy flat formula applies unchanged.
 */
export function money(city:any,type:string,hours:number,at:number,surge?:{label:string;bps:number}|null,route?:{km:number;minutes:number}|null){
 const card=rateCard(city),modern=type!=='outstation'&&(type==='one-way'?Number(card.perMinute)>0:!!card.packages&&Object.keys(card.packages).length>0);
 if(!modern){const base=Number(city.base)*(type==='return'?2:type==='outstation'?5:1);const extra=type==='one-way'?0:Math.max(0,hours-1)*Number(city.hourly);const night=isNight(at)?Number(city.night):0;const surgeAmount=surge&&surge.bps>10000?Math.round((base+extra)*(surge.bps-10000)/10000):0;const taxable=base+extra+night+surgeAmount;const tax=Math.round(taxable*Number(city.tax_bps)/10000);const total=taxable+tax;return {base,extra,night,surge:surgeAmount,surgeLabel:surgeAmount?surge!.label:null,tax,total,partner:Math.round(taxable*(10000-Number(city.commission_bps))/10000),hours:type==='one-way'?null:hours,currency:'INR'}}
 const perMinute=Number(card.perMinute)||0,perKm=Number(card.perKm)||0,includedMinutes=Number(card.includedMinutes)||60;
 const oneWay=type==='one-way';
 const base=oneWay?Number(city.base):packagePrice(card.packages||{},hours,perMinute);
 const oneWayCharge=oneWay?Number(card.oneWayCharge)||0:0;
 const routeMinutes=oneWay&&route?Math.max(1,Math.round(route.minutes)):null;
 const timeMinutes=routeMinutes?Math.max(0,routeMinutes-includedMinutes):0,time=Math.round(timeMinutes*perMinute);
 const tripMinutes=oneWay?Math.max(includedMinutes,routeMinutes||0):hours*60;
 const night=isNight(at+tripMinutes*60000)?Number(city.night):0;
 const surgeAmount=surge&&surge.bps>10000?Math.round((base+oneWayCharge+time)*(surge.bps-10000)/10000):0;
 const taxable=base+oneWayCharge+time+night+surgeAmount,tax=Math.round(taxable*Number(city.tax_bps)/10000);
 const subtotal=taxable+tax,total=Math.ceil(subtotal/100)*100,rounding=total-subtotal;
 return {base,extra:0,oneWayCharge,time,timeMinutes,night,surge:surgeAmount,surgeLabel:surgeAmount?surge!.label:null,tax,rounding,total,
  partner:Math.round(taxable*(10000-Number(city.commission_bps))/10000),hours:oneWay?null:hours,currency:'INR',
  rates:{model:'time-distance',perMinute,perKm,includedMinutes:oneWay?Math.max(includedMinutes,routeMinutes||0):hours*60,includedKm:oneWay&&route?Math.ceil(route.km):null}};
}
/** Charges for time (and, for one-way trips, distance) beyond what the estimate included. Amounts rounded to whole rupees. */
export function overage(rates:any,actualMinutes:number,actualKm?:number|null){
 if(!rates||rates.model!=='time-distance')return null;
 const extraMinutes=Math.max(0,Math.ceil(actualMinutes-Number(rates.includedMinutes||0)));
 const extraKm=actualKm!=null&&rates.includedKm!=null?Math.max(0,Math.ceil(actualKm-Number(rates.includedKm))):0;
 return {extraMinutes,extraKm,extraTime:Math.round(extraMinutes*Number(rates.perMinute||0)/100)*100,extraDistance:Math.round(extraKm*Number(rates.perKm||0)/100)*100};
}
/** Highest active surge rule matching the pickup time (IST day-of-week bitmask, minutes since midnight; windows may wrap past midnight). */
export function surgeFor(rules:any[],at:number){const ist=new Date(at+19800000);const day=ist.getUTCDay(),minute=ist.getUTCHours()*60+ist.getUTCMinutes();let best:{label:string;bps:number}|null=null;for(const r of rules){if(!Number(r.active))continue;const prevDay=(day+6)%7;const start=Number(r.start_min),end=Number(r.end_min);const inWindow=start<=end?(Number(r.days)&(1<<day))&&minute>=start&&minute<end:((Number(r.days)&(1<<day))&&minute>=start)||((Number(r.days)&(1<<prevDay))&&minute<end);if(inWindow&&(!best||Number(r.multiplier_bps)>best.bps))best={label:String(r.label),bps:Number(r.multiplier_bps)}}return best}
/** Rough city ETA: straight-line distance × road factor at an average urban speed. */
export function etaMinutes(km:number){return Math.max(1,Math.round(km*1.35/24*60))}
export function inZones(lat:number,lng:number,zones:any[]){return zones.some(z=>Number.isFinite(z.lat)&&Number.isFinite(z.lng)&&Number.isFinite(z.radiusKm)&&z.radiusKm>0&&distance(lat,lng,z.lat,z.lng)<=z.radiusKm)}
export function distance(a:number,b:number,c:number,d:number){const r=Math.PI/180,x=(c-a)*r,y=(d-b)*r;return 6371*2*Math.atan2(Math.sqrt(Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2),Math.sqrt(1-(Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2)))}
