import React, { useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { api, money } from "./api";
import { Card, Button, Field, Choices, Route, colors, s } from "./ui";
export function Trip({
  trip,
  partner = false,
  refresh,
  onPay,
}: {
  trip: any;
  partner?: boolean;
  refresh: () => Promise<void>;
  onPay?:()=>void;
}) {
  const [pin, P] = useState(""),
    [startCode, C] = useState(""),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [position, L] = useState<any>(null),
    [statement, S] = useState<any>(null),
    [cancelOpen, showCancel] = useState(false),
    [cancelReason, setCancelReason] = useState(""),
    [cancelNote, setCancelNote] = useState("");
  async function act(path: string, data?: unknown) {
    B(true);
    E("");
    try {
      const r = await api(path, data);
      await refresh();
      return r;
    } catch (e) {
      E(e instanceof Error ? e.message : "Request failed");
    } finally {
      B(false);
    }
  }
  const active = ["assigned", "arrived", "in_progress"].includes(trip.status);
  return (
    <Card>
      <View style={s.row}><Text style={s.eyebrow}>{trip.id.slice(0,8).toUpperCase()}</Text><Text style={{fontSize:11,color:colors.ink,backgroundColor:"#e9eedf",borderRadius:12,paddingVertical:6,paddingHorizontal:9,flexShrink:1}}>{trip.status === "requested" ? "Awaiting confirmation" : trip.status.replaceAll("_"," ")}</Text></View>
      <Route pickup={trip.pickup} destination={trip.destination}/>
      <View style={s.divider}/>
      <Text style={s.muted}>
        {trip.scheduled_at
          ? new Date(trip.scheduled_at).toLocaleString()
          : "As soon as available"}
        {trip.driver_name ? " · " + trip.driver_name : ""}
      </Text>
      <Text style={s.price}>
        {money(partner ? trip.partner_fare : trip.fare)}
      </Text>
      <Text style={s.label}>
        {partner ? "Your estimated earnings" : "Agreed estimate"}
      </Text>
      {!partner && trip.status === "completed" && onPay && <Button title="Pay online or from wallet" onPress={onPay}/>}
      {!partner && ["assigned", "arrived"].includes(trip.status) && (
        <Button
          disabled={busy}
          title="Get trip start code"
          onPress={async () => {
            const r = await act(`bookings/${trip.id}/start-code`, {});
            if (r?.code) C(r.code);
          }}
        />
      )}
      {startCode && ["assigned", "arrived"].includes(trip.status) && (
        <Text style={s.price}>
          {startCode}
          <Text style={s.muted}>
            {" "}
            · Share only when your driver arrives. Valid 15 minutes.
          </Text>
        </Text>
      )}
      {partner && trip.status === "assigned" && (
        <Button
          disabled={busy}
          title="Confirm arrival"
          onPress={() =>
            act(`bookings/${trip.id}/status`, { status: "arrived" })
          }
        />
      )}
      {partner && trip.status === "arrived" && (
        <>
          <Field
            label="Customer’s six-digit start code"
            value={pin}
            onChange={P}
            keyboard="numeric"
          />
          <Button
            disabled={busy || !/^\d{6}$/.test(pin)}
            title="Start journey"
            onPress={() =>
              act(`bookings/${trip.id}/status`, {
                status: "in_progress",
                code: pin,
              })
            }
          />
        </>
      )}
      {partner && trip.status === "in_progress" && (
        <Button
          disabled={busy}
          title="Complete journey"
          onPress={() =>
            Alert.alert(
              "Complete this journey?",
              "Confirm only once the journey has ended.",
              [
                { text: "Keep driving", style: "cancel" },
                {
                  text: "Complete",
                  onPress: () =>
                    act(`bookings/${trip.id}/status`, { status: "completed" }),
                },
              ],
            )
          }
        />
      )}
      {partner && ["assigned", "arrived"].includes(trip.status) && (
        <View style={{gap: 12}}>
          <Button secondary disabled={busy} title="Cancel accepted ride" onPress={() => showCancel(!cancelOpen)} />
          {cancelOpen && <>
            <Text style={s.label}>Why do you need to cancel?</Text>
            <Choices value={cancelReason} set={setCancelReason} values={[
              {label: "Vehicle / travel issue", value: "Vehicle or travel issue"},
              {label: "Personal emergency", value: "Personal emergency"},
              {label: "Customer unavailable", value: "Customer unavailable"},
              {label: "Other", value: "Other"},
            ]}/>
            {cancelReason === "Other" && <Field label="Cancellation reason" value={cancelNote} onChange={setCancelNote} multiline />}
            <Text style={s.muted}>The customer will be notified. The ride stays in booking history.</Text>
            <Button secondary disabled={busy || !cancelReason || (cancelReason === "Other" && cancelNote.trim().length < 3)} title="Confirm cancellation" onPress={() => Alert.alert(
              "Cancel this accepted ride?", "This ends your booking and notifies the customer. You can only cancel before the journey starts.", [
                {text: "Keep ride", style: "cancel"},
                {text: "Cancel ride", style: "destructive", onPress: () => act(`bookings/${trip.id}/status`, {status: "cancelled", reason: cancelReason === "Other" ? cancelNote.trim().slice(0,500) : cancelReason})},
              ])}/>
          </>}
        </View>
      )}
      {partner && active && (
        <Button
          secondary
          title="Open pickup navigation"
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/dir/?api=1&destination=${trip.pickup_lat},${trip.pickup_lng}`,
            )
          }
        />
      )}
      {active && !partner && (
        <Button
          secondary
          disabled={busy}
          title="Show driver location"
          onPress={async () => {
            const r = await act(`bookings/${trip.id}/location`);
            if (r) L(r.location || { unavailable: true });
          }}
        />
      )}
      {position &&
        (position.lat != null && position.lng != null ? (
          <View>
            <MapView
              style={{ height: 210, borderRadius: 12 }}
              region={{
                latitude: position.lat,
                longitude: position.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{ latitude: position.lat, longitude: position.lng }}
                title="Driver’s last reported location"
              />
            </MapView>
            <Text style={s.muted}>
              Last reported:{" "}
              {position.location_at
                ? new Date(position.location_at).toLocaleTimeString()
                : "Timestamp unavailable"}
              . Tap Show driver location to refresh.
            </Text>
          </View>
        ) : (
          <Text style={s.muted}>
            No recent driver location is available yet.
          </Text>
        ))}
      {!partner &&
        ["requested", "assigned", "arrived"].includes(trip.status) && (
          <Button
            secondary
            disabled={busy}
            title="Cancel booking"
            onPress={() =>
              Alert.alert(
                "Cancel booking?",
                "Your driver request will be cancelled.",
                [
                  { text: "Keep booking", style: "cancel" },
                  {
                    text: "Cancel booking",
                    style: "destructive",
                    onPress: () =>
                      act(`bookings/${trip.id}/status`, {
                        status: "cancelled",
                        reason: "Customer cancelled in mobile app",
                      }),
                  },
                ],
              )
            }
          />
        )}
      {!partner && (
        <Button
          secondary
          title="Fare statement"
          disabled={busy}
          onPress={async () => {
            const r = await act(`bookings/${trip.id}/invoice`);
            if (r) S(r);
          }}
        />
      )}
      {statement && (
        <Text selectable style={s.muted}>
          {JSON.stringify(statement, null, 2)}
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </Card>
  );
}
