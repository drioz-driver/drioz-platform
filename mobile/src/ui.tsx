import React, {useEffect, useRef, useState} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Easing,
  ScrollView,
  Image,
} from "react-native";
export const colors = {
  ink: "#253e30",
  green: "#00ce8b",
  lime: "#daed9c",
  white: "#fbfcf7",
  paper: "#f5f3ec",
  line: "#dce0d3",
  muted: "#5e6b5c",
};
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  dark = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  dark?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        dark && {backgroundColor:colors.ink},
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.ink }, dark && {color:colors.white}]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  secure = false,
  placeholder = "",
  keyboard = "default",
  compact = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder?: string;
  keyboard?: "default" | "email-address" | "phone-pad" | "numeric";
  compact?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginVertical: compact ? 4 : 7 }}>
      <Text style={[s.label, compact && {fontSize:11,marginBottom:4}]}>{label}</Text>
      <TextInput
        multiline={multiline}
        textAlignVertical={multiline?"top":"center"}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboard}
        autoCapitalize="none"
        placeholder={placeholder}
        style={[s.input, compact && {minHeight:48,padding:12,fontSize:14},multiline&&{minHeight:110}]}
      />
    </View>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Choices({
  values,
  value,
  set,
}: {
  values: { label: string; value: string }[];
  value: string;
  set: (v: string) => void;
}) {
  return <View accessibilityRole="radiogroup" style={{flexDirection:'row',flexWrap:'wrap',gap:8,paddingVertical:4}}>{values.map(v=><Pressable key={v.value} accessibilityRole="radio" accessibilityState={{checked:value===v.value}} onPress={()=>set(v.value)} style={[s.chip,{flexGrow:1,flexBasis:values.length<=3?0:'28%',alignItems:'center',justifyContent:'center'},value===v.value&&{backgroundColor:'#edf1df',borderColor:colors.ink}]}><Text style={{color:colors.ink,fontSize:12,fontWeight:value===v.value?'700':'400',textAlign:'center'}}>{v.label}</Text></Pressable>)}</View>;
}
export function Disclosure({title,children,initial=false}:{title:string;children:React.ReactNode;initial?:boolean}){
 const [open,O]=useState(initial);
 return <Card><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>O(!open)} style={[s.row,{minHeight:44}]}><Text style={[s.h2,{flex:1,marginBottom:0,fontSize:18}]}>{title}</Text><Text style={s.h2}>{open?'−':'+'}</Text></Pressable>{open&&children}</Card>;
}

export function SteeringLoader({size = 48}: {size?: number}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {if(active)setReduced(value)}).catch(()=>{});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {active=false;subscription.remove()};
  }, []);
  useEffect(() => {
    rotation.setValue(0);
    if(reduced)return;
    const loop = Animated.loop(Animated.timing(rotation, {toValue:1,duration:1800,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
    loop.start();
    return () => {loop.stop();rotation.stopAnimation()};
  }, [reduced, rotation]);
  return <Animated.Image source={require('../assets/drioz-steering.png')}
    accessibilityLabel="Loading" accessibilityRole="progressbar"
    style={{width:size,height:size,transform:[{rotate:rotation.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}}/>;
}
export function Loading() {
  return <View style={{padding:30,alignItems:'center',justifyContent:'center'}}><SteeringLoader/></View>;
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 18, paddingBottom: 28, gap: 16 },
  brand: {
    fontSize: 31,
    fontWeight: "900",
    color: colors.green,
    letterSpacing: 2,
  },
  h1: { fontSize: 27, lineHeight: 32, fontWeight: "500", color: colors.ink, letterSpacing: -1 },
  h2: { fontSize: 20, fontWeight: "500", color: colors.ink, marginBottom: 6, letterSpacing: -.4 },
  text: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
    minHeight: 52,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.lime,
    padding: 16,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
  },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  buttonText: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  error: {
    color: "#a12b2b",
    backgroundColor: "#ffeded",
    padding: 12,
    borderRadius: 12,
  },
  tabs: {
    backgroundColor: colors.white,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: { flex: 1, minHeight: 52, alignItems: "center", gap: 4 },
  price: { fontSize: 34, fontWeight: "500", color: colors.ink, letterSpacing: -1 },
  eyebrow: { fontSize: 10, fontWeight: "700", color: colors.muted, letterSpacing: 1.7 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
});

export function Brand({ lightSurface=false, compact=false }: {lightSurface?:boolean;compact?:boolean}) {
  const scale=compact?110/145:1;
  return <View style={lightSurface?{alignSelf:"flex-start",backgroundColor:colors.white,borderRadius:10,padding:8}:undefined}><View accessible accessibilityLabel="DRIOZ" style={{width:145*scale,height:49*scale,overflow:"hidden"}}><Image source={require("../assets/drioz-logo.png")} style={{width:209*scale,height:205*scale,position:"absolute",left:-32*scale,top:-83*scale}} resizeMode="contain" /></View></View>;
}
export function Icon({name, active=false}: {name:string; active?:boolean}) {
  const line = {borderColor:colors.ink,borderWidth:1.6};
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:24,height:24,alignItems:"center",justifyContent:"center"}}>
    {name==="home" ? <><View style={{...line,width:13,height:13,transform:[{rotate:"45deg"}],position:"absolute",top:3}}/><View style={{...line,width:16,height:14,backgroundColor:active?colors.lime:colors.white,borderTopWidth:0,top:5}}/></> : name==="trips" ? <View style={{...line,width:16,height:20,borderRadius:3,padding:3,gap:4}}><View style={{height:1,backgroundColor:colors.ink,marginTop:3}}/><View style={{height:1,backgroundColor:colors.ink}}/></View> : name==="wallet" ? <View style={{...line,width:22,height:17,borderRadius:4}}><View style={{...line,width:9,height:7,borderRadius:2,position:"absolute",right:-2,top:3,backgroundColor:colors.white}}/></View> : name==="account" ? <><View style={{...line,width:8,height:8,borderRadius:8}}/><View style={{...line,width:18,height:10,borderTopLeftRadius:12,borderTopRightRadius:12,marginTop:3}}/></> : <View style={{...line,width:20,height:20,borderRadius:20,alignItems:"center",justifyContent:"center"}}><Text style={{color:colors.ink,fontSize:13,fontWeight:"600"}}>?</Text></View>}
  </View>;
}
export function Route({pickup,destination}: {pickup:string;destination?:string}) {
  return <View style={{gap:16,paddingVertical:6}}>{[pickup,destination].filter(Boolean).map((label,i)=><View key={i} style={{flexDirection:"row",gap:13,alignItems:"center"}}><View style={{width:14,height:14,borderWidth:4,borderColor:colors.ink,borderRadius:i?2:10}}/><View style={{flex:1}}><Text style={[s.muted,{fontSize:11}]}>{i?"Destination":"Pickup"}</Text><Text style={[s.text,{fontSize:14}]}>{label}</Text></View></View>)}</View>;
}
