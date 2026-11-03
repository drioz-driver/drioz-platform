import React, { useEffect, useState } from "react";
import { ScrollView, RefreshControl, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  AccountScreen,
  AuthScreen,
  Banner,
  Empty,
  Header,
  InboxScreen,
  IntroSplash,
  Loading,
  SectionTitle,
  SupportScreen,
  TabBar,
  Trip,
  WrongApp,
  Button,
  Card,
  colors,
  logos,
  s,
  useWorkspace,
  type TabDef,
} from "./src/kit";
import BookingScreen, { type BookingDraft } from "./src/BookingScreen";
import WalletScreen from "./src/WalletScreen";
import RequestsList from "./src/RequestsList";
import { DeleteAccountCard, LanguageCard, PhoneCard, PlacesCard } from "./src/AccountExtras";
import { I18nProvider, useI18n } from "./src/i18n";
import { onNotificationTap, registerPush, unregisterPush } from "./src/push";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Customer() {
  const { t } = useI18n();
  const w = useWorkspace({ pollMs: 10000, onSignOut: unregisterPush });
  const [tab, setTab] = useState("home");
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const signedIn = !!w.session?.user.id && !!w.data && w.data.me?.role !== "driver";
  useEffect(() => {
    if (signedIn) registerPush().catch(() => {});
  }, [signedIn, w.session?.user.id]);
  useEffect(
    () =>
      onNotificationTap((data) => {
        if (data.bookingId) setTab("trips");
        else setTab("inbox");
      }),
    [],
  );
  if (w.initial) return <Loading label={t("common.starting")} />;
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
          <Loading label={t("common.loadingJourneys")} />
        )}
      </ScrollView>
    );
  const { data } = w;
  if (data.me.role === "driver")
    return (
      <WrongApp
        title="This account can’t book rides"
        text="It is registered for driving with DRIOZ. Sign in with a customer account to book a driver."
        signout={w.signout}
      />
    );
  const mine = data.bookings.filter((b: any) => b.customer_id === data.me.id);
  const live = mine.filter((b: any) => ["requested", "assigned", "arrived", "in_progress"].includes(b.status));
  const unread = data.notifications.filter((n: any) => !n.read).length;
  const feeFor = (b: any) => Number(data.cities.find((c: any) => c.id === b.city_id)?.cancellation || 0);
  const bookAgain = (trip: any) => {
    setDraft({ key: trip.id + ":" + Date.now(), trip });
    setTab("home");
  };
  const tabs: TabDef[] = [
    { id: "home", label: t("tab.book"), icon: "wheel" },
    { id: "trips", label: t("tab.journeys"), icon: "map-outline", iconOn: "map", badge: live.length },
    { id: "wallet", label: t("tab.wallet"), icon: "wallet-outline", iconOn: "wallet" },
    { id: "inbox", label: t("tab.inbox"), icon: "notifications-outline", iconOn: "notifications", badge: unread },
    { id: "account", label: t("tab.account"), icon: "person-circle-outline", iconOn: "person-circle" },
  ];
  return (
    <View style={s.screen}>
      <Header me={data.me} badge={data.me.role !== "customer" ? "STAFF" : undefined} onAccount={() => setTab("account")} />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: 6 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={w.refreshing} onRefresh={w.reload} tintColor={colors.brandStrong} />}
      >
        {w.error ? <Banner text={w.error} onClose={() => w.setError("")} /> : null}
        {tab === "home" ? (
          <>
            {live.slice(0, 1).map((b: any) => (
              <Trip key={b.id} trip={b} refresh={w.refresh} cancellationFee={feeFor(b)} />
            ))}
            <BookingScreen
              cities={data.cities}
              places={data.places || []}
              company={data.company || null}
              draft={draft}
              onBooked={(booking) => {
                if(booking&&!booking.requiresLocationReview)w.applyBooking(booking);
                setDraft(null);
                w.reload();
                setTab("trips");
              }}
            />
          </>
        ) : null}
        {tab === "trips" ? (
          <>
            <SectionTitle eyebrow={t("journeys.eyebrow")} title={t("journeys.title")} />
            <RequestsList data={data} refresh={w.refresh} setError={w.setError} />
            {mine.map((b: any) => (
              <Trip key={b.id} trip={b} refresh={w.refresh} cancellationFee={feeFor(b)} onBookAgain={bookAgain} onPay={() => setTab("wallet")} />
            ))}
            {!mine.length ? <Empty icon="map-outline" title={t("journeys.emptyTitle")} text={t("journeys.emptyText")} /> : null}
          </>
        ) : null}
        {tab === "wallet" ? <WalletScreen onBack={() => setTab("account")} /> : null}
        {tab === "inbox" ? <InboxScreen data={data} refresh={w.refresh} setError={w.setError} /> : null}
        {tab === "support" ? <SupportScreen data={data} refresh={w.refresh} /> : null}
        {tab === "account" ? (
          <AccountScreen data={data} signout={w.signout}>
            <Card>
              <Button secondary icon="chatbubbles-outline" title={t("tab.support")} onPress={() => setTab("support")} />
            </Card>
            <LanguageCard />
            <PhoneCard me={data.me} refresh={w.refresh} />
            <PlacesCard places={data.places || []} refresh={w.refresh} />
            <DeleteAccountCard signout={w.signout} />
          </AccountScreen>
        ) : null}
      </ScrollView>
      <TabBar tabs={tabs} tab={tab} setTab={setTab} />
    </View>
  );
}

export default function App() {
  const [intro, setIntro] = useState(true);
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style={intro ? "light" : "dark"} />
        {intro ? (
          <IntroSplash logo={logos.light} onDone={() => setIntro(false)} />
        ) : (
          <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
            <Customer />
          </SafeAreaView>
        )}
        {intro ? <HideNativeSplash /> : null}
      </I18nProvider>
    </SafeAreaProvider>
  );
}
function HideNativeSplash() {
  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return null;
}
