import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
  AppState,
  Linking,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ExpoLinking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase, authCallback } from "./src/session";
import { api, apiOrigin, APIError } from "./src/api";
import { stopTracking } from "./src/location";
import AuthScreen from "./src/AuthScreen";
import BookingScreen from "./src/BookingScreen";
import WalletScreen from "./src/WalletScreen";
import DriverScreen from "./src/DriverScreen";
import SupportScreen from "./src/SupportScreen";
import { Trip } from "./src/Trips";
import { Card, Button, Loading, Brand, Icon, Choices, s, colors } from "./src/ui";
function Workspace() {
  const [session, S] = useState<Session | null>(null),
    [initial, I] = useState(true),
    [data, D] = useState<any>(null),
    [tab, T] = useState("home"),
    [error, E] = useState(""),
    [refreshing, R] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const refreshPending=useRef<Promise<void>|null>(null),sessionUser=useRef<string|null>(null);
  const [journeyTab, setJourneyTab] = useState("upcoming");
  const generation = useRef(0),
    mounted = useRef(true);
  function refresh():Promise<void> {
    if(refreshPending.current)return refreshPending.current;
    const current=generation.current;
    const pending=api("snapshot").then(result=>{if(mounted.current&&current===generation.current){D(result);E("")}}).finally(()=>{if(refreshPending.current===pending)refreshPending.current=null});
    refreshPending.current=pending;return pending;
  }
  useEffect(() => {
    mounted.current = true;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        S(data.session);
        I(false);
        if (error) E(error.message);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        if(sessionUser.current!==(next?.user.id||null)){generation.current++;refreshPending.current=null;sessionUser.current=next?.user.id||null}
        S(next);
        if (!next) {
          D(null);
          stopTracking().catch(() => {});
        }
      },
    );
    const subscription = ExpoLinking.addEventListener("url", ({ url }) =>
      authCallback(url).catch((e) => E(e.message)),
    );
    ExpoLinking.getInitialURL()
      .then(async (url) => {
        if (url) await authCallback(url);
      })
      .catch((e) => E(e.message));
    return () => {
      active = false;
      mounted.current = false;
      generation.current++;
      listener.subscription.unsubscribe();
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const load = () =>
      refresh().catch((e) => {
        if (active) {
          E(e instanceof Error ? e.message : "Connection failed");
          if (e instanceof APIError && e.status === 401) {
            stopTracking().catch(() => {});
            supabase.auth.signOut({ scope: "local" });
          }
        }
      });
    load();
    const interval = setInterval(() => {
      if (AppState.currentState === "active") load();
    }, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session?.user.id]);
  async function reload() {
    R(true);
    E("");
    try {
      await refresh();
    } catch (e) {
      E(e instanceof Error ? e.message : "Unable to refresh");
    } finally {
      R(false);
    }
  }
  async function signout() {
    try {
      await stopTracking();
      if (data?.driver?.verification === "approved")
        await api("driver/availability", { online: false }).catch(() => {});
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      D(null);
    } catch (e) {
      E(e instanceof Error ? e.message : "Unable to sign out");
    }
  }
  if (initial) return <Loading />;
  if (!session) return <AuthScreen />;
  if (!data)
    return (
      <ScrollView contentContainerStyle={s.content}>
        <Brand />
        <Text style={s.h1}>Let’s reconnect.</Text>
        <Text style={s.muted}>We couldn’t load your account. Check your connection and try again.</Text>
        {error ? <Text style={s.error}>{error}</Text> : <Loading />}
        <Button title="Reconnect" onPress={reload} />
        <Button secondary title="Sign out" onPress={signout} />
      </ScrollView>
    );
  const driver = data.me.role === "driver";
  const selectedTab=tab==="wallet"?"account":tab;
  const tabs = [
    ["home", driver ? "Driver" : "Home"],
    ["trips", "Bookings"],
    ["inbox", "Support"],
    ["account", "Account"],
  ];
  return (
    <View style={s.screen}>
      <ScrollView
        ref={scroll}
        style={{flex:1}}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={reload} />
        }
      >
        <View style={s.row}><Brand /><Pressable accessibilityRole="button" accessibilityLabel="Open updates and support" onPress={()=>{T("inbox");scroll.current?.scrollTo({y:0,animated:false});}} style={{minWidth:44,minHeight:44,borderWidth:1,borderColor:colors.line,borderRadius:22,alignItems:"center",justifyContent:"center"}}><Icon name="help"/></Pressable></View>
        {error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        {tab === "home" &&
          (driver ? (
            <DriverScreen data={data} refresh={refresh} />
          ) : (
            <BookingScreen
              onStageChange={()=>scroll.current?.scrollTo({y:0,animated:false})}
              onBooked={() => {
                reload();
                T("trips");
              }}
            />
          ))}
        {tab === "trips" && (
          <>
            <Text style={s.h1}>Your journeys.</Text>
            <Text style={s.muted}>Everything you need, before and after a trip.</Text>
            <Choices value={journeyTab} set={setJourneyTab} values={[{label:"Upcoming",value:"upcoming"},{label:"Past journeys",value:"past"}]}/>
            {data.bookings
              .filter((b: any) =>
                driver
                  ? b.driver_id === data.me.id
                  : b.customer_id === data.me.id,
              )
              .filter((b:any)=>journeyTab === "past" ? ["completed","cancelled"].includes(b.status) : !["completed","cancelled"].includes(b.status))
              .map((b: any) => (
                <Trip key={b.id} trip={b} partner={driver} refresh={refresh} onPay={()=>{T("wallet");scroll.current?.scrollTo({y:0,animated:false})}} />
              ))}
            {data.locationRequests
              ?.filter(
                (r: any) =>
                  r.customer_id === data.me.id && r.status !== "converted",
              )
              .filter((r:any)=>journeyTab === "past" ? r.status === "cancelled" : r.status !== "cancelled")
              .map((r: any) => (
                <Card key={r.id}>
                  <Text style={s.text}>
                    {r.pickup} → {r.destination}
                  </Text>
                  <Text style={s.muted}>
                    {r.status === "pending"
                      ? "Address verification before dispatch"
                      : r.status}
                  </Text>
                  {r.status === "pending" && (
                    <Button
                      secondary
                      title="Cancel request"
                      onPress={async () => {
                        try {
                          await api(`location-requests/${r.id}/cancel`, {});
                          await refresh();
                        } catch (e) {
                          E(String(e));
                        }
                      }}
                    />
                  )}
                </Card>
              ))}
            {!data.bookings.some((b: any) => (driver
                ? b.driver_id === data.me.id
                : b.customer_id === data.me.id) && (journeyTab === "past" ? ["completed","cancelled"].includes(b.status) : !["completed","cancelled"].includes(b.status))) && !data.locationRequests?.some((r:any)=>r.customer_id === data.me.id && r.status !== "converted" && (journeyTab === "past" ? r.status === "cancelled" : r.status !== "cancelled")) && <Card><Text style={s.h2}>{journeyTab === "past" ? "No past journeys yet" : "Your next journey starts here."}</Text><Text style={s.muted}>{journeyTab === "past" ? "Your completed and cancelled journeys will appear here." : "Plan a trip and follow its status here."}</Text>{journeyTab === "upcoming" && <Button title="Plan a journey" onPress={()=>T("home")}/>}</Card>}
          </>
        )}
        {tab === "inbox" && (
          <>
            <Text style={s.h1}>How can we help?</Text>
            <Text style={s.muted}>Get help with your account or a journey.</Text>
            <SupportScreen data={data} refresh={refresh} />
            <Text style={s.h2}>Your updates</Text>
            <Button
              secondary
              title="Mark updates as read"
              onPress={async () => {
                try {
                  await api("notifications/read", {});
                  await refresh();
                } catch (e) {
                  E(String(e));
                }
              }}
            />
            {data.notifications.map((n: any) => (
              <Card key={n.id}>
                <Text style={s.text}>{n.message}</Text>
                <Text style={s.muted}>
                  {new Date(n.created_at).toLocaleString()}
                  {n.read ? "" : " · Unread"}
                </Text>
              </Card>
            ))}
          </>
        )}
        {tab === "wallet" && <WalletScreen onBack={()=>T("account")}/>}
        {tab === "account" && (
          <>
          <Text style={s.h1}>Your account.</Text>
          <View style={[s.row,{justifyContent:"flex-start",marginVertical:12}]}><View style={{width:58,height:58,borderRadius:29,backgroundColor:colors.ink,justifyContent:"center",alignItems:"center"}}><Text style={{color:colors.white,fontSize:20}}>{String(data.me.name || "D").split(" ").map((n:string)=>n[0]).slice(0,2).join("")}</Text></View><View style={{flex:1}}><Text style={s.h2}>{data.me.name}</Text><Text style={s.muted}>{driver ? "Driver partner" : "Customer"}</Text></View></View>
          <Card>
            <Text style={s.h2}>Personal details</Text>
            <Text style={s.text}>{data.me.email}</Text>
            <Text style={s.muted}>{data.me.role}</Text>
            <Button secondary title="Wallet & online payments →" onPress={()=>{T("wallet");scroll.current?.scrollTo({y:0,animated:false})}}/>
            <Button secondary title="Your bookings →" onPress={()=>T("trips")}/>
            <Button secondary title="Help & support →" onPress={()=>T("inbox")}/>
            <Button
              secondary
              title="Open DRIOZ website"
              onPress={() => Linking.openURL(apiOrigin)}
            />
            <Button
              secondary
              title="Account deletion request"
              onPress={() => {
                T("inbox");
                Alert.alert(
                  "Account deletion",
                  "Send an account deletion request in Support. Operations must resolve active journeys and confirm what records can be deleted.",
                );
              }}
            />
            <Button title="Sign out" onPress={signout} />
            <Text style={s.muted}>
              Location sharing is optional and stops when you sign out. Open Wallet for payments. Driver Wallet separates available earnings, welcome credit and recharge funds.
            </Text>
          </Card>
          </>
        )}
      </ScrollView>
      <View style={s.tabs}>
        {tabs.map(([id, label]) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedTab === id }}
            key={id}
            onPress={() => {T(id);scroll.current?.scrollTo({y:0,animated:false});}}
            style={s.tab}
          >
            <View style={{paddingHorizontal:15,paddingVertical:3,borderRadius:18,backgroundColor:selectedTab===id?colors.lime:"transparent"}}><Icon name={id} active={selectedTab===id}/></View>
            <Text
              style={{
                color: selectedTab === id ? colors.ink : colors.muted,
                fontWeight: selectedTab === id ? "700" : "400",
                fontSize: 10,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Workspace />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
