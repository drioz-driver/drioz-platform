import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { api, money, type Point } from "./kit";
import { Card, Button, Choices, Banner, SectionTitle, Icon, s, colors, errorText } from "./kit";
import { AddressPicker } from "./kit";
import SchedulePicker from "./SchedulePicker";
import { useI18n, type T } from "./i18n";

export type BookingDraft = { key: string; trip: any };
const placePoint = (p: any): Point => ({ lat: Number(p.lat), lng: Number(p.lng), label: String(p.address), city: "", country: "IN" });


function PlaceChips({ places, title, onPick }: { places: any[]; title: string; onPick: (p: Point) => void }) {
  if (!places.length) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: -2, marginBottom: 4 }}>
      <Text style={[s.muted, { fontSize: 12 }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {places.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${title}: ${p.label}`}
            onPress={() => onPick(placePoint(p))}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.brandSoft }}
          >
            <Icon name="bookmark" size={12} color={colors.brandDeep} />
            <Text style={{ color: colors.brandDeep, fontWeight: "700", fontSize: 12.5 }}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function BookingScreen({
  onBooked,
  cities = [],
  places = [],
  company = null,
  draft = null,
}: {
  onBooked: () => void;
  cities?: any[];
  places?: any[];
  company?: { id: string; name: string } | null;
  draft?: BookingDraft | null;
}) {
  const { t } = useI18n();
  const [pickup, setPickup] = useState<Point | null>(null),
    [drop, setDrop] = useState<Point | null>(null),
    [type, setType] = useState("one-way"),
    [hours, setHours] = useState("2"),
    [transmission, setTransmission] = useState("manual"),
    [vehicle, setVehicle] = useState("hatchback"),
    [timing, setTiming] = useState("now"),
    [when, setWhen] = useState(""),
    [direction, setDirection] = useState("return"),
    [result, setResult] = useState<any>(null),
    [coverage, setCoverage] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [billTo, setBillTo] = useState<"personal" | "company">("personal"),
    [prefilled, setPrefilled] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!draft) return;
    const trip = draft.trip;
    let info: any = {};
    try {
      info = JSON.parse(trip.breakdown || "{}");
    } catch {}
    const type = ["one-way", "return", "outstation"].includes(trip.trip_type) ? trip.trip_type : "one-way";
    setType(type);
    setPickup({ lat: Number(trip.pickup_lat), lng: Number(trip.pickup_lng), label: String(trip.pickup), city: "", country: "IN" });
    setDrop(type === "return" ? null : { lat: Number(trip.destination_lat), lng: Number(trip.destination_lng), label: String(trip.destination), city: "", country: "IN" });
    if (info.hours) setHours(String(info.hours));
    else setHours(type === "outstation" ? "12" : "2");
    if (info.outstationDirection) setDirection(info.outstationDirection);
    setTransmission(trip.transmission === "automatic" ? "automatic" : "manual");
    if (info.vehicleCategory) setVehicle(info.vehicleCategory);
    setTiming(type === "outstation" ? "later" : "now");
    setPrefilled(true);
  }, [draft?.key]);
  const version = useRef(0),
    key = useRef("");
  const scheduled = timing === "later" || type === "outstation";
  // Pickup times are always Indian Standard Time, whatever the phone’s time zone.
  const scheduledAt = scheduled ? (when ? Date.parse(when.replace(" ", "T") + ":00+05:30") : NaN) : null;
  const signature = JSON.stringify({ pickup, drop, type, hours, transmission, vehicle, scheduledAt, direction });
  function input(cityId: string) {
    return {
      cityId,
      pickup: pickup!.label,
      destination: type === "return" ? undefined : drop!.label,
      pickupPoint: { lat: pickup!.lat, lng: pickup!.lng },
      ...(type === "return" ? {} : { destinationPoint: { lat: drop!.lat, lng: drop!.lng } }),
      tripType: type,
      ...(type === "one-way" ? {} : { hours: Number(hours) }),
      ...(type === "outstation" ? { outstationDirection: direction } : {}),
      vehicleCategory: vehicle,
      transmission,
      scheduledAt,
    };
  }
  useEffect(() => {
    const generation = ++version.current;
    setResult(null);
    setCoverage(null);
    setMessage("");
    key.current = Crypto.randomUUID();
    if (!pickup) return;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        // Coverage and fare come back in one request instead of two sequential ones.
        const priced = type === "return" || !!drop;
        const res = await api("price", {
          coverage: {
            cityId: "worldwide",
            pickupPoint: { lat: pickup.lat, lng: pickup.lng },
            pickupRegion: { city: (pickup.city || "").slice(0, 120), country: (pickup.country || "").slice(0, 3) },
          },
          ...(priced && !Number.isNaN(scheduledAt) ? { trip: input("") } : {}),
        });
        if (generation !== version.current) return;
        setCoverage(res.coverage);
        if (res.estimate) setResult(res.estimate);
        else if (res.message) setMessage(res.message);
      } catch (e) {
        if (generation === version.current) setMessage(errorText(e, "Unable to estimate"));
      } finally {
        if (generation === version.current) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      version.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  async function book() {
    if (!result || !coverage?.cityId || busy || Number.isNaN(scheduledAt)) return;
    setBusy(true);
    setMessage("");
    try {
      if (result.expiresAt < Date.now()) throw Error(t("book.expired"));
      const quote = await api("quote", input(coverage.cityId));
      if (quote.total !== result.total) {
        setResult(null);
        throw Error(t("book.fareChanged"));
      }
      await api("bookings", { quoteId: quote.id, key: key.current, ...(company && billTo === "company" ? { billTo: "company" } : {}) });
      setPickup(null);
      setDrop(null);
      setPrefilled(false);
      onBooked();
    } catch (e) {
      setMessage(errorText(e, "Booking failed"));
    } finally {
      setBusy(false);
    }
  }
  const cityName = cities.find((c: any) => c.id === coverage?.cityId)?.name || coverage?.regionName;
  const served = coverage && coverage.status !== "not_served";
  return (
    <>
      <SectionTitle eyebrow={t("book.eyebrow")} title={t("book.title")} />
      {prefilled ? <Banner tone="good" text={t("book.draftLoaded")} onClose={() => setPrefilled(false)} /> : null}
      <Card>
        <Choices
          value={type}
          set={(v) => {
            setType(v);
            setHours(v === "outstation" ? "12" : "2");
          }}
          values={[
            { label: t("book.oneWay"), value: "one-way" },
            { label: t("book.roundTrip"), value: "return" },
            { label: t("book.outstation"), value: "outstation" },
          ]}
        />
        <View style={{ gap: 0 }}>
          <AddressPicker title={t("book.pickup")} kind="pickup" point={pickup} onSelect={setPickup} />
          <PlaceChips places={places} title={t("book.pickupFrom")} onPick={setPickup} />
          {type !== "return" ? <AddressPicker title={t("book.destination")} kind="destination" point={drop} onSelect={setDrop} initial={pickup} /> : null}
          {type !== "return" ? <PlaceChips places={places} title={t("book.dropAt")} onPick={setDrop} /> : null}
        </View>
        {type !== "outstation" && (
          <>
            <Text style={s.label}>{t("book.when")}</Text>
            <Choices value={timing} set={setTiming} values={[{ label: t("book.now"), value: "now" }, { label: t("book.schedule"), value: "later" }]} />
          </>
        )}
        {scheduled ? <SchedulePicker value={when} onChange={setWhen} /> : null}
        {type !== "one-way" && (
          <>
            <Text style={s.label}>{type === "return" ? t("book.package") : t("book.usage")}</Text>
            <Choices
              segmented={false}
              value={hours}
              set={setHours}
              values={(type === "return" ? [2, 4, 6, 8, 12] : [12, 24, 36, 48, 60, 72]).map((n) => ({ label: t("book.hrs", { n }), value: String(n) }))}
            />
          </>
        )}
        {type === "outstation" && (
          <Choices value={direction} set={setDirection} values={[{ label: t("book.roundTrip"), value: "return" }, { label: t("book.oneWay"), value: "one-way" }]} />
        )}
        <Text style={s.label}>{t("book.transmission")}</Text>
        <Choices value={transmission} set={setTransmission} values={[{ label: t("book.manual"), value: "manual" }, { label: t("book.automatic"), value: "automatic" }]} />
        <Text style={s.label}>{t("book.car")}</Text>
        <Choices
          segmented={false}
          value={vehicle}
          set={setVehicle}
          values={["hatchback", "sedan", "suv", "luxury"].map((v) => ({ label: v === "suv" ? "SUV" : v[0].toUpperCase() + v.slice(1), value: v }))}
        />
        {company ? (
          <>
            <Text style={s.label}>{t("book.billTo")}</Text>
            <Choices value={billTo} set={(v) => setBillTo(v as "personal" | "company")} values={[{ label: t("book.personal"), value: "personal" }, { label: company.name, value: "company" }]} />
          </>
        ) : null}
      </Card>
      {coverage?.message ? (
        <Banner tone={coverage.status === "available" ? "good" : "warn"} text={coverage.message} />
      ) : null}
      {loading && !result && pickup ? <Text style={[s.muted, { textAlign: "center" }]}>{t("book.checking")}</Text> : null}
      {result && served ? (
        <Card dark>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[s.eyebrow, { color: colors.brand, marginBottom: 0 }]}>{t("book.fare")}</Text>
            {cityName ? <Text style={{ color: "#9FB7AE", fontSize: 13 }}>{cityName}</Text> : null}
          </View>
          <Text style={[s.price, { color: "#fff", fontSize: 40 }]}>{money(result.total)}</Text>
          <View style={{ gap: 2 }}>
            {[
              [t("book.serviceFare"), result.base, true],
              [t("book.additionalHours"), result.extra, false],
              [t("book.night"), result.night, false],
              [result.surgeLabel || t("book.surge"), result.surge, false],
              [t("book.tax"), result.tax, false],
            ]
              .filter(([, v, always]) => always || Number(v) > 0)
              .map(([label, v]) => (
                <View key={String(label)} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: "#9FB7AE" }}>{label}</Text>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>{money(Number(v))}</Text>
                </View>
              ))}
          </View>
          <Text style={{ color: "#7F978E", fontSize: 12.5, lineHeight: 18 }}>
            {t("book.note")}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <Icon name="time-outline" size={15} color={colors.brand} />
            <Text style={{ color: "#CFE0D9", fontSize: 12.5, lineHeight: 18, flex: 1 }}>
              {Number(result.cancellationFee) > 0 ? t("book.cancelPolicy", { min: result.freeCancelMinutes || 5, fee: money(result.cancellationFee) }) : t("book.cancelFree")}
            </Text>
          </View>
          {!result.bookingAvailable ? <Banner tone="warn" text={t("book.unavailable")} /> : null}
          <Button busy={busy} disabled={!result.bookingAvailable} icon="flash" title={t("book.cta")} onPress={book} />
        </Card>
      ) : null}
      {message ? <Banner text={message} onClose={() => setMessage("")} /> : null}
      {!pickup ? (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 4 }}>
          <Icon name="information-circle-outline" size={18} color={colors.muted} />
          <Text style={[s.muted, { flex: 1 }]}>{t("book.hint")}</Text>
        </View>
      ) : null}
    </>
  );
}
