import React,{useEffect,useRef,useState} from 'react';
import {View,Text} from 'react-native';
import {WebView} from 'react-native-webview';
import {Button,s} from './ui';

const origin='https://www.drioz.com';
const page=origin+'/mobile-map';
type Point={lat:number;lng:number};
export default function HostedMap({target,driver,editable=false,onSelect}:{target:Point;driver?:Point|null;editable?:boolean;onSelect?:(point:Point)=>void}){
 const web=useRef<WebView>(null);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!ready)return;
  const detail=JSON.stringify({target,driver,editable});
  web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('drioz-map-state',{detail:${detail}}));true;`);
 },[ready,target.lat,target.lng,driver?.lat,driver?.lng,editable]);
 if(failed)return <View style={{padding:12,gap:8}}><Text style={s.muted}>Map could not load.</Text><Button secondary title="Retry map" onPress={()=>{setReady(false);setFailed(false);setAttempt(n=>n+1)}}/></View>;
 return <WebView ref={web} key={attempt} source={{uri:page}} originWhitelist={[origin]} javaScriptEnabled sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
  onShouldStartLoadWithRequest={request=>request.url===page||request.url==='about:blank'}
  onError={()=>setFailed(true)} onHttpError={()=>setFailed(true)}
  onMessage={event=>{
   try{
    if(new URL(event.nativeEvent.url).origin!==origin)return;
    const message=JSON.parse(event.nativeEvent.data);
    if(message.type==='ready')setReady(true);
    if(message.type==='error')setFailed(true);
    if(editable&&message.type==='point'&&Number.isFinite(message.point?.lat)&&Math.abs(message.point.lat)<=90&&Number.isFinite(message.point?.lng)&&Math.abs(message.point.lng)<=180)onSelect?.(message.point);
   }catch{}
  }}/>;
}
