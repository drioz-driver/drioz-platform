'use client';
import {useEffect,useRef,useState} from 'react';
type Point={lat:number;lng:number};
let loading:Promise<any>|undefined;
const addressControls=new WeakMap<HTMLInputElement,any>();
export function maps(){
 if(!loading)loading=fetch('/api/maps/config',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw Error('Address search is unavailable');return await r.json() as {key:string}}).then(({key})=>new Promise<any>((resolve,reject)=>{
  const existing=(window as any).google?.maps;if(existing?.places){resolve(existing);return}
  const timer=setTimeout(()=>reject(Error('Address search timed out')),15000);const script=document.createElement('script');script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=places&v=weekly&region=IN';script.async=true;
  script.onload=()=>{clearTimeout(timer);resolve((window as any).google.maps)};script.onerror=()=>{clearTimeout(timer);reject(Error('Unable to load address search'))};document.head.appendChild(script);
 } )).catch(e=>{loading=undefined;throw e});return loading;
}
export default function MapsAddresses({city,roundTrip,onLocationChange,initial}:{initial?:Record<string,string>;city:string;roundTrip:boolean;onLocationChange?:()=>void}){
 const initialFields=useRef(initial),initialized=useRef(false),labels=useRef({pickup:initial?.pickup||'',destination:initial?.destination||''}),locationGeneration=useRef(0);const [locating,L]=useState(false);
 const changed=useRef(onLocationChange);changed.current=onLocationChange;
 const pickup=useRef<HTMLInputElement>(null),drop=useRef<HTMLInputElement>(null);
 const [points,P]=useState<{pickup?:Point;destination?:Point}>({}),[message,M]=useState(''),[enabled,E]=useState(false),[region,setRegion]=useState<{city:string;country:string}|null>(null);
 useEffect(()=>{let active=true;let listeners:any[]=[];const draft=initialFields.current;initialFields.current=undefined;if(!initialized.current){initialized.current=true;let restoredPoints:any={};try{restoredPoints={pickup:JSON.parse(draft?.pickupPoint||'null')||undefined,destination:JSON.parse(draft?.destinationPoint||'null')||undefined};setRegion(JSON.parse(draft?.pickupRegion||'null'))}catch{setRegion(null)}P(restoredPoints);changed.current?.();}if(pickup.current)pickup.current.value=labels.current.pickup;if(drop.current)drop.current.value=labels.current.destination;
  maps().then(g=>{if(!active)return;E(true);M('Choose a suggested address to confirm its location.');
   for(const [name,ref] of [['pickup',pickup],['destination',drop]] as const){if(!ref.current)continue;
    let autocomplete=addressControls.get(ref.current);if(!autocomplete){autocomplete=new g.places.Autocomplete(ref.current,{fields:['formatted_address','geometry','name','address_components']});addressControls.set(ref.current,autocomplete)}
    listeners.push(autocomplete.addListener('place_changed',()=>{locationGeneration.current++;L(false);const p=autocomplete.getPlace();if(name==='pickup'){const parts=p.address_components||[];const find=(type:string)=>parts.find((part:any)=>part.types.includes(type));setRegion({city:(find('locality')||find('postal_town')||find('administrative_area_level_2'))?.long_name||'',country:find('country')?.short_name||''})}if(!p.geometry?.location){P(old=>({...old,[name]:undefined}));return}ref.current!.value=(p.formatted_address||p.name||'').slice(0,200);labels.current[name]=ref.current!.value;P(old=>({...old,[name]:{lat:p.geometry.location.lat(),lng:p.geometry.location.lng()}}));changed.current?.();}));
   }
  }).catch(()=>{if(active){E(false);M('Address search is temporarily unavailable. Enter addresses for Operations to verify.')}});
  return()=>{active=false;locationGeneration.current++;listeners.forEach(x=>x.remove())};
 },[city,roundTrip]);
 async function currentLocation(){
  const generation=++locationGeneration.current;L(true);M('Finding your current location…');changed.current?.();
  try{
   if(!navigator.geolocation)throw Error('Current location is unavailable. Search for your address instead.');
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:10000,maximumAge:15000,enableHighAccuracy:false}));
   const g=await maps();const {results}=await new g.Geocoder().geocode({location:{lat:position.coords.latitude,lng:position.coords.longitude}});
   if(generation!==locationGeneration.current)return;
   const address=results?.[0];if(!address)throw Error('No address found here. Search a nearby landmark instead.');
   const parts=address.address_components||[],find=(type:string)=>parts.find((part:any)=>part.types.includes(type));
   labels.current.pickup=(address.formatted_address||'').slice(0,200);if(pickup.current)pickup.current.value=labels.current.pickup;
   P(old=>({...old,pickup:{lat:position.coords.latitude,lng:position.coords.longitude}}));setRegion({city:(find('locality')||find('administrative_area_level_2'))?.long_name||'',country:find('country')?.short_name||''});M('Current pickup location selected.');changed.current?.();
  }catch{if(generation===locationGeneration.current)M('Could not get your current location. Search and choose a suggested address instead.')}finally{if(generation===locationGeneration.current)L(false)}
 }
 const valid=!!points.pickup&&(roundTrip||!!points.destination);
 return <><label className="field"><span>Pickup location</span><input ref={pickup} name="pickup" placeholder="Enter pickup address" minLength={3} maxLength={200} required autoComplete="off" onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} onChange={e=>{labels.current.pickup=e.currentTarget.value;locationGeneration.current++;L(false);changed.current?.();setRegion(null);P(p=>({...p,pickup:undefined}))}}/></label>
 <button type="button" className="address-current" disabled={locating||!enabled} onClick={currentLocation}>{locating?'Finding location…':'◎ Use current location'}</button>
 {!roundTrip&&<label className="field"><span>Drop location</span><input ref={drop} name="destination" placeholder="Enter destination address" minLength={3} maxLength={200} required autoComplete="off" onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} onChange={e=>{labels.current.destination=e.currentTarget.value;changed.current?.();P(p=>({...p,destination:undefined}))}}/></label>}
 <input type="hidden" name="pickupRegion" value={region?JSON.stringify(region):''}/><input type="hidden" name="pickupPoint" value={points.pickup?JSON.stringify(points.pickup):''}/><input type="hidden" name="destinationPoint" value={valid?JSON.stringify(roundTrip?points.pickup:points.destination):''}/>
 <p className="helper" role="status">{message}{enabled&&valid?' Locations selected.':''}</p>

 </>;
}
