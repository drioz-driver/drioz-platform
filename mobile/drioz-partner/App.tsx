import WelcomeOffer from './src/WelcomeOffer';
import React, { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  AccountScreen,
  AuthScreen,
  Banner,
  Button,
  Card,
  Empty,
  Header,
  InboxScreen,
  IntroSplash,
  Loading,
  SectionTitle,
  SupportScreen,
  TabBar,
  Trip,
  api,
  colors,
  isStaff,
  logos,
  s,
  useWorkspace,
  type TabDef,
} from "./src/kit";
import DriverHome from "./src/DriverHome";
import OfferPopup, { type Offer } from "./src/OfferPopup";
import WalletScreen from "./src/WalletScreen";
import AccountExtras from "./src/AccountExtras";
import { useOffers } from "./src/useOffers";
import { startTracking, resumeTracking, stopTracking } from "./src/location";
import { prepareAlerts } from "./src/alerts";
import { onOfferTapped, registerPush, unregisterPush } from "./src/push";
import { I18nProvider, useT } from "./src/i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Partner() {
  const t = useT();
  const w = useWorkspace({
    pollMs: 10000,
    onSignOut: async () => {
      await stopTracking().catch(() => {});
    },
  });
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState("");
  const registeredFor = useRef<string | null>(null);
  const d = w.data?.driver;
  const approvedOnline = d?.verification === "approved" && !!d?.online;
  const hasActiveTrip = !!w.data?.bookings?.some((b: any) => b.driver_id === w.data.me.id && ["assigned", "arrived", "in_progress"].includes(b.status));
  const offers = useOffers({ enabled: !!w.session && approvedOnline && !hasActiveTrip });
  useEffect(() => {
    if (hasActiveTrip) resumeTracking().catch(() => {});
  }, [hasActiveTrip]);
  useEffect(() => {
    if (approvedOnline) prepareAlerts().catch(() => {});
  }, [approvedOnline]);
  // Remote push: register once per signed-in account (no-op without an EAS project id).
  useEffect(() => {
    const id = w.data?.me?.id;
    if (!id || registeredFor.current === id) return;
    registeredFor.current = id;
    registerPush().catch(() => {});
  }, [w.data?.me?.id]);
  // Tapping an offer notification opens the app and shows the popup straight away.
  const pollNow = offers.pollNow;
  useEffect(() => {
    if (!w.session) return;
    return onOfferTapped(() => {
      setTab("home");
      pollNow();
    });
  }, [w.session, pollNow]);
  if (w.initial) return <Loading label={t("loading.start")} />;
  if (!w.session) return <AuthScreen />;
  if (!w.data)
    return (
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 40 }]}>
        {w.error ? (
          <Card>
            <Banner text={w.error} />
            <Button icon="refresh" title={t("common.reconnect")} onPress={w.reload} />
            <Button secondary title={t("common.signOut")} onPress={w.signout} />
          </Card>
        ) : (
          <Loading label={t("loading.day")} />
        )}
      </ScrollView>
    );
  const { data } = w;
  async function signout() {
    if (data.driver?.verification === "approved" && data.driver.online) await api("driver/availability", { online: false }).catch(() => {});
    await unregisterPush().catch(() => {});
    registeredFor.current = null;
    await w.signout();
  }
  const mine = data.bookings.filter((b: any) => b.driver_id === data.me.id);
  const active = mine.filter((b: any) => ["assigned", "arrived", "in_progress"].includes(b.status));
  const unread = data.notifications.filter((n: any) => !n.read).length;
  const tabs: TabDef[] = [
    { id: "home", label: t("tab.drive"), icon: "wheel" },
    { id: "trips", label: t("tab.trips"), icon: "map-outline", iconOn: "map", badge: active.length },
    { id: "inbox", label: t("tab.inbox"), icon: "notifications-outline", iconOn: "notifications", badge: unread },
    { id: "wallet", label: t("tab.wallet"), icon: "wallet-outline", iconOn: "wallet" },
    { id: "account", label: t("tab.account"), icon: "person-circle-outline", iconOn: "person-circle" },
  ];
  return (
    <View style={s.screen}>
      <Header me={data.me} badge={isStaff(data.me.role) ? "STAFF" : "PARTNER"} onAccount={() => setTab("account")} />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: 6 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={w.refreshing} onRefresh={w.reload} tintColor={colors.brandStrong} />}
      >
        {w.error ? <Banner text={w.error} onClose={() => w.setError("")} /> : null}
        {toast ? <Banner tone="warn" text={toast} onClose={() => setToast("")} /> : null}
        {tab === "home"&&<WelcomeOffer key={d?.verification||"new"} userId={data.me.id} onVerify={()=>setTab("home")} onClaimed={()=>{void w.refresh();offers.pollNow()}}/>}
        {tab === "home" && <DriverHome data={{...data,offerAvailability:offers.availability}} refresh={w.refresh} onWallet={() => setTab("wallet")} />}
        {tab === "wallet" && <WalletScreen onBack={() => setTab("home")} />}
        {tab === "trips" && (
          <>
            <SectionTitle eyebrow={t("trips.eyebrow")} title={t("trips.title")} />
            {mine.length ? mine.map((b: any) => <Trip key={b.id} trip={b} refresh={w.refresh} />) : <Empty icon="map-outline" title={t("trips.empty.title")} text={t("trips.empty.text")} />}
          </>
        )}
        {tab === "inbox" && <InboxScreen data={data} refresh={w.refresh} setError={w.setError} />}
        {tab === "support" && <SupportScreen data={data} refresh={w.refresh} />}
        {tab === "account" && (
          <AccountScreen data={data} signout={signout} goSupport={() => setTab("support")}>
            <AccountExtras
              data={data}
              refresh={w.refresh}
              onDeleted={async () => {
                await stopTracking().catch(() => {});
                await unregisterPush().catch(() => {});
                await w.signout();
              }}
            />
          </AccountScreen>
        )}
      </ScrollView>
      <TabBar tabs={tabs} tab={tab} setTab={setTab} />
      {offers.offer && (
        <OfferPopup
          key={offers.offer.id}
          offer={offers.offer as Offer}
          skew={offers.skew}
          onAccept={async (o) => {
            const receipt = await api(`bookings/${o.bookingId}/assign`, { driverId: w.data.me.id, offerId: o.id });
            offers.markAccepted(o);
            w.applyBooking(receipt.booking);
            setTab("home");
            void w.refresh().catch(() => setToast("Ride accepted. The dashboard will reconnect automatically."));
            void startTracking().catch(() => setToast("Ride accepted. Enable location sharing so your customer can follow your arrival."));
          }}
          onDecline={async (o) => {
            await api("driver/offers/pass", { offerId: o.id });
            setToast(t("offer.passed"));
          }}
          onMissed={() => setToast(t("offer.missedToast"))}
          onDone={offers.close}
        />
      )}
    </View>
  );
}

export default function App() {
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style={intro ? "light" : "dark"} />
        {intro ? (
          <IntroSplash logo={logos.light} subtitle="PARTNER" onDone={() => setIntro(false)} />
        ) : (
          <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
            <Partner />
          </SafeAreaView>
        )}
      </I18nProvider>
    </SafeAreaProvider>
  );
}
