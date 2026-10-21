import React, { useEffect, useRef, useState } from "react";
import { Text, View, Pressable, BackHandler } from "react-native";
import * as Crypto from "expo-crypto";
import { api, money, type Point } from "./api";
import { Card, Button, Choices, Field, Route, colors, s } from "./ui";
import AddressPicker from "./AddressPicker";
import SchedulePicker from "./SchedulePicker";
export default function BookingScreen({ onBooked, onStageChange }: { onBooked: () => void; onStageChange?: () => void }) {
  const [stage, setStage] = useState(0), [retry, retryEstimate] = useState(0);
  function advance(next:number) { setStage(next); onStageChange?.(); }
  useEffect(()=>{if(!stage)return; const listener=BackHandler.addEventListener("hardwareBackPress",()=>{advance(stage-1);return true});return()=>listener.remove();},[stage]);
  const [pickup, P] = useState<Point | null>(null),
    [drop, D] = useState<Point | null>(null),
    [type, T] = useState("one-way"),
    [hours, H] = useState("2"),
    [transmission, TR] = useState("manual"),
    [vehicle, V] = useState("hatchback"),
    [timing, TI] = useState("now"),
    [date, DA] = useState(""),
    [direction, DI] = useState("return"),
    [result, R] = useState<any>(null),
    [coverage, C] = useState<any>(null),
    [busy, B] = useState(false),
    [message, M] = useState("");
  const version = useRef(0),
    key = useRef("");
  const scheduledAt =
    timing === "later" || type === "outstation"
      ? Date.parse(date.replace(" ", "T")+":00+05:30")
      : null;
  const signature = JSON.stringify({
    retry,
    pickup,
    drop,
    type,
    hours,
    transmission,
    vehicle,
    scheduledAt,
    timing,
    date,
    direction,
  });
  function input(cityId: string) {
    return {
      cityId,
      pickup: pickup!.label,
      destination: type === "return" ? undefined : drop!.label,
      pickupPoint: { lat: pickup!.lat, lng: pickup!.lng },
      ...(type === "return"
        ? {}
        : { destinationPoint: { lat: drop!.lat, lng: drop!.lng } }),
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
    R(null);
    C(null);
    M("");
    key.current = Crypto.randomUUID();
    if (!pickup) return;
    const timer = setTimeout(async () => {
      try {
        const coverage = await api("coverage", {
          cityId: "worldwide",
          pickupPoint: { lat: pickup.lat, lng: pickup.lng },
          pickupRegion: {
            city: pickup.city || "",
            country: pickup.country || "",
          },
        });
        if (generation !== version.current) return;
        C(coverage);
        if (
          !coverage.cityId ||
          coverage.status === "not_served" ||
          (type !== "return" && !drop) ||
          Number.isNaN(scheduledAt)
        )
          return;
        const estimate = await api("estimate", input(coverage.cityId));
        if (generation === version.current) R(estimate);
      } catch (e) {
        if (generation === version.current)
          M(e instanceof Error ? e.message : "Unable to estimate");
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      version.current++;
    };
  }, [signature]);
  async function book() {
    if (!result || !coverage?.cityId || busy || Number.isNaN(scheduledAt)) return;
    B(true);
    M("");
    try {
      if (result.expiresAt < Date.now())
        throw Error(
          "Estimate expired. Update your trip details to recalculate.",
        );
      const quote = await api("quote", input(coverage.cityId));
      if (quote.total !== result.total) {
        R(null);
        throw Error(
          "Fare changed. Update your trip details for a new estimate.",
        );
      }
      await api("bookings", { quoteId: quote.id, key: key.current });
      onBooked();
    } catch (e) {
      M(e instanceof Error ? e.message : "Booking failed");
    } finally {
      B(false);
    }
  }
  return (
    <>
      {stage > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={()=>advance(stage-1)} style={{minHeight:48,justifyContent:"center"}}><Text style={s.text}>←  {stage === 2 ? "Review journey" : "Plan your journey"}</Text></Pressable>}
      {stage > 0 && <View style={{flexDirection:"row",gap:6}}>{[1,2].map(n=><View key={n} style={{flex:1,height:3,borderRadius:3,backgroundColor:stage>=n?colors.ink:colors.line}}/>)}</View>}
      <Text style={s.eyebrow}>{stage === 0 ? "YOUR CAR. YOUR TIME." : `STEP ${stage} OF 2`}</Text>
      <Text style={s.h1}>{stage === 0 ? "Where shall we take you?" : stage === 1 ? "Your journey, your way." : "Review your journey."}</Text>
      {stage === 0 && <Text style={s.muted}>A personal driver for your own car.</Text>}
      {stage > 0 && <Card><Route pickup={pickup?.label || "Choose pickup"} destination={type === "return" ? undefined : drop?.label}/><Text style={s.muted}>{type === "return" ? `Round trip · ${hours} hours · Returns to pickup` : type === "outstation" ? `Outstation · ${direction === "return" ? "Return journey" : "One way"} · ${hours} hours` : "One way"}</Text></Card>}
      {stage === 0 && <Card>
        <Choices
          value={type}
          set={(v) => {
            T(v);
            H(v === "outstation" ? "12" : "2");
          }}
          values={[
            { label: "One Way", value: "one-way" },
            { label: "Round Trip", value: "return" },
            { label: "Outstation", value: "outstation" },
          ]}
        />
        <AddressPicker title="Pickup" point={pickup} onSelect={P} />
        {type !== "return" && (
          <AddressPicker title="Destination" point={drop} onSelect={D} />
        )}
        {type !== "outstation" && <Choices
          value={timing}
          set={TI}
          values={[
            { label: "Now", value: "now" },
            { label: "Schedule later", value: "later" },
          ]}
        />}
        {timing === "later" && type !== "outstation" && <SchedulePicker value={date} onChange={DA}/>}
        {type === "return" && <Text style={s.muted}>Keep the driver for your hourly package and return to your pickup location.</Text>}
        {type === "outstation" && <Text style={s.muted}>Plan a one-way or return journey outside the city. Schedule and usage details come next.</Text>}
        <Button title="Plan your journey →" disabled={!pickup || (type !== "return" && !drop)} onPress={()=>advance(1)}/>
      </Card>}
      {stage === 0 && <Text style={s.muted}>Your car. A driver for the journey. Review your estimate before requesting.</Text>}
      {stage === 1 && <Card>
        <Text style={s.h2}>{type === "outstation" ? "Schedule your outstation journey" : "When do you need a driver?"}</Text>
        {type !== "outstation" && <Choices value={timing} set={TI} values={[{label:"Now",value:"now"},{label:"Schedule later",value:"later"}]}/>}
        {(timing === "later" || type === "outstation") && (
          <SchedulePicker value={date} onChange={DA}/>
        )}
        {type !== "one-way" && (
          <>
            <Text style={s.label}>
              {type === "return" ? "Package hours" : "Estimated usage"}
            </Text>
            <Choices
              value={hours}
              set={H}
              values={(type === "return"
                ? [2, 4, 6, 8, 12]
                : [12, 24, 36, 48, 60, 72]
              ).map((n) => ({ label: n + " hours", value: String(n) }))}
            />
          </>
        )}
        {type === "outstation" && (
          <Choices
            value={direction}
            set={DI}
            values={[
              { label: "Round Trip", value: "return" },
              { label: "One Way", value: "one-way" },
            ]}
          />
        )}
        <Text style={s.label}>Transmission</Text>
        <Choices
          value={transmission}
          set={TR}
          values={[
            { label: "Manual", value: "manual" },
            { label: "Automatic", value: "automatic" },
          ]}
        />
        <Text style={s.label}>Your car</Text>
        <Choices
          value={vehicle}
          set={V}
          values={["hatchback", "sedan", "suv", "luxury"].map((v) => ({
            label: v.toUpperCase(),
            value: v,
          }))}
        />
        <Text style={s.muted}>You provide the car. We help arrange the driver.</Text>
        {coverage?.message && <Text style={s.muted}>{coverage.message}</Text>}
        {!message && !result && <Text style={s.muted}>{coverage?.status === "not_served" ? "Driver booking is not available for this location." : (timing === "later" || type === "outstation") && (!date || Number.isNaN(scheduledAt)) ? "Enter a valid pickup date and time to see your estimate." : "Checking availability and estimate…"}</Text>}
        <Button title="Review estimate →" disabled={!result || coverage?.status === "not_served"} onPress={()=>advance(2)}/>
      </Card>}
      {stage === 2 && <Card>
        <Text style={s.muted}>{timing === "later" || type === "outstation" ? date : "As soon as available"} · {transmission} · {vehicle}</Text>
        {result && coverage?.status !== "not_served" ? (
          <View>
            <Text style={s.label}>Estimated fare</Text>
            <Text style={s.price}>{money(result.total)}</Text>
            <View style={{gap:12,marginVertical:18}}>{[["Driver service",result.base],["Additional hours",result.extra],["Night charges",result.night],["Tax",result.tax]].map(([label,amount])=><View key={String(label)} style={s.row}><Text style={s.muted}>{String(label)}</Text><Text style={s.text}>{money(Number(amount))}</Text></View>)}</View>
            <Text style={s.muted}>Tolls and parking extra. Driver availability is confirmed when a driver accepts your request.</Text>
            <Button
              disabled={busy || !result.bookingAvailable}
              title={busy ? "Requesting…" : "Request a driver →"}
              onPress={book}
            />
          </View>
        ) : <Text style={s.muted}>Update your trip details to calculate a new estimate.</Text>}
      </Card>}
        {message && (
          <Text accessibilityRole="alert" style={s.error}>
            {message}
          </Text>
        )}
      {message && stage > 0 && <Button secondary title="Recalculate estimate" disabled={busy} onPress={()=>retryEstimate(v=>v+1)}/>}
    </>
  );
}
