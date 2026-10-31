import React,{useEffect,useRef,useState} from 'react';
import {Modal,View,Text,Pressable,Keyboard} from 'react-native';
import MapView,{Marker} from 'react-native-maps';
import {WebView} from 'react-native-webview';
import * as Location from 'expo-location';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button,Loading,colors,s} from './ui';
import type {Point} from './api';
import {locationChoice} from './location-choice';
// Address search runs on the DRIOZ website (Google Places) inside a locked-down WebView.
const searchOrigin=(()=>{try{return new URL(process.env.EXPO_PUBLIC_API_URL||'https://www.drioz.com').origin}catch{return 'https://www.drioz.com'}})();
function deadline<T>(promise:Promise<T>,ms:number,message:string):Promise<T>{let timer:ReturnType<typeof setTimeout>;return Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms)})]).finally(()=>clearTimeout(timer))}
export default function AddressPicker({title,point,initialPoint,initial,onSelect}:{title:string;point:Point|null;initialPoint?:Point|null;initial?:Point|null;kind?:'pickup'|'destination'|'place';onSelect:(p:Point)=>void}){
 initialPoint=initialPoint??initial;
 const [open,O]=useState(false),[mode,M]=useState<'search'|'map'>('search'),[selected,S]=useState({latitude:point?.lat??17.44,longitude:point?.lng??78.39}),[busy,B]=useState(false),[error,E]=useState(''),[reload,R]=useState(0);
 const generation=useRef(0),map=useRef<MapView>(null);
 const [choice,C]=useState<Point|null>(point);
 useEffect(()=>{if(open&&mode==='map')map.current?.animateToRegion({...selected,latitudeDelta:.025,longitudeDelta:.025},250)},[open,mode,selected.latitude,selected.longitude]);
 function move(coordinates:{latitude:number;longitude:number}){generation.current++;B(false);C(null);S(coordinates);E('')}
 function preview(next:Point){generation.current++;B(false);C(next);S({latitude:next.lat,longitude:next.lng});M('map');E('');Keyboard.dismiss()}
 function close(){generation.current++;O(false);B(false)}
 async function resolve(coordinates:{latitude:number;longitude:number},id:number){
  const [address]=await deadline(Location.reverseGeocodeAsync(coordinates),10000,'The address lookup took too long. Try searching for the address.');
  if(!address)throw Error('No address found here. Search a nearby building or landmark.');
  const label=[address.name,address.street,address.city,address.region,address.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', ').slice(0,200);
  if(id!==generation.current)return;
  onSelect({lat:coordinates.latitude,lng:coordinates.longitude,label:label||'Selected location',city:address.city||address.subregion||'',country:address.isoCountryCode||''});close();
 }
 async function locate(useCurrent:boolean){
  const id=++generation.current;B(true);E('');Keyboard.dismiss();
  try{
   if(useCurrent&&(await Location.requestForegroundPermissionsAsync()).status!=='granted')throw Error('Location access is off. You can still search for an address.');
   let coordinates=selected;
   if(useCurrent){const cached=await Location.getLastKnownPositionAsync({maxAge:15000,requiredAccuracy:100});const position=cached||await deadline(Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),12000,'Could not get your position. Search an address instead.');coordinates={latitude:position.coords.latitude,longitude:position.coords.longitude}}
   if(!useCurrent&&choice){onSelect(choice);close();return}
   await resolve(coordinates,id);
  }catch(e){if(id===generation.current)E(e instanceof Error?e.message:'Unable to find this location. Try address search.')}finally{if(id===generation.current)B(false)}
 }
 return <><Pressable accessibilityRole="button" accessibilityLabel={title+': '+(point?.label||'Search address or use current location')} style={{minHeight:76,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:13,borderBottomWidth:1,borderColor:colors.line}} onPress={()=>{generation.current++;B(false);E('');M('search');C(point);S({latitude:point?.lat??initialPoint?.lat??17.44,longitude:point?.lng??initialPoint?.lng??78.39});O(true)}}><View style={{width:14,height:14,borderWidth:4,borderColor:colors.ink,borderRadius:title==='Pickup'?10:2}}/><View style={{flex:1,gap:4}}><Text style={[s.muted,{fontSize:11}]}>{title} location</Text><Text style={[s.text,{fontSize:14}]}>{point?.label||'Search address or landmark'}</Text>{!point&&<Text style={[s.muted,{fontSize:11}]}>Or use your current location</Text>}</View><Text style={s.muted}>›</Text></Pressable>
 <Modal visible={open} animationType="slide" onRequestClose={close}><SafeAreaView style={s.screen}><View style={{padding:18,gap:12}}><View style={s.row}><Text style={s.h2}>{title} location</Text><Pressable accessibilityRole="button" accessibilityLabel="Close location search" onPress={close} style={{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:26,color:colors.ink}}>×</Text></Pressable></View><Button secondary title={busy?'Finding location…':'◎  Use current location'} disabled={busy} onPress={()=>locate(true)}/><Pressable accessibilityRole="button" onPress={()=>{M(mode==='search'?'map':'search');E('')}} style={{minHeight:40,justifyContent:'center'}}><Text style={[s.text,{textDecorationLine:'underline'}]}>{mode==='search'?'Choose a point on the map':'← Search an address'}</Text></Pressable>{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}</View>
 {open&&mode==='search'&&<WebView key={reload} source={{uri:searchOrigin+'/choose-location'}} style={{flex:1,backgroundColor:colors.paper}} originWhitelist={[searchOrigin]} javaScriptEnabled geolocationEnabled={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} startInLoadingState renderLoading={()=><Loading/>} onShouldStartLoadWithRequest={request=>{try{const url=new URL(request.url);return url.origin===searchOrigin&&url.pathname==='/choose-location'}catch{return request.url==='about:blank'}}} onMessage={event=>{try{const url=new URL(event.nativeEvent.url);// Android WebMessageListener reports the source origin without its page path. Navigation remains restricted to /choose-location above.
 if(url.origin!==searchOrigin||!['/','/choose-location'].includes(url.pathname))return;const message=JSON.parse(event.nativeEvent.data);const choice=locationChoice(message.point);if(message.type!=='drioz.location'||!choice)throw Error('Choose a valid address from the suggestions.');preview(choice)}catch{E('Unable to select that address. Please choose a suggestion again.')}}} onError={()=>E('Address search could not load. Check your connection, then retry.')} onHttpError={()=>E('Address search is temporarily unavailable. Please retry.')} renderError={()=><View style={{padding:20,gap:12}}><Text style={s.muted}>Address search could not load.</Text><Button secondary title="Retry address search" onPress={()=>{E('');R(v=>v+1)}}/></View>}/>}
 {open&&mode==='map'&&<><MapView ref={map} style={{flex:1}} initialRegion={{...selected,latitudeDelta:.025,longitudeDelta:.025}} onPress={e=>move(e.nativeEvent.coordinate)}><Marker coordinate={selected} draggable onDragEnd={e=>move(e.nativeEvent.coordinate)}/></MapView><View style={{padding:18,gap:10}}><Text style={s.muted}>{choice?.label||'Tap a road or building, or drag the pin.'}</Text><Button title={busy?'Finding address…':'Use this map location'} disabled={busy} onPress={()=>locate(false)}/></View></>}
 </SafeAreaView></Modal></>;
}
