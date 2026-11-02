/** Live driver tracking card: polls the trip location every 10 s and shows driver, target and ETA. */
import React, { useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { api } from "./api";
import { Icon, s, colors } from "./ui";
import { SteeringWheel } from "./Steering";
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
  const [animatedDriver, setAnimatedDriver] = useState<{lat:number;lng:number}|null>(null);
  const displayed = useRef<{lat:number;lng:number}|null>(null);
  const map = useRef<MapView>(null);
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
  useEffect(() => {
    if (!driver) { displayed.current = null; setAnimatedDriver(null); return; }
    const from = displayed.current || driver, began = Date.now(); let frame = 0, last = 0;
    const step = () => {
      const elapsed = Date.now() - began, t = Math.min(1, elapsed / 1200), easing = 1 - (1 - t) ** 3;
      if (elapsed - last >= 50 || t === 1) {
        last = elapsed; const point = {lat:from.lat + (driver.lat - from.lat) * easing,lng:from.lng + (driver.lng - from.lng) * easing};
        displayed.current = point; setAnimatedDriver(point);
      }
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step); return () => cancelAnimationFrame(frame);
  }, [driver?.lat, driver?.lng, !!driver]);
  useEffect(() => {
    if (!map.current) return;
    const coords = [{ latitude: target.lat, longitude: target.lng }];
    if (driver) coords.push({ latitude: driver.lat, longitude: driver.lng });
    if (coords.length > 1)
      map.current.fitToCoordinates(coords, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
    else map.current.animateToRegion({ ...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 300);
  }, [driver?.lat, driver?.lng, target.lat, target.lng]);
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
      <MapView
        ref={map}
        style={{ height: 200 }}
        initialRegion={{ latitude: target.lat, longitude: target.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: target.lat, longitude: target.lng }}
          title={target.kind === "pickup" ? t("track.pickupPoint") : t("track.destinationPoint")}
          pinColor={target.kind === "pickup" ? colors.brandStrong : colors.ink}
        />
        {animatedDriver && driver ? (
          <Marker coordinate={{ latitude: animatedDriver.lat, longitude: animatedDriver.lng }} title={t("track.yourDriver")} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.night, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.brand }}>
              <SteeringWheel size={24} rim="#E9F2EE" hub={colors.night} />
            </View>
          </Marker>
        ) : null}
      </MapView>
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
