import React, { useEffect, useState } from "react";
import { Text, Alert, View, Switch, Pressable } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as DocumentPicker from "expo-document-picker";
import { api, money } from "./api";
import { startTracking, stopTracking, trackingActive } from "./location";
import { Card, Button, Field, Choices, Badge, Banner, Empty, Icon, SectionTitle, colors, errorText, s, tap } from "./ui";
import { SearchingWheel, SteeringStrip } from "./Steering";
import { Trip } from "./Trips";
import Earnings from "./Earnings";
import Planner from "./Planner";
import { useT } from "./i18n";

const kinds = [
  ["licence", "docs.licence", "card-outline"],
  ["identity", "docs.identity", "person-outline"],
  ["assessment", "docs.assessment", "speedometer-outline"],
] as const;

export default function DriverScreen({ data, refresh, onWallet }: { data: any; refresh: () => Promise<void>; onWallet?: () => void }) {
  const [wallet, setWallet] = useState<any>(null);
  useEffect(() => {
    let on = true;
    api("billing/wallet").then((v) => on && setWallet(v.driver)).catch(() => {});
    return () => {
      on = false;
    };
  }, [data?.serverTime]);
  const t = useT();
  const d = data.driver;
  const [tracking, setTracking] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [phone, setPhone] = useState(d?.phone || ""),
    [licence, setLicence] = useState(d?.licence || ""),
    [expiry, setExpiry] = useState(d?.licence_expiry || ""),
    [dob, setDob] = useState(d?.date_of_birth || ""),
    [city, setCity] = useState(d?.city_id || data.cities[0]?.id || ""),
    [showDocs, setShowDocs] = useState(false);
  const mine = data.bookings.filter((b: any) => b.driver_id === data.me.id);
  const activeTrip = mine.find((b: any) => ["assigned", "arrived", "in_progress"].includes(b.status));
  const active = !!activeTrip;
  useEffect(() => {
    trackingActive()
      .then(setTracking)
      .catch(() => setTracking(false));
    if (!d?.online && !active)
      stopTracking()
        .then(() => setTracking(false))
        .catch(() => {});
  }, [d?.online, active]);
  async function run(task: () => Promise<unknown>, success = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r: any = await task();
      await refresh();
      setTracking(await trackingActive());
      if (success || r?.message) setNotice(r?.message || success);
    } catch (e) {
      setError(errorText(e, "Request failed"));
    } finally {
      setBusy(false);
    }
  }
  const approved = d?.verification === "approved";
  const daysLeft: number | undefined = data.licenceDaysLeft;
  const docState = (k: string) => {
    const docs = data.documents.filter((doc: any) => doc.owner_id === data.me.id && doc.kind === k);
    return docs.some((x: any) => x.status === "pending") ? "pending" : docs.some((x: any) => x.status === "approved") ? "approved" : docs.length ? "rejected" : "required";
  };
  function upload(kind: string, label: string) {
    run(async () => {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) throw Error("Maximum file size is 5 MB");
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as any);
      await api("documents", form);
      return { message: t("docs.uploaded", { name: label }) };
    });
  }
  const documentsCard = (title: string, allowReplace: boolean) => (
    <Card>
      <Text style={s.h2}>{title}</Text>
      <Text style={s.muted}>{t("docs.hint")}</Text>
      {kinds.map(([kind, key, icon]) => {
        const st = docState(kind);
        const label = t(key);
        return (
          <View key={kind} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: st === "approved" ? colors.brandSoft : colors.surface3, alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={18} color={st === "approved" ? colors.brandDeep : colors.ink2} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.h3}>{label}</Text>
              <Badge value={st} />
            </View>
            {(allowReplace || st !== "approved") && <Button small secondary icon="cloud-upload-outline" disabled={busy} title={t("docs.upload")} onPress={() => upload(kind, label)} />}
          </View>
        );
      })}
    </Card>
  );
  return (
    <>
      <SectionTitle eyebrow={t("drive.eyebrow")} title={t("drive.title")} />
      {approved && daysLeft !== undefined && daysLeft <= 30 ? (
        <Card style={{ borderColor: colors.warn, backgroundColor: colors.warnSoft }}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Icon name="alert-circle" size={22} color={colors.warn} />
            <Text style={[s.text, { flex: 1, fontSize: 14.5 }]}>{daysLeft < 0 ? t("licence.expired") : t("licence.banner", { n: daysLeft })}</Text>
          </View>
          <Button small variant="dark" icon="cloud-upload-outline" title={t("licence.upload")} disabled={busy} onPress={() => upload("licence", t("docs.licence"))} />
        </Card>
      ) : null}
      <Card dark style={{ paddingTop: approved && d.online ? 0 : 18 }}>
        {approved && d.online ? <SteeringStrip height={30} speed={2600} style={{ marginHorizontal: -18, marginBottom: 6 }} /> : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[s.eyebrow, { color: colors.brand, marginBottom: 0 }]}>{t("earn.title")} · {t("earn.today")}</Text>
          <Badge value={d ? d.verification : "not applied"} />
        </View>
        <Text style={[s.price, { color: "#fff", fontSize: 38 }]}>{money(data.earnings?.today || 0)}</Text>
        <Text style={{ color: "#9FB7AE", fontSize: 13 }}>{t("earn.trips", { n: data.earnings?.todayTrips || 0 })}</Text>
        {approved && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.night2, borderRadius: 16, padding: 14, marginTop: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.online ? colors.brand : colors.subtle }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{d.online ? t("drive.online") : t("drive.offline")}</Text>
                <Text style={{ color: "#7F978E", fontSize: 12.5 }}>{d.online ? t("drive.onlineHint") : t("drive.offlineHint")}</Text>
              </View>
            </View>
            <Switch
              accessibilityLabel="Availability"
              value={!!d.online}
              disabled={busy}
              trackColor={{ true: colors.brandStrong, false: "#2B423A" }}
              thumbColor="#fff"
              onValueChange={() => {
                tap();
                run(async () => {
                  await api("driver/availability", { online: !d.online });
                  if (d.online && !active) await stopTracking();
                });
              }}
            />
          </View>
        )}
      </Card>
      {notice ? <Banner tone="good" text={notice} onClose={() => setNotice("")} /> : null}
      {error ? <Banner text={error} onClose={() => setError("")} /> : null}
      {approved ? (
        <>
          {activeTrip && (
            <>
              <Text style={s.h2}>{t("drive.active")}</Text>
              <Trip trip={activeTrip} refresh={refresh} />
            </>
          )}
          {d.online && !activeTrip && (
            <Card dark style={{ alignItems: "center", paddingVertical: 8 }}>
              <SearchingWheel size={72} />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17, marginTop: -10 }}>{t("drive.looking")}</Text>
              <Text style={{ color: "#9FB7AE", textAlign: "center", fontSize: 13.5, paddingHorizontal: 10, paddingBottom: 8 }}>{t("drive.lookingHint")}</Text>
            </Card>
          )}
          <Earnings data={data} />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={s.h3}>{t("drive.location")}</Text>
              <Badge value={tracking ? "on" : "off"} tone={tracking ? "good" : "neutral"} />
            </View>
            <Text style={s.muted}>{t("drive.locationHint")}</Text>
            <Button
              variant={tracking ? "dark" : "secondary"}
              icon={tracking ? "stop-circle-outline" : "locate-outline"}
              disabled={busy || (!d.online && !active)}
              title={tracking ? t("drive.stopLocation") : t("drive.shareLocation")}
              onPress={() => {
                if (tracking) run(stopTracking, "Location sharing stopped.");
                else
                  Alert.alert(
                    t("drive.shareLocation") + "?",
                    "DRIOZ will send your precise location to Operations and assigned customers while you are online or driving, including when the screen is locked. Android shows a persistent notification. You can stop sharing here.",
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      { text: t("drive.shareLocation"), onPress: () => run(startTracking, "Location sharing is on.") },
                    ],
                  );
              }}
            />
            {d.lat != null && d.lng != null ? (
              <>
                <MapView style={{ height: 180, borderRadius: 16 }} region={{ latitude: d.lat, longitude: d.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }}>
                  <Marker coordinate={{ latitude: d.lat, longitude: d.lng }} title="GPS" pinColor={colors.brandStrong} />
                </MapView>
                <Text style={s.muted}>{d.location_at ? new Date(d.location_at).toLocaleTimeString() : "—"}</Text>
              </>
            ) : null}
          </Card>
          {/* Ride credit pays the platform fee on each ride; offers pause when it runs out. */}
          <Pressable accessibilityRole="button" accessibilityLabel={t("wallet.open")} onPress={onWallet} style={{ backgroundColor: colors.night, borderRadius: 20, padding: 20, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[s.eyebrow, { color: colors.brand }]}>{t("wallet.credit")}</Text>
              <Text style={{ color: "#fff", fontWeight: "600" }}>{t("wallet.open")} ↗</Text>
            </View>
            <Text style={{ color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -1 }}>{wallet ? money(Math.max(0, Number(wallet.promo) + Number(wallet.recharge))) : "—"}</Text>
            <Text style={{ color: "#c9d6d1", fontSize: 12 }}>{wallet && !wallet.couponRedeemed ? t("wallet.welcome") : t("wallet.earnings", { amount: wallet ? money(Number(wallet.earnings || 0)) : "—" })}</Text>
          </Pressable>
          <Planner plans={data.plans || []} refresh={refresh} />
          {showDocs ? (
            documentsCard(t("docs.updateTitle"), true)
          ) : (
            <Button secondary icon="document-text-outline" title={t("docs.updateTitle")} onPress={() => setShowDocs(true)} />
          )}
        </>
      ) : (
        <>
          <Card>
            <Text style={s.h2}>{t("onb.title")}</Text>
            <Text style={s.muted}>{d ? t("onb.saved") : t("onb.start")}</Text>
            {d?.review_note ? <Banner tone="warn" text={"Operations: " + d.review_note} /> : null}
            <Text style={s.label}>{t("onb.city")}</Text>
            <Choices segmented={false} value={city} set={setCity} values={data.cities.map((c: any) => ({ label: c.name, value: c.id }))} />
            <Field label={t("onb.mobile")} value={phone} onChange={setPhone} keyboard="phone-pad" placeholder="+919876543210" />
            <Field label={t("onb.licence")} value={licence} onChange={setLicence} autoCapitalize="none" />
            <Field label={t("onb.expiry")} value={expiry} onChange={setExpiry} placeholder="YYYY-MM-DD" hint={t("onb.dateHint")} keyboard="numeric" />
            <Field label={t("onb.dob")} value={dob} onChange={setDob} placeholder="YYYY-MM-DD" hint={t("onb.dateHint")} keyboard="numeric" />
            <Button
              busy={busy}
              title={d ? t("onb.update") : t("onb.submit")}
              icon="paper-plane-outline"
              onPress={() =>
                run(() =>
                  api("driver/apply", {
                    cityId: city,
                    phone: phone.replace(/[\s()-]/g, ""),
                    licence: licence.trim(),
                    licenceExpiry: expiry.trim(),
                    ...(dob.trim() ? { dateOfBirth: dob.trim() } : {}),
                  }),
                )
              }
            />
          </Card>
          {d ? documentsCard(t("docs.title"), false) : null}
        </>
      )}
    </>
  );
}
