import React, { useState } from "react";
import { Modal, View, Text, Platform, Pressable } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, colors, s } from "./ui";
import type { Point } from "./api";
export default function AddressPicker({
  title,
  point,
  onSelect,
}: {
  title: string;
  point: Point | null;
  onSelect: (p: Point) => void;
}) {
  const [open, O] = useState(false),
    [selected, S] = useState({
      latitude: point?.lat || 17.44,
      longitude: point?.lng || 78.39,
    }),
    [busy, B] = useState(false),
    [error, E] = useState("");
  async function current() {
    B(true);
    E("");
    try {
      if (
        (await Location.requestForegroundPermissionsAsync()).status !==
        "granted"
      )
        throw Error("Allow location access to use your current position");
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      S({ latitude: p.coords.latitude, longitude: p.coords.longitude });
    } catch (e) {
      E(String(e));
    } finally {
      B(false);
    }
  }
  async function confirm() {
    B(true);
    E("");
    try {
      if (
        Platform.OS === "android" &&
        (await Location.requestForegroundPermissionsAsync()).status !==
          "granted"
      )
        throw Error(
          "Allow location access so Android can resolve the selected address",
        );
      const [address] = await Location.reverseGeocodeAsync(selected);
      if (!address)
        throw Error("No address found. Select a road or building on the map.");
      const label = [
        address.name,
        address.street,
        address.city,
        address.region,
        address.country,
      ]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ")
        .slice(0, 200);
      onSelect({
        lat: selected.latitude,
        lng: selected.longitude,
        label: label || "Selected map location",
        city: address.city || address.subregion || "",
        country: address.isoCountryCode || "",
      });
      O(false);
    } catch (e) {
      E(e instanceof Error ? e.message : "Unable to resolve this address");
    } finally {
      B(false);
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title + ": " + (point?.label || "Choose on map")}
        style={{minHeight:68,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:13,borderBottomWidth:1,borderColor:colors.line}}
        onPress={() => {
          E("");
          O(true);
        }}
      ><View style={{width:14,height:14,borderWidth:4,borderColor:colors.ink,borderRadius:title === "Pickup" ? 10 : 2}}/><View style={{flex:1,gap:4}}><Text style={[s.muted,{fontSize:11}]}>{title} location</Text><Text style={[s.text,{fontSize:14}]}>{point?.label || (title === "Pickup" ? "Choose pickup on map" : "Where are you going?")}</Text></View><Text style={s.muted}>›</Text></Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => O(false)}
      >
        <SafeAreaView style={s.screen}>
          <View style={{ padding: 18, gap: 8 }}>
            <Text style={s.h2}>{title}</Text>
            <Text style={s.muted}>
              Tap the map to choose the exact location.
            </Text>
            <Button
              secondary
              title="Use my current location"
              disabled={busy}
              onPress={current}
            />
          </View>
          <MapView
            style={{ flex: 1 }}
            region={{
              ...selected,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            }}
            onPress={(e) => S(e.nativeEvent.coordinate)}
          >
            <Marker
              coordinate={selected}
              draggable
              onDragEnd={(e) => S(e.nativeEvent.coordinate)}
            />
          </MapView>
          <View style={{ padding: 18 }}>
            {error && <Text style={s.error}>{error}</Text>}
            <Button
              title={busy ? "Finding address…" : "Use this location"}
              disabled={busy}
              onPress={confirm}
            />
            <Button secondary title="Cancel" onPress={() => O(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
