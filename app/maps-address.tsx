'use client';
import {useEffect,useRef,useState} from 'react';
type Point={lat:number;lng:number};
let loading:Promise<any>|undefined;
export function maps(){
 if(!loading)loading=fetch('/api/maps/config',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Address search is unavailable');return await r.json() as {key:string}}).then(({key})=>new Promise<any>((resolve,reject)=>{
  const existing=(window as any).google?.maps;if(existing?.places){resolve(existing);return}
  const script=document.createElement('script');script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=places&v=weekly&region=IN';script.async=true;
  script.onload=()=>resolve((window as any).google.maps);script.onerror=()=>reject(Error('Unable to load address search'));document.head.appendChild(script);
 } )).catch(e=>{loading=undefined;throw e});return loading;
}
export default function MapsAddresses({city,roundTrip,onLocationChange}:{city:string;roundTrip:boolean;onLocationChange?:()=>void}){
 const changed=useRef(onLocationChange);changed.current=onLocationChange;
 const pickup=useRef<HTMLInputElement>(null),drop=useRef<HTMLInputElement>(null),mapElement=useRef<HTMLDivElement>(null),version=useRef(0);
 const [points,P]=useState<{pickup?:Point;destination?:Point}>({}),[message,M]=useState(''),[enabled,E]=useState(false),[route,R]=useState(''),[region,setRegion]=useState<{city:string;country:string}|null>(null);
 useEffect(()=>{let active=true;let listeners:any[]=[];P({});setRegion(null);R('');changed.current?.();if(pickup.current)pickup.current.value='';if(drop.current)drop.current.value='';
  maps().then(g=>{if(!active)return;E(true);M('Choose a suggested address to confirm its location.');
   for(const [name,ref] of [['pickup',pickup],['destination',drop]] as const){if(!ref.current)continue;
    const autocomplete=new g.places.Autocomplete(ref.current,{fields:['formatted_address','geometry','name','address_components']});
    listeners.push(autocomplete.addListener('place_changed',()=>{const p=autocomplete.getPlace();if(name==='pickup'){const parts=p.address_components||[];const find=(type:string)=>parts.find((part:any)=>part.types.includes(type));setRegion({city:(find('locality')||find('postal_town')||find('administrative_area_level_2'))?.long_name||'',country:find('country')?.short_name||''})}if(!p.geometry?.location){P(old=>({...old,[name]:undefined}));return}ref.current!.value=(p.formatted_address||p.name||'').slice(0,200);P(old=>({...old,[name]:{lat:p.geometry.location.lat(),lng:p.geometry.location.lng()}}));changed.current?.();}));
   }
  }).catch(()=>{if(active){E(false);M('Address search is temporarily unavailable. Enter addresses for Operations to verify.')}});
  return()=>{active=false;version.current++;listeners.forEach(x=>x.remove())};
 },[city,roundTrip]);
 useEffect(()=>{const request=++version.current;R('');if(!points.pickup||!points.destination||roundTrip)return;
  maps().then(async g=>{try{const result=await new g.DirectionsService().route({origin:points.pickup,destination:points.destination,travelMode:g.TravelMode.DRIVING});if(request!==version.current)return;const leg=result.routes?.[0]?.legs?.[0];if(!leg)throw Error();R(`${leg.distance.text} · approximately ${leg.duration.text}`);if(mapElement.current){const map=new g.Map(mapElement.current,{disableDefaultUI:true,zoomControl:true});new g.DirectionsRenderer({map,directions:result});}}catch{if(request===version.current)R('No driving route available. Operations must confirm this journey.')}}).catch(()=>{if(request===version.current)R('Route estimates are temporarily unavailable.')});
  return()=>{version.current++};
 },[points,roundTrip]);
 const valid=!!points.pickup&&(roundTrip||!!points.destination);
 return <><label className="field"><span>Pickup location</span><input ref={pickup} name="pickup" placeholder="Enter pickup address" minLength={3} maxLength={200} required autoComplete="off" onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} onChange={()=>{changed.current?.();setRegion(null);P(p=>({...p,pickup:undefined}));R('')}}/></label>
 {!roundTrip&&<label className="field"><span>Drop location</span><input ref={drop} name="destination" placeholder="Enter destination address" minLength={3} maxLength={200} required autoComplete="off" onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} onChange={()=>{changed.current?.();P(p=>({...p,destination:undefined}));R('')}}/></label>}
 <input type="hidden" name="pickupRegion" value={region?JSON.stringify(region):''}/><input type="hidden" name="pickupPoint" value={points.pickup?JSON.stringify(points.pickup):''}/><input type="hidden" name="destinationPoint" value={valid?JSON.stringify(roundTrip?points.pickup:points.destination):''}/>
 <p className="helper" role="status">{message}{enabled&&valid?' Locations selected.':''}</p>
 {!roundTrip&&points.pickup&&points.destination&&<section aria-label="Driving route preview"><div ref={mapElement} style={{height:220,borderRadius:12,overflow:'hidden'}}/><p role="status">{route||'Finding driving route…'}</p><p className="helper">Travel time is an estimate. Driver fares follow the selected service package.</p></section>}
 </>;
}
