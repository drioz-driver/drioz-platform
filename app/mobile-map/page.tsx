'use client';
import {useEffect,useRef,useState} from 'react';
import {maps} from '../maps-address';

type Point={lat:number;lng:number};
function point(value:any):value is Point{
 return !!value&&Number.isFinite(value.lat)&&Math.abs(value.lat)<=90&&Number.isFinite(value.lng)&&Math.abs(value.lng)<=180;
}

export default function MobileMap(){
 const container=useRef<HTMLDivElement>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true, map:any, marker:any, driver:any, listener:any;
  const notify=(data:unknown)=>(window as any).ReactNativeWebView?.postMessage(JSON.stringify(data));
  const update=(event:Event)=>{
   const {target,driver:position,editable}=(event as CustomEvent).detail||{};
   if(!map||!point(target))return;
   if(!marker){
    marker=new map.api.Marker({map:map.instance,position:target});
    map.instance.setCenter(target);
    listener=map.instance.addListener('click',(e:any)=>{
     if(!editable||!e.latLng)return;
     const selected={lat:e.latLng.lat(),lng:e.latLng.lng()};
     marker.setPosition(selected);
     notify({type:'point',point:selected});
    });
   }else marker.setPosition(target);
   if(point(position)){
    if(!driver)driver=new map.api.Marker({map:map.instance,position,label:'D'});
    else {driver.setPosition(position);driver.setMap(map.instance)}
    const bounds=new map.api.LatLngBounds();
    bounds.extend(target);bounds.extend(position);
    if(Math.abs(target.lat-position.lat)+Math.abs(target.lng-position.lng)>0.001)map.instance.fitBounds(bounds,24);
   }else{driver?.setMap(null);if(!editable)map.instance.panTo(target);}
  };
  const mapsWindow=window as Window & {gm_authFailure?:()=>void};
  const authFailure=()=>{if(active){setError('Map unavailable. Check your connection and retry.');notify({type:'error'});}};
  mapsWindow.gm_authFailure=authFailure;
  window.addEventListener('drioz-map-state',update);
  maps().then(api=>{
   if(!active||!container.current)return;
   map={api,instance:new api.Map(container.current,{zoom:15,center:{lat:17.44,lng:78.39},disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'})};
   notify({type:'ready'});
  }).catch(authFailure);
  return()=>{active=false;listener?.remove();if(mapsWindow.gm_authFailure===authFailure)delete mapsWindow.gm_authFailure;window.removeEventListener('drioz-map-state',update)};
 },[]);
 return <main style={{position:'fixed',inset:0,background:'#eef5f1'}}><div ref={container} aria-label="DRIOZ map" style={{height:'100%'}}/>{error&&<p role="alert" style={{position:'absolute',top:12,left:12,right:12,background:'white',padding:12}}>{error}</p>}</main>;
}
