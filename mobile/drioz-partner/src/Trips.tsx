import {localMoney,localPricing} from './local-money';
import React, { useState } from "react";
import { View, Text, Alert, Linking, Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { api, money } from "./api";
import { Card, Button, Field, Badge, Banner, Choices, Icon, s, colors, errorText, tap } from "./ui";
import { SteeringStrip } from "./Steering";
import Inspection from "./Inspection";
import { useT } from "./i18n";

const quick = ["on_way", "late5", "late10", "arrived_gate", "cant_find"] as const;
const rupeesToPaise = (v: string) => Math.max(0, Math.round(Number(v || 0) * 100));

/** Partner trip card: arrival → car check → start code → after-trip check → complete with extras → rate. */
export function Trip({ trip, refresh }: { trip: any; refresh: () => Promise<void> }) {
  const t = useT();
  const money=(n:number)=>localMoney(n,trip.breakdown);
  const cashChoice=(()=>{try{return JSON.parse(trip.payment_choice||"{}").method==='cash'}catch{return false}})();
  const [pin, setPin] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [inspect, setInspect] = useState<"pre" | "post" | null>(null),
    [finishing, setFinishing] = useState(false),
    [stars, setStars] = useState(0),
    [comment, setComment] = useState(""),
    [cancelOpen, setCancelOpen] = useState(false),
    [cancelReason, setCancelReason] = useState(""),
    [cancelChoice, setCancelChoice] = useState("");
  let info: any = {};
  try {
    info = JSON.parse(trip.breakdown || "{}");
  } catch {}
  const packageHours = Number(info.hours || 0);
  const [hours, setHours] = useState(packageHours ? String(packageHours) : "");
  const [tolls, setTolls] = useState("");
  const [parking, setParking] = useState("");
  const done = String(trip.inspections || "").split(",");
  const preDone = done.includes("pre"),
    postDone = done.includes("post");
  const active = ["assigned", "arrived", "in_progress"].includes(trip.status);
  const typeName = trip.trip_type === "one-way" ? "One way" : trip.trip_type === "return" ? "Round trip" : trip.trip_type === "outstation" ? "Outstation" : trip.trip_type;

  async function act(path: string, data?: unknown, success = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await api(path, data);
      if (data !== undefined) void refresh().catch(() => setNotice("Update saved. The dashboard will reconnect automatically."));
      if (success || r?.message) setNotice(r?.message || success);
      return r;
    } catch (e) {
      setError(errorText(e, "Request failed"));
    } finally {
      setBusy(false);
    }
  }
  async function sos() {
    Alert.alert(t("sos.title"), t("sos.body"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("sos.call"), onPress: () => Linking.openURL("tel:112") },
      {
        text: t("sos.send"),
        style: "destructive",
        onPress: async () => {
          let point: { lat: number; lng: number } | undefined;
          try {
            const p = (await Location.getLastKnownPositionAsync()) || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
            if (p) point = { lat: p.coords.latitude, lng: p.coords.longitude };
          } catch {}
          const r = await act(`bookings/${trip.id}/sos`, { ...(point ? { point } : {}) });
          if (r) Alert.alert("SOS", t("sos.sent"), [{ text: t("sos.call"), onPress: () => Linking.openURL("tel:112") }, { text: "OK" }]);
        },
      },
    ]);
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[s.label, { marginBottom: 0, letterSpacing: 1 }]}>DR-{trip.id.slice(0, 8).toUpperCase()}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {active || (trip.status === "completed" && Date.now() - Number(trip.completed_at || trip.updated_at) < 6 * 3600000) ? (
            <Pressable accessibilityRole="button" accessibilityLabel="SOS" onPress={sos} style={{ backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ color: "#fff", fontWeight: "900", letterSpacing: 1 }}>{t("sos.button")}</Text>
            </Pressable>
          ) : null}
          <Badge value={trip.status} />
        </View>
      </View>
      {["assigned", "arrived"].includes(trip.status) && (
        <View style={{ gap: 12 }}>
          <Button secondary disabled={busy} icon="close-circle-outline" title={t("trip.cancel")} onPress={() => setCancelOpen(!cancelOpen)} />
          {cancelOpen && (
            <>
              <Text style={s.label}>{t("trip.cancelWhy")}</Text>
              <Choices
                segmented={false}
                value={cancelChoice}
                set={setCancelChoice}
                values={[
                  { label: t("trip.cancelVehicle"), value: "Vehicle or travel issue" },
                  { label: t("trip.cancelEmergency"), value: "Personal emergency" },
                  { label: t("trip.cancelCustomer"), value: "Customer unavailable" },
                  { label: t("trip.cancelOther"), value: "Other" },
                ]}
              />
              {cancelChoice === "Other" && <Field label={t("trip.cancelReason")} value={cancelReason} onChange={setCancelReason} multiline maxLength={500} />}
              <Text style={s.muted}>{t("trip.cancelNote")}</Text>
              <Button
                secondary
                busy={busy}
                disabled={!cancelChoice || (cancelChoice === "Other" && cancelReason.trim().length < 3)}
                title={t("trip.cancelConfirm")}
                onPress={() =>
                  Alert.alert(t("trip.cancelTitle"), t("trip.cancelBody"), [
                    { text: t("trip.keep"), style: "cancel" },
                    {
                      text: t("trip.cancel"),
                      style: "destructive",
                      onPress: () =>
                        act(`bookings/${trip.id}/status`, { status: "cancelled", reason: cancelChoice === "Other" ? cancelReason.trim().slice(0, 500) : cancelChoice }, t("trip.cancelled")),
                    },
                  ])
                }
              />
            </>
          )}
        </View>
      )}
      {trip.status === "in_progress" && (
        <View style={{ borderRadius: 14, overflow: "hidden" }}>
          <SteeringStrip height={34} speed={2200} />
          <Text style={{ position: "absolute", alignSelf: "center", top: 8, color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 2, backgroundColor: colors.night, paddingHorizontal: 8 }}>{t("trip.onRoad")}</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ alignItems: "center", paddingTop: 5 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.brandStrong }} />
          <View style={{ width: 2, flex: 1, backgroundColor: colors.line, marginVertical: 4 }} />
          <View style={{ width: 12, height: 12, borderRadius: 3, borderWidth: 3, borderColor: colors.ink }} />
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.subtle, letterSpacing: 1 }}>{t("trip.pickup")}</Text>
            <Text style={s.h3}>{trip.pickup}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.subtle, letterSpacing: 1 }}>{t(trip.trip_type === "return" ? "trip.returnTo" : "trip.destination")}</Text>
            <Text style={s.h3}>{trip.destination}</Text>
          </View>
        </View>
      </View>
      <Text style={s.muted}>
        {typeName}
        {packageHours ? ` · ${packageHours} hrs` : ""} · {trip.transmission}
        {info.vehicleCategory ? ` · ${info.vehicleCategory}` : ""}
        {"\n"}
        {trip.scheduled_at ? new Date(trip.scheduled_at).toLocaleString() : t("trip.immediate")}
        {trip.customer_name ? ` · ${t("trip.customer")} ${trip.customer_name}` : ""}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
        <View>
          <Text style={s.muted}>{t("trip.earnings")}</Text>
          <Text style={[s.price, { fontSize: 26 }]}>{money(Number(trip.partner_fare))}</Text>
        </View>
        {safeExtras(trip).total ? (
          <Text style={s.muted}>
            incl. {money(safeExtras(trip).partner)} extras
          </Text>
        ) : null}
      </View>

      {["assigned", "arrived"].includes(trip.status) && (
        <View style={{ gap: 6 }}>
          <Text style={s.label}>{t("trip.quick")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {quick.map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  tap();
                  act(`bookings/${trip.id}/message`, { template: k }, t("msg.sent"));
                }}
                style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}
              >
                <Text style={{ fontWeight: "600", color: colors.ink2 }}>{t(`msg.${k}` as any)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {trip.status === "assigned" && <Button busy={busy} icon="flag" title={t("trip.confirmArrival")} onPress={() => act(`bookings/${trip.id}/status`, { status: "arrived" })} />}
      {["assigned", "arrived"].includes(trip.status) &&
        (preDone ? (
          <Step done label={t("trip.preDone")} />
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={s.muted}>{t("trip.preCheckHint")}</Text>
            <Button variant="dark" icon="clipboard-outline" title={t("trip.preCheck")} onPress={() => setInspect("pre")} />
          </View>
        ))}
      {trip.status === "arrived" && (
        <View style={{ opacity: preDone ? 1 : 0.4 }} pointerEvents={preDone ? "auto" : "none"}>
          <Field label={t("trip.code")} value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))} keyboard="numeric" placeholder="••••••" maxLength={6} />
          <Button busy={busy} disabled={!preDone || !/^\d{6}$/.test(pin)} icon="play" title={t("trip.start")} onPress={() => act(`bookings/${trip.id}/status`, { status: "in_progress", code: pin })} />
        </View>
      )}
      {trip.status === "in_progress" &&
        (postDone ? (
          <>
            <Step done label={t("trip.postDone")} />
            <Button busy={busy} icon="checkmark-done" title={t("trip.complete")} onPress={() => setFinishing(true)} />
          </>
        ) : (
          <Button variant="dark" icon="clipboard-outline" title={t("trip.postCheck")} onPress={() => setInspect("post")} />
        ))}
      {active && (
        <Button
          secondary
          icon="navigate"
          title={t(trip.status === "in_progress" ? "trip.navigateDrop" : "trip.navigate")}
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/dir/?api=1&destination=${trip.status === "in_progress" ? `${trip.destination_lat},${trip.destination_lng}` : `${trip.pickup_lat},${trip.pickup_lng}`}`,
            )
          }
        />
      )}

      {trip.status === "completed" &&
        (trip.my_rating ? (
          <Text style={s.muted}>{t("rate.yours", { n: trip.my_rating })}</Text>
        ) : (
          <View style={{ gap: 8, backgroundColor: colors.surface2, borderRadius: 16, padding: 12 }}>
            <Text style={s.h3}>{t("rate.title")}</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} accessibilityLabel={`${n} stars`} onPress={() => { tap(); setStars(n); }} hitSlop={6}>
                  <Icon name={n <= stars ? "star" : "star-outline"} size={32} color={n <= stars ? "#F5B700" : colors.subtle} />
                </Pressable>
              ))}
            </View>
            {stars ? <Field label={`${t("rate.comment")} · ${t("common.optional")}`} value={comment} onChange={setComment} autoCapitalize="sentences" maxLength={500} /> : null}
            <Button small disabled={!stars} busy={busy} title={t("rate.submit")} onPress={() => act(`bookings/${trip.id}/rate`, { stars, comment: comment.trim() }, t("rate.thanks"))} />
          </View>
        ))}

      {notice ? <Banner tone="good" text={notice} onClose={() => setNotice("")} /> : null}
      {trip.status==='completed'&&<><Text style={s.muted}>{Number(trip.paid_amount)>=Number(trip.fare)?'Paid · '+String(trip.paid_methods||'payment'):cashChoice?'Cash selected · awaiting your confirmation':'Payment due'}</Text>{cashChoice&&Number(trip.paid_amount)<Number(trip.fare)&&<Button title="Received cash" disabled={busy} onPress={()=>Alert.alert('Confirm cash received',`Have you received ${money(Number(trip.fare)-Number(trip.paid_amount||0))} in full?`,[{text:'Cancel',style:'cancel'},{text:'Received cash',onPress:()=>{void act(`bookings/${trip.id}/cash-received`,{})}}])}/>}</>}
      {error ? <Banner text={error} onClose={() => setError("")} /> : null}

      <Inspection
        bookingId={trip.id}
        phase={inspect || "pre"}
        visible={!!inspect}
        onClose={() => setInspect(null)}
        onSaved={async (m) => {
          setInspect(null);
          setNotice(m);
          await refresh().catch(() => {});
        }}
      />
      <Modal visible={finishing} animationType="slide" transparent onRequestClose={() => setFinishing(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(7,17,14,.6)" }}>
          <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
            <ScrollView contentContainerStyle={[s.content, { paddingBottom: 30 }]} keyboardShouldPersistTaps="handled">
              <Text style={s.h2}>{t("done.title")}</Text>
              <Text style={s.muted}>{t("done.hint")}</Text>
              {trip.trip_type !== "one-way" && packageHours ? (
                <Field label={t("done.hours")} value={hours} onChange={(v) => setHours(v.replace(/[^\d.]/g, "").slice(0, 5))} keyboard="numeric" hint={t("done.package", { n: packageHours })} />
              ) : null}
              <Field label={localPricing(trip.breakdown)?"Tolls paid · "+localPricing(trip.breakdown)!.currency:t("done.tolls")} value={tolls} onChange={(v) => setTolls(v.replace(/[^\d.]/g, "").slice(0, 7))} keyboard="numeric" placeholder="0" />
              <Field label={localPricing(trip.breakdown)?"Parking paid · "+localPricing(trip.breakdown)!.currency:t("done.parking")} value={parking} onChange={(v) => setParking(v.replace(/[^\d.]/g, "").slice(0, 7))} keyboard="numeric" placeholder="0" />
              <Button
                busy={busy}
                icon="checkmark-done"
                title={t("done.confirm")}
                onPress={async () => {
                  const multiplier=localPricing(trip.breakdown)?.inrPerUnit||1;const body: any = { status: "completed", tolls: Math.round(rupeesToPaise(tolls)*multiplier), parking: Math.round(rupeesToPaise(parking)*multiplier) };
                  if (trip.trip_type !== "one-way" && packageHours && hours) body.actualHours = Number(hours);
                  const r = await act(`bookings/${trip.id}/status`, body);
                  if (r) setFinishing(false);
                }}
              />
              <Button secondary title={t("common.cancel")} onPress={() => setFinishing(false)} />
              {error ? <Banner text={error} onClose={() => setError("")} /> : null}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </Card>
  );
}

function safeExtras(trip: any): any {
  try {
    return JSON.parse(trip.extras || "{}");
  } catch {
    return {};
  }
}

function Step({ label, done }: { label: string; done?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: done ? colors.brandSoft : colors.surface3, borderRadius: 12, padding: 10 }}>
      <Icon name={done ? "checkmark-circle" : "ellipse-outline"} size={20} color={done ? colors.brandDeep : colors.subtle} />
      <Text style={[s.text, { fontSize: 14.5, fontWeight: "600" }]}>{label}</Text>
    </View>
  );
}
