/** Live driver tracking card: polls the trip location every 10 s and shows driver, target and ETA. */
import React, { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import HostedMap from "./HostedMap";
import { api } from "./api";
import { Icon, s, colors } from "./ui";
import { useI18n } from "./i18n";

type Live = {
  location: { lat: number; lng: number; location_at: number } | null;
  target: { lat: number; lng: number; kind: "pickup" | "destination" };
  distanceKm: number | null;
  etaMinutes: number | null;
  status: string;
};

export default function LiveTracking({ trip }: { trip: any }) {
  const { t } = useI18n();
  const [live, setLive] = useState<Live | null>(null);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    let active = true, pending = false;
    const load = () => {
      setClock(Date.now());
      if (AppState.currentState !== "active" || pending) return;
      pending = true;
      api(`bookings/${trip.id}/location`)
        .then((r: Live) => {
          if (active) setLive(r);
        })
        .catch(() => {}).finally(() => { pending = false; });
    };
    load();
    const timer = setInterval(load, 5000);
    const resume = AppState.addEventListener("change", state => { if (state === "active") load(); });
    return () => {
      resume.remove();
      active = false;
      clearInterval(timer);
    };
  }, [trip.id, trip.status]);
  const target = live?.target || { lat: trip.pickup_lat, lng: trip.pickup_lng, kind: "pickup" as const };
  const driver = live?.location && live.location.location_at > clock - 120000 ? live.location : null;
  const headline =
    trip.status === "arrived"
      ? t("track.arrived")
      : !driver || live?.etaMinutes == null
        ? t("track.waiting")
        : trip.status === "in_progress"
          ? t("track.onTrip", { min: live.etaMinutes })
          : t("track.away", { km: live.distanceKm ?? "—", min: live.etaMinutes });
  return (
    <View style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
      <View style={{height:190}}><HostedMap target={target} driver={driver}/></View>
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={[s.eyebrow, { marginBottom: 0 }]}>{t("track.title")}</Text>
        <Text style={[s.h3, { fontSize: 15.5 }]}>{headline}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {trip.driver_name ? (
            <>
              <Icon name="person-circle" size={18} color={colors.ink2} />
              <Text style={s.muted}>{trip.driver_name}</Text>
              {trip.driver_rating ? (
                <>
                  <Icon name="star" size={14} color="#F5A524" />
                  <Text style={s.muted}>{Number(trip.driver_rating).toFixed(1)}</Text>
                </>
              ) : null}
            </>
          ) : null}
          {driver ? <Text style={[s.muted, { marginLeft: "auto" }]}>{t("track.updated", { time: new Date(driver.location_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) })}</Text> : null}
        </View>
      </View>
    </View>
  );
}
