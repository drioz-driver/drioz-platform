export const bookingDraftKey='drioz-booking-draft';
export function readBookingDraft(raw:string|null,now=Date.now()):Record<string,string>|null{
 try{const value=JSON.parse(raw||'null');if(!value||!Number.isFinite(value.savedAt)||now-value.savedAt>1800000||value.savedAt>now||!value.fields||typeof value.fields!=='object')return null;
 const fields=value.fields;const allowed=['cityId','tripType','pickup','destination','pickupPoint','destinationPoint','pickupRegion','timing','hours','pickupDate','pickupTime','transmission','vehicleCategory','outstationDirection'];
 if(!['one-way','return','outstation'].includes(fields.tripType))return null;
 return Object.fromEntries(allowed.filter(k=>typeof fields[k]==='string'&&fields[k].length<=500).map(k=>[k,fields[k]]));
 }catch{return null}
}
