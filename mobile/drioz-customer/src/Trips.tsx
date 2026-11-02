import React, { useEffect, useState } from "react";
import { View, Text, Alert, Share, Linking } from "react-native";
import * as Location from "expo-location";
import { api, apiOrigin, money } from "./api";
import { Card, Button, Badge, Banner, Row, Icon, s, colors, errorText, toneFor } from "./ui";
import { SearchingWheel, SteeringStrip } from "./Steering";
import LiveTracking from "./LiveTracking";
import RatingPrompt from "./RatingPrompt";
import { shareInvoicePdf } from "./invoice";
import { useI18n } from "./i18n";

export const FREE_CANCEL_MIN = 5;
const parse = (v: unknown) => {
  try {
    return JSON.parse(String(v || "{}"));
  } catch {
    return {};
  }
};

export function Trip({
  trip,
  refresh,
  cancellationFee = 0,
  onBookAgain,
  onPay,
}: {
  trip: any;
  refresh: () => Promise<void>;
  cancellationFee?: number;
  onBookAgain?: (trip: any) => void;
  onPay?: () => void;
}) {
  const { t } = useI18n();
  const [expiresAt, setExpiresAt] = useState(0), [clock, setClock] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const [startCode, setStartCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sosSent, setSosSent] = useState(false),
    [statement, setStatement] = useState<any>(null);
  async function act(path: string, data?: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await api(path, data);
      if (data !== undefined) await refresh().catch(() => {});
      return r;
    } catch (e) {
      setError(errorText(e, "Request failed"));
    } finally {
      setBusy(false);
    }
  }
  const active = ["assigned", "arrived", "in_progress"].includes(trip.status);
  const info = parse(trip.breakdown),
    extras = parse(trip.extras);
  const typeName =
    trip.trip_type === "one-way" ? t("book.oneWay") : trip.trip_type === "return" ? t("book.roundTrip") : trip.trip_type === "outstation" ? t("book.outstation") : trip.trip_type;
  const lateCancel =
    trip.status === "arrived" || (trip.status === "assigned" && trip.assigned_at && Date.now() - Number(trip.assigned_at) > FREE_CANCEL_MIN * 60000);
  const fee = lateCancel ? cancellationFee : 0;

  function cancel() {
    const body =
      fee > 0
        ? trip.status === "arrived"
          ? t("trip.cancelFeeArrived", { fee: money(fee) })
          : t("trip.cancelFee", { fee: money(fee), min: FREE_CANCEL_MIN })
        : t("trip.cancelBody");
    Alert.alert(t("trip.cancelTitle"), body, [
      { text: t("trip.keep"), style: "cancel" },
      {
        text: t("trip.confirmCancel"),
        style: "destructive",
        onPress: () => act(`bookings/${trip.id}/status`, { status: "cancelled", reason: "Customer cancelled in mobile app" }),
      },
    ]);
  }
  function sos() {
    Alert.alert(t("sos.title"), t("sos.body"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("sos.call"), onPress: () => Linking.openURL("tel:112") },
      {
        text: t("sos.send"),
        style: "destructive",
        onPress: async () => {
          let point: { lat: number; lng: number } | undefined;
          try {
            if ((await Location.requestForegroundPermissionsAsync()).status === "granted") {
              const p = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
                new Promise<null>((r) => setTimeout(() => r(null), 6000)),
              ]);
              if (p) point = { lat: p.coords.latitude, lng: p.coords.longitude };
            }
          } catch {}
          const r = await act(`bookings/${trip.id}/sos`, point ? { point } : {});
          if (r) {
            setSosSent(true);
            Alert.alert("SOS", t("sos.sent"), [{ text: t("sos.call"), onPress: () => Linking.openURL("tel:112") }, { text: "OK" }]);
          }
        },
      },
    ]);
  }
  async function shareLive() {
    const r = await act(`bookings/${trip.id}/share`, {});
    if (r?.path)
      Share.share({ message: `${t("trip.shareMessage")}: ${apiOrigin}${r.path}`, url: apiOrigin + r.path }).catch(() => {});
  }
  async function invoicePdf() {
    const inv = await act(`bookings/${trip.id}/invoice`);
    if (!inv) return;
    try {
      await shareInvoicePdf(inv);
    } catch (e) {
      setError(errorText(e, "Unable to create the PDF"));
    }
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[s.label, { marginBottom: 0, letterSpacing: 1 }]}>DR-{trip.id.slice(0, 8).toUpperCase()}</Text>
        <Badge value={t("status." + trip.status)} tone={toneFor(trip.status)} />
      </View>
      {trip.status === "requested" ? (
        <View style={{ backgroundColor: colors.night, borderRadius: 18, alignItems: "center", paddingBottom: 14, overflow: "hidden" }}>
          <SearchingWheel size={70} />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, marginTop: -8 }}>{t("trip.finding")}</Text>
          <Text style={{ color: "#9FB7AE", fontSize: 13, textAlign: "center", paddingHorizontal: 16 }}>{t("trip.findingText")}</Text>
        </View>
      ) : null}
      {trip.status === "in_progress" ? (
        <View style={{ borderRadius: 14, overflow: "hidden" }}>
          <SteeringStrip height={34} speed={2200} />
          <Text style={{ position: "absolute", alignSelf: "center", top: 8, color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 2, backgroundColor: colors.night, paddingHorizontal: 8 }}>
            {t("trip.onRoad")}
          </Text>
        </View>
      ) : null}
      {active ? <LiveTracking trip={trip} /> : null}
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
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.subtle, letterSpacing: 1 }}>
              {trip.trip_type === "return" ? t("trip.returnTo") : t("trip.destination")}
            </Text>
            <Text style={s.h3}>{trip.destination}</Text>
          </View>
        </View>
      </View>
      <Text style={s.muted}>
        {typeName}
        {info.hours ? ` · ${t("book.hrs", { n: info.hours })}` : ""} · {trip.transmission === "automatic" ? t("book.automatic") : t("book.manual")}
        {info.vehicleCategory ? ` · ${info.vehicleCategory}` : ""}
        {"\n"}
        {trip.scheduled_at ? new Date(trip.scheduled_at).toLocaleString() : t("trip.immediate")}
        {trip.driver_name ? ` · ${t("trip.driver", { name: trip.driver_name })}` : ""}
        {trip.driver_rating ? ` ★ ${Number(trip.driver_rating).toFixed(1)}` : ""}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
        <View>
          <Text style={s.muted}>{t("trip.agreedFare")}</Text>
          <Text style={[s.price, { fontSize: 26 }]}>{money(Number(trip.fare))}</Text>
        </View>
        {!!startCode && ["assigned", "arrived"].includes(trip.status) ? (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: 5, color: colors.brandDeep, fontVariant: ["tabular-nums"] }}>{expiresAt > clock ? startCode : t("trip.codeExpired")}</Text>
            <Text style={s.muted}>{t("trip.codeValid")}</Text>
          </View>
        ) : null}
      </View>
      {extras.extraTime || extras.tolls || extras.parking || trip.cancellation_fee ? (
        <View style={{ gap: 0 }}>
          {extras.extraTime ? <Row label={t("trip.extraTime", { h: extras.extraHours })} value={money(extras.extraTime + Number(extras.extraTimeTax || 0))} /> : null}
          {extras.tolls ? <Row label={t("trip.tolls")} value={money(extras.tolls)} /> : null}
          {extras.parking ? <Row label={t("trip.parking")} value={money(extras.parking)} /> : null}
          {trip.cancellation_fee ? <Row label={t("trip.cancellationFee")} value={money(trip.cancellation_fee)} /> : null}
        </View>
      ) : null}
      {["assigned", "arrived"].includes(trip.status) ? (
        <Button
          busy={busy}
          icon="key"
          title={t(startCode ? "trip.regenerateCode" : "trip.startCode")}
          onPress={async () => {
            const r = await act(`bookings/${trip.id}/start-code`, {});
            if (r?.code) { setStartCode(r.code); setExpiresAt(r.expiresAt); }
          }}
        />
      ) : null}
      {startCode ? <Text style={s.muted}>{t("trip.codeHint")}</Text> : null}
      {active || (trip.status === "completed" && Date.now() - Number(trip.completed_at || trip.updated_at) < 6 * 3600000) ? (
        <Button variant="danger" icon="warning" title={sosSent ? t("sos.call") : t("sos.button")} onPress={sosSent ? () => Linking.openURL("tel:112") : sos} />
      ) : null}
      {trip.status === "completed" ? <RatingPrompt trip={trip} refresh={refresh} /> : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button
          small
          secondary
          icon="receipt-outline"
          title={t("trip.statement")}
          disabled={busy}
          onPress={async () => {
            if (statement) return setStatement(null);
            const r = await act(`bookings/${trip.id}/invoice`);
            if (r) setStatement(r);
          }}
        />
        {trip.status === "completed" || trip.cancellation_fee ? (
          <Button small secondary icon="document-text-outline" title={t("trip.invoicePdf")} disabled={busy} onPress={invoicePdf} />
        ) : null}
        {active || trip.status === "requested" ? (
          <Button small secondary icon="share-social-outline" title={t("trip.share")} disabled={busy} onPress={shareLive} />
        ) : null}
        {trip.status === "completed" && onPay ? <Button small icon="card-outline" title={t("trip.pay")} onPress={onPay} /> : null}
        {(trip.status === "completed" || trip.status === "cancelled") && onBookAgain ? (
          <Button small secondary icon="repeat" title={t("trip.bookAgain")} onPress={() => onBookAgain(trip)} />
        ) : null}
        {["requested", "assigned", "arrived"].includes(trip.status) ? (
          <Button small variant="danger" title={t("trip.cancel")} disabled={busy} onPress={cancel} />
        ) : null}
      </View>
      {statement ? (
        <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name="receipt" size={16} color={colors.brandDeep} />
            <Text style={s.h3}>{t("trip.fareStatement")}</Text>
          </View>
          {statement.invoiceNumber ? <Text style={s.muted}>{t("trip.invoiceNo", { n: statement.invoiceNumber })}</Text> : null}
          {(statement.lines || []).map((l: any, i: number) => (
            <Row key={i} label={String(l.label)} value={money(Number(l.amount))} />
          ))}
          {statement.taxSplit ? (
            <>
              <Row label={t("trip.cgst")} value={money(statement.taxSplit.cgst)} />
              <Row label={t("trip.sgst")} value={money(statement.taxSplit.sgst)} />
            </>
          ) : statement.tax ? (
            <Row label={t("trip.tax")} value={money(statement.tax)} />
          ) : null}
          <Row label={t("trip.total")} value={money(Number(statement.total ?? statement.breakdown?.total))} strong />
          {statement.payments?.map((p: any) => (
            <Row key={p.reference} label={`${p.status} · ${String(p.method).replaceAll("_", " ")}`} value={money(p.amount)} />
          ))}
          <Text style={[s.muted, { marginTop: 8 }]}>{statement.note}</Text>
        </View>
      ) : null}
      {error ? <Banner text={error} onClose={() => setError("")} /> : null}
    </Card>
  );
}
