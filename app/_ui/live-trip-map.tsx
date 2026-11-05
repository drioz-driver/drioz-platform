'use client';
import {useEffect,useRef,useState} from 'react';
import {maps} from '../maps-address';

type Point={lat:number;lng:number};
export default function LiveTripMap({driver,target}:{driver:Point|null;target:Point&{kind:string}}){
 const element=useRef<HTMLDivElement>(null),map=useRef<any>(null),marker=useRef<any>(null),targetMarker=useRef<any>(null),frame=useRef(0),fitted=useRef(false);
 const [error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  maps().then(g=>{
   if(!active||!element.current)return;
   if(!map.current)map.current=new g.Map(element.current,{center:target,zoom:15,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative'});
   if(!targetMarker.current)targetMarker.current=new g.Marker({map:map.current});
   targetMarker.current.setPosition(target);targetMarker.current.setTitle(target.kind==='pickup'?'Pickup':'Destination');
   cancelAnimationFrame(frame.current);
   if(!driver){marker.current?.setMap(null);marker.current=null;fitted.current=false;setError('');return}
   if(!marker.current){marker.current=new g.Marker({map:map.current,position:driver,title:'Your driver · live GPS',icon:{url:'/driver-live.svg',scaledSize:new g.Size(44,44),anchor:new g.Point(22,22)},zIndex:10})}
   else{
    const from=marker.current.getPosition(),start=performance.now();
    const move=(at:number)=>{if(!active)return;const t=Math.min(1,(at-start)/1200),ease=1-(1-t)**3;marker.current.setPosition({lat:from.lat()+(driver.lat-from.lat())*ease,lng:from.lng()+(driver.lng-from.lng())*ease});if(t<1)frame.current=requestAnimationFrame(move)};
    frame.current=requestAnimationFrame(move);
   }
   if(!fitted.current){const bounds=new g.LatLngBounds();bounds.extend(target);bounds.extend(driver);map.current.fitBounds(bounds,48);fitted.current=true}
   setError('');
  }).catch(()=>{if(active)setError('The map could not load. Live location details are still shown below.')});
  return()=>{active=false;cancelAnimationFrame(frame.current)};
 },[driver?.lat,driver?.lng,target.lat,target.lng,target.kind,retry]);
 useEffect(()=>()=>{marker.current?.setMap(null);targetMarker.current?.setMap(null)},[]);
 return <><div ref={element} className="live-trip-map" aria-label="Live map of your driver and pickup or destination"/>{error&&<p className="helper" role="status">{error} <button className="link" onClick={()=>setRetry(x=>x+1)}>Retry map</button></p>}</>;
}
