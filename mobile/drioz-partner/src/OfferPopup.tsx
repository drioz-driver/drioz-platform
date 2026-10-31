import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View, Vibration } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { money } from "./api";
import { Icon, colors } from "./ui";
import { CountdownWheel, SteeringStrip, SteeringWheel } from "./Steering";
import { useT } from "./i18n";

export type Offer = {
  id: string;
  bookingId: string;
  round: number;
  expiresAt: number;
  seconds: number;
  pickup: string;
  destination: string;
  tripType: string;
  transmission: string;
  scheduledAt: number | null;
  partnerFare: number;
  hours: number | null;
  vehicleCategory: string | null;
  pickupDistanceKm: number | null;
};
type Phase = "offer" | "accepting" | "won" | "missed";
const typeName = (t: string) => (t === "one-way" ? "One way" : t === "return" ? "Round trip" : t === "outstation" ? "Outstation" : t);

/**
 * Ride-offer popup. A strip of rolling steering wheels sweeps across the top,
 * the countdown ring drains around a steering wheel that turns faster as time
 * runs out, and the whole card springs up from the bottom of the screen.
 */
export default function OfferPopup({
  offer,
  skew,
  onAccept,
  onDecline,
  onMissed,
  onDone,
}: {
  offer: Offer;
  skew: number;
  onAccept: (o: Offer) => Promise<void>;
  onDecline: (o: Offer) => Promise<void>;
  onMissed: (o: Offer) => void;
  onDone: () => void;
}) {
  const t = useT();
  const remainingMs = () => Math.max(0, offer.expiresAt - (Date.now() + skew));
  const [seconds, setSeconds] = useState(Math.ceil(remainingMs() / 1000));
  const [phase, setPhase] = useState<Phase>("offer");
  const [error, setError] = useState("");
  const enter = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(remainingMs() / (offer.seconds * 1000))).current;
  const bar = useRef(new Animated.Value(remainingMs() / (offer.seconds * 1000))).current;
  const shake = useRef(new Animated.Value(0)).current;
  const win = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Vibration.vibrate([0, 300, 120, 300]);
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    const left = remainingMs();
    Animated.timing(progress, { toValue: 0, duration: left, easing: Easing.linear, useNativeDriver: false }).start();
    Animated.timing(bar, { toValue: 0, duration: left, easing: Easing.linear, useNativeDriver: true }).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    const tick = setInterval(() => setSeconds(Math.ceil(remainingMs() / 1000)), 250);
    return () => {
      clearInterval(tick);
      pulse.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.id]);

  useEffect(() => {
    if (phase !== "offer") return;
    if (seconds <= 5 && seconds > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (seconds <= 0) {
      setPhase("missed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Animated.sequence([
        ...[12, -12, 8, -8, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true })),
        Animated.delay(500),
        Animated.timing(enter, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => {
        onMissed(offer);
        onDone();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, phase]);

  async function accept() {
    if (phase !== "offer") return;
    setPhase("accepting");
    setError("");
    try {
      await onAccept(offer);
      setPhase("won");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.sequence([
        Animated.timing(win, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(enter, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDone());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to accept this ride");
      setPhase("missed");
      setTimeout(() => Animated.timing(enter, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDone()), 1600);
    }
  }
  async function decline() {
    if (phase !== "offer") return;
    setPhase("missed");
    Animated.timing(enter, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => onDone());
    onDecline(offer).catch(() => {});
  }

  const urgent = seconds <= Math.min(8, Math.ceil(offer.seconds * 0.4));
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const backdrop = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 0.78] });
  const winSpin = win.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] });
  const chips = [
    offer.pickupDistanceKm != null ? t("offer.kmToPickup", { n: offer.pickupDistanceKm }) : null,
    typeName(offer.tripType) + (offer.hours ? ` · ${offer.hours} hrs` : ""),
    offer.transmission,
    offer.vehicleCategory,
    offer.scheduledAt ? new Date(offer.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : t("offer.pickupNow"),
  ].filter(Boolean) as string[];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={decline}>
      <Animated.View style={{ position: "absolute", inset: 0, backgroundColor: colors.night, opacity: backdrop }} />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 12, paddingBottom: 28 }}>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={`New ride request, ${money(offer.partnerFare)}, ${seconds} seconds to accept`}
          style={{
            backgroundColor: colors.night2,
            borderRadius: 30,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: urgent ? colors.danger : "#1D342C",
            transform: [{ translateY }, { scale }, { translateX: shake }],
          }}
        >
          {/* Signature strip: rolling steering wheels + label + draining timer bar */}
          <View>
            <SteeringStrip height={56} speed={urgent ? 1100 : 2400} background={colors.night} tint={urgent ? colors.danger : colors.brand} />
            <LinearGradient colors={[colors.night, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.25, y: 0 }} style={{ position: "absolute", inset: 0 }} />
            <LinearGradient colors={["transparent", colors.night]} start={{ x: 0.75, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", inset: 0 }} />
            <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.night, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#1D342C" }}>
                <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: urgent ? colors.danger : colors.brand, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }} />
                <Text style={{ color: "#fff", fontWeight: "900", letterSpacing: 2.5, fontSize: 12 }}>{phase === "won" ? t("offer.confirmed") : offer.round > 1 ? t("offer.back") : t("offer.new")}</Text>
              </View>
            </View>
            <View style={{ height: 4, backgroundColor: "#1D342C" }}>
              <Animated.View style={{ height: 4, backgroundColor: urgent ? colors.danger : colors.brand, transformOrigin: "left", transform: [{ scaleX: bar }] }} />
            </View>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {phase === "won" ? (
                <Animated.View style={{ width: 132, height: 132, alignItems: "center", justifyContent: "center", transform: [{ rotate: winSpin }, { scale: win.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] }) }] }}>
                  <SteeringWheel size={110} rim="#E9F2EE" hub={colors.night2} />
                </Animated.View>
              ) : (
                <CountdownWheel size={132} progress={progress} seconds={Math.max(0, seconds)} />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: "#9FB7AE", fontSize: 13 }}>{phase === "won" ? t("offer.rideConfirmed") : t("offer.earnings")}</Text>
                <Text style={{ color: "#fff", fontSize: 38, fontWeight: "900", letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{money(offer.partnerFare)}</Text>
                {offer.round > 1 && phase === "offer" ? <Text style={{ color: colors.brand, fontSize: 12.5, fontWeight: "700" }}>{t("offer.again")}</Text> : null}
                {phase === "won" ? <Text style={{ color: colors.brand, fontSize: 16, fontWeight: "800" }}>{t("offer.yours")}</Text> : null}
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {chips.map((c) => (
                <View key={c} style={{ backgroundColor: colors.night3, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ color: "#CFE0D9", fontSize: 12.5, textTransform: "capitalize" }}>{c}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center", paddingTop: 5 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.brand }} />
                <View style={{ width: 2, flex: 1, backgroundColor: "#2B423A", marginVertical: 4 }} />
                <View style={{ width: 12, height: 12, borderRadius: 3, borderWidth: 3, borderColor: "#E9F2EE" }} />
              </View>
              <View style={{ flex: 1, gap: 12 }}>
                <View>
                  <Text style={{ color: "#6C7C76", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>{t("trip.pickup")}</Text>
                  <Text style={{ color: "#fff", fontSize: 15.5, fontWeight: "600" }} numberOfLines={2}>{offer.pickup}</Text>
                </View>
                <View>
                  <Text style={{ color: "#6C7C76", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>{t(offer.tripType === "return" ? "trip.returnTo" : "trip.destination")}</Text>
                  <Text style={{ color: "#fff", fontSize: 15.5, fontWeight: "600" }} numberOfLines={2}>{offer.destination}</Text>
                </View>
              </View>
            </View>

            {error ? (
              <View style={{ backgroundColor: "rgba(214,59,59,.16)", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#FFB4B4" }}>{error}</Text>
              </View>
            ) : null}

            {phase !== "won" && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reject this ride"
                  disabled={phase !== "offer"}
                  onPress={decline}
                  style={({ pressed }) => ({ height: 62, paddingHorizontal: 20, borderRadius: 18, backgroundColor: colors.night3, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}
                >
                  <Icon name="close" size={24} color="#CFE0D9" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Accept ride"
                  disabled={phase !== "offer"}
                  onPress={accept}
                  style={({ pressed }) => ({ flex: 1, height: 62, borderRadius: 18, backgroundColor: phase === "missed" ? "#2B423A" : colors.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                  <SteeringWheel size={26} color="#04140E" rim="#04140E" hub={colors.brand} />
                  <Text style={{ color: phase === "missed" ? "#9FB7AE" : "#04140E", fontSize: 18, fontWeight: "900" }}>
                    {phase === "accepting" ? t("offer.securing") : phase === "missed" ? (error ? t("offer.unavailable") : t("offer.missed")) : t("offer.accept")}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
