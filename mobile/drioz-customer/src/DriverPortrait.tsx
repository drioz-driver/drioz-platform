import React,{useEffect,useState} from 'react';
import {View,Text,Image} from 'react-native';
import {api} from './api';
import {s,colors} from './ui';
export default function DriverPortrait({trip}:{trip:any}){
 const [url,U]=useState<string|null>(null);
 useEffect(()=>{let active=true;const load=()=>api(`bookings/${trip.id}/driver-photo`).then(r=>{if(active)U(r.url||null)}).catch(()=>{});load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer)}},[trip.id,trip.driver_id]);
 return <View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:52,height:52,borderRadius:26,overflow:'hidden',backgroundColor:colors.brandSoft,alignItems:'center',justifyContent:'center'}}>{url?<Image source={{uri:url}} onError={()=>U(null)} accessibilityLabel={trip.driver_name} style={{width:52,height:52,borderRadius:26}}/>:<Text style={s.h3}>{String(trip.driver_name||'?').split(' ').map((n:string)=>n[0]).slice(0,2).join('')}</Text>}</View><Text style={s.h3}>{trip.driver_name}</Text></View>;
}
