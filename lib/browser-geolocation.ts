export function locationError(error:unknown){
 const code=(error as {code?:number})?.code;
 if(code===1)return 'Location access is blocked. Allow Location in your browser’s site settings and turn on device location, then try again.';
 if(code===2)return 'Your device could not find its location. Turn on Location services or Wi-Fi, then try again or search for your pickup.';
 if(code===3)return 'Finding your location timed out. Try again near a window or with Wi-Fi enabled, or search for your pickup.';
 return error instanceof Error?error.message:'Current location is unavailable. Search for your pickup instead.';
}

/** Use device coordinates only. A timeout/unavailable coarse fix gets one GPS retry. */
export async function getDevicePosition(geo:Geolocation|undefined):Promise<GeolocationPosition>{
 if(!geo)throw Error('This browser does not support location. Search for your pickup instead.');
 const get=(options:PositionOptions)=>new Promise<GeolocationPosition>((resolve,reject)=>geo.getCurrentPosition(resolve,reject,options));
 try{return await get({timeout:10000,maximumAge:30000,enableHighAccuracy:false})}
 catch(error){if((error as GeolocationPositionError)?.code===1)throw error;return get({timeout:20000,maximumAge:0,enableHighAccuracy:true})}
}
