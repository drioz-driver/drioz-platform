import React, { useEffect, useState } from "react";
import { Text, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as DocumentPicker from "expo-document-picker";
import { api, money } from "./api";
import { startTracking, stopTracking, trackingActive } from "./location";
import { Card, Button, Field, Choices, s } from "./ui";
import { Trip } from "./Trips";
export default function DriverScreen({
  data,
  refresh,
}: {
  data: any;
  refresh: () => Promise<void>;
}) {
  const d = data.driver;
  const [tracking, ST] = useState(false),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [phone, P] = useState(d?.phone || ""),
    [licence, L] = useState(d?.licence || ""),
    [expiry, X] = useState(d?.licence_expiry || ""),
    [city, C] = useState(d?.city_id || data.cities[0]?.id || "");
  const active = data.bookings.some(
    (b: any) =>
      b.driver_id === data.me.id &&
      ["assigned", "arrived", "in_progress"].includes(b.status),
  );
  useEffect(() => {
    trackingActive()
      .then(ST)
      .catch(() => ST(false));
    if (!d?.online && !active)
      stopTracking()
        .then(() => ST(false))
        .catch(() => {});
  }, [d?.online, active]);
  async function run(task: () => Promise<unknown>) {
    B(true);
    E("");
    try {
      await task();
      await refresh();
      ST(await trackingActive());
    } catch (e) {
      E(e instanceof Error ? e.message : "Request failed");
    } finally {
      B(false);
    }
  }
  const completed = data.bookings.filter(
    (b: any) => b.driver_id === data.me.id && b.status === "completed",
  );
  return (
    <>
      <Text style={s.h1}>Your driving day.</Text>
      <Card>
        <Text style={s.label}>
          Verification · {d?.verification || "Not applied"}
        </Text>
        <Text style={s.price}>
          {money(
            completed.reduce((n: number, b: any) => n + b.partner_fare, 0),
          )}
        </Text>
        <Text style={s.muted}>
          {completed.length} completed journeys · Earnings are records; payouts
          are arranged separately.
        </Text>
        {d?.verification === "approved" && (
          <>
            <Button
              disabled={busy}
              title={d.online ? "Go offline" : "Go online"}
              onPress={() =>
                run(async () => {
                  await api("driver/availability", { online: !d.online });
                  if (d.online && !active) await stopTracking();
                })
              }
            />
            <Button
              secondary
              disabled={busy || (!d.online && !active)}
              title={
                tracking ? "Stop location sharing" : "Share driver location"
              }
              onPress={() => {
                if (tracking) run(stopTracking);
                else
                  Alert.alert(
                    "Share driver location?",
                    "DRIOZ will send your precise location to Operations and assigned customers while you are online or driving, including when the screen is locked. Android shows a persistent notification. You can stop sharing here.",
                    [
                      { text: "Not now", style: "cancel" },
                      {
                        text: "Share location",
                        onPress: () => run(startTracking),
                      },
                    ],
                  );
              }}
            />
            <Text style={s.muted}>
              {tracking
                ? "Driver location sharing is on."
                : "Driver location sharing is off."}
            </Text>
            {d.lat != null && d.lng != null ? (
              <>
                <MapView
                  style={{ height: 240, borderRadius: 14 }}
                  region={{
                    latitude: d.lat,
                    longitude: d.lng,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                  }}
                >
                  <Marker
                    coordinate={{ latitude: d.lat, longitude: d.lng }}
                    title="Your last reported GPS position"
                  />
                </MapView>
                <Text style={s.muted}>
                  Last reported:{" "}
                  {d.location_at
                    ? new Date(d.location_at).toLocaleTimeString()
                    : "Unknown"}
                </Text>
              </>
            ) : (
              <Text style={s.muted}>
                Share location to show your GPS position on the map.
              </Text>
            )}
          </>
        )}
      </Card>
      {d?.verification === "approved" ? (
        <>
          <Text style={s.h2}>Trip requests</Text>
          {data.available.length ? (
            data.available.map((b: any) => (
              <Card key={b.id}>
                <Text style={s.text}>
                  {b.pickup} → {b.destination}
                </Text>
                <Text style={s.price}>{money(b.partner_fare)}</Text>
                <Button
                  disabled={busy || active}
                  title="Accept journey"
                  onPress={() =>
                    run(() =>
                      api(`bookings/${b.id}/assign`, { driverId: data.me.id }),
                    )
                  }
                />
              </Card>
            ))
          ) : (
            <Text style={s.muted}>
              No eligible requests right now. Scheduled trips appear 30 minutes
              before pickup.
            </Text>
          )}
          {data.bookings
            .filter((b: any) => b.driver_id === data.me.id)
            .map((b: any) => (
              <Trip key={b.id} trip={b} partner refresh={refresh} />
            ))}
        </>
      ) : (
        <>
          <Card>
            <Text style={s.h2}>Partner onboarding</Text>
            <Text style={s.muted}>
              {d
                ? "Application saved. Upload all required evidence for Operations review."
                : "Complete your profile and upload your evidence for review."}
            </Text>
            <Choices
              value={city}
              set={C}
              values={data.cities.map((c: any) => ({
                label: c.name,
                value: c.id,
              }))}
            />
            <Field
              label="Mobile with country code"
              value={phone}
              onChange={P}
              keyboard="phone-pad"
            />
            <Field
              label="Driving licence number"
              value={licence}
              onChange={L}
            />
            <Field
              label="Licence expiry (YYYY-MM-DD)"
              value={expiry}
              onChange={X}
            />
            <Button
              disabled={busy}
              title="Submit for review"
              onPress={() =>
                run(() =>
                  api("driver/apply", {
                    cityId: city,
                    phone,
                    licence,
                    licenceExpiry: expiry,
                  }),
                )
              }
            />
          </Card>
          {d &&
            ["licence", "identity", "assessment"].map((kind) => (
              <Card key={kind}>
                <Text style={s.h2}>
                  {kind === "licence"
                    ? "Driving licence"
                    : kind === "identity"
                      ? "Identity proof"
                      : "Driving assessment"}
                </Text>
                {data.documents
                  .filter(
                    (doc: any) =>
                      doc.owner_id === data.me.id && doc.kind === kind,
                  )
                  .map((doc: any) => (
                    <Text key={doc.id} style={s.muted}>
                      {doc.status} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString()}
                    </Text>
                  ))}
                <Button
                  secondary
                  disabled={busy}
                  title="Upload PDF or photo"
                  onPress={() =>
                    run(async () => {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: ["application/pdf", "image/jpeg", "image/png"],
                        copyToCacheDirectory: true,
                        multiple: false,
                      });
                      if (result.canceled) return;
                      const file = result.assets[0];
                      if (file.size && file.size > 5 * 1024 * 1024)
                        throw Error("Maximum file size is 5 MB");
                      const form = new FormData();
                      form.append("kind", kind);
                      form.append("file", {
                        uri: file.uri,
                        name: file.name,
                        type: file.mimeType || "application/octet-stream",
                      } as any);
                      await api("documents", form);
                    })
                  }
                />
              </Card>
            ))}
        </>
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </>
  );
}
