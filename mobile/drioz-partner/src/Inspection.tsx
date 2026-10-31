import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { api } from "./api";
import { Banner, Button, Choices, Field, Icon, colors, errorText, s, tap } from "./ui";
import { useT } from "./i18n";

const items = ["exterior", "interior", "tyres", "lights", "dashboard_warnings", "documents"] as const;
type Item = (typeof items)[number];
const shots = ["insp.front", "insp.back", "insp.left", "insp.right", "insp.dashboard", "insp.cabin"] as const;

/**
 * Before/after car condition check. Mandatory before a journey can start and
 * before it can be completed — protects the partner and the customer in
 * damage disputes. Sent as multipart to POST bookings/:id/inspection.
 */
export default function Inspection({
  bookingId,
  phase,
  visible,
  onClose,
  onSaved,
}: {
  bookingId: string;
  phase: "pre" | "post";
  visible: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const t = useT();
  const [state, setState] = useState<Partial<Record<Item, "ok" | "issue">>>({});
  const [fuel, setFuel] = useState("50");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const anyIssue = Object.values(state).includes("issue");
  const complete = items.every((k) => state[k]);

  async function takePhoto() {
    setError("");
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw Error(t("insp.camera"));
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.5, allowsEditing: false, exif: false });
      if (!r.canceled && r.assets[0]) {
        // Downscale to ~1280 px so six photos stay under the 4 MB upload limit.
        const a = r.assets[0];
        const small = await ImageManipulator.manipulateAsync(a.uri, a.width > a.height ? [{ resize: { width: 1280 } }] : [{ resize: { height: 1280 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
        setPhotos((p) => [...p, small.uri].slice(0, 6));
      }
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function submit() {
    if (!complete) return setError(t("insp.allItems"));
    if (anyIssue && notes.trim().length < 5) return setError(t("insp.notesRequired"));
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("phase", phase);
      form.append(
        "checklist",
        JSON.stringify({ items: state, fuelPercent: Number(fuel), ...(odometer ? { odometerKm: Math.round(Number(odometer)) } : {}) }),
      );
      form.append("notes", notes.trim());
      photos.forEach((uri, i) => form.append("photos", { uri, name: `${phase}-${i + 1}.jpg`, type: "image/jpeg" } as any));
      const r = await api(`bookings/${bookingId}/inspection`, form);
      onSaved(r?.message || t(phase === "pre" ? "trip.preDone" : "trip.postDone"));
      setState({});
      setNotes("");
      setPhotos([]);
      setOdometer("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.screen}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 18, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>{phase === "pre" ? "1 / 2" : "2 / 2"}</Text>
              <Text style={s.h2}>{t(phase === "pre" ? "insp.titlePre" : "insp.titlePost")}</Text>
            </View>
            <Pressable accessibilityLabel={t("common.close")} onPress={onClose} hitSlop={12}>
              <Icon name="close-circle" size={32} color={colors.subtle} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={[s.content, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled">
            <Text style={s.muted}>{t("insp.hint")}</Text>
            {items.map((k) => {
              const v = state[k];
              return (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <Text style={[s.text, { flex: 1, fontSize: 15, fontWeight: "600" }]}>{t(`insp.${k}` as any)}</Text>
                  {(["ok", "issue"] as const).map((opt) => {
                    const on = v === opt;
                    const bg = on ? (opt === "ok" ? colors.brand : colors.danger) : colors.surface;
                    return (
                      <Pressable
                        key={opt}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        onPress={() => {
                          tap();
                          setState((st) => ({ ...st, [k]: opt }));
                        }}
                        style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: on ? bg : colors.line, backgroundColor: bg }}
                      >
                        <Text style={{ fontWeight: "700", color: on ? (opt === "ok" ? "#04140E" : "#fff") : colors.ink2 }}>{t(opt === "ok" ? "insp.ok" : "insp.issue")}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            <Text style={s.label}>{t("insp.fuel")}</Text>
            <Choices segmented={false} value={fuel} set={setFuel} values={["0", "25", "50", "75", "100"].map((n) => ({ label: n === "0" ? "E" : n === "100" ? "F" : `${n}%`, value: n }))} />
            <Field label={`${t("insp.odometer")} · ${t("common.optional")}`} value={odometer} onChange={(v) => setOdometer(v.replace(/\D/g, "").slice(0, 7))} keyboard="numeric" />
            <Field label={t("insp.notes") + (anyIssue ? " *" : "")} value={notes} onChange={setNotes} multiline autoCapitalize="sentences" maxLength={1000} hint={anyIssue ? t("insp.notesRequired") : undefined} />
            <Text style={s.label}>{t("insp.photos", { n: photos.length })}</Text>
            <Text style={s.muted}>{t("insp.photoHint")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {photos.map((uri, i) => (
                <Pressable key={uri} onLongPress={() => setPhotos((p) => p.filter((x) => x !== uri))} accessibilityLabel={t(shots[i])}>
                  <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 14, backgroundColor: colors.surface3 }} />
                  <Text style={{ position: "absolute", left: 6, bottom: 6, color: "#fff", fontSize: 11, fontWeight: "800", backgroundColor: "rgba(7,17,14,.6)", paddingHorizontal: 6, borderRadius: 6 }}>{t(shots[i])}</Text>
                </Pressable>
              ))}
              {photos.length < 6 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={takePhoto}
                  style={{ width: 96, height: 96, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.lineStrong, alignItems: "center", justifyContent: "center", gap: 4 }}
                >
                  <Icon name="camera" size={24} color={colors.ink2} />
                  <Text style={{ fontSize: 11.5, color: colors.muted, textAlign: "center" }}>{t(shots[photos.length])}</Text>
                </Pressable>
              )}
            </View>
            {error ? <Banner text={error} onClose={() => setError("")} /> : null}
            <Button busy={busy} disabled={!complete} icon="shield-checkmark" title={t("insp.submit")} onPress={submit} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
