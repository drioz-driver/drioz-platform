export function scheduledPickup(f:FormData){
 const scheduled=f.get('timing')==='schedule'||f.get('tripType')==='outstation';
 if(!scheduled)return null;
 const date=String(f.get('pickupDate')||''),time=String(f.get('pickupTime')||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Choose a pickup date and time.');
 const value=Date.parse(date+'T'+time+':00+05:30');
 if(!Number.isFinite(value)||new Date(value+19800000).toISOString().slice(0,10)!==date)throw Error('Choose a valid pickup date and time.');
 if(value<=Date.now())throw Error('Choose a pickup time in the future.');
 return value;
}
function point(raw:FormDataEntryValue|null){if(typeof raw!=='string'||!raw)return undefined;try{const p=JSON.parse(raw);if(typeof p.lat==='number'&&Number.isFinite(p.lat)&&typeof p.lng==='number'&&Number.isFinite(p.lng))return {lat:p.lat,lng:p.lng}}catch{}return undefined}
export function bookingInput(f:FormData){
 const pickupPoint=point(f.get('pickupPoint')),destinationPoint=point(f.get('destinationPoint'));
 return {...(pickupPoint&&destinationPoint?{pickupPoint,destinationPoint}:{}),cityId:String(f.get('cityId')||''),pickup:String(f.get('pickup')||'').trim(),destination:f.get('destination')?String(f.get('destination')).trim():undefined,vehicleCategory:String(f.get('vehicleCategory')),tripType:String(f.get('tripType')),transmission:String(f.get('transmission')),...(f.get('outstationDirection')?{outstationDirection:String(f.get('outstationDirection'))}:{}),...(f.has('hours')?{hours:Number(f.get('hours'))}:{}),scheduledAt:scheduledPickup(f)};
}
