/**
 * DRIOZ steering-wheel motion system.
 *
 * Every loader, splash and empty state is built from one vector
 * SteeringWheel so the brand mark moves consistently across the app. All animations use the native driver (transform/opacity only).
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path, G } from "react-native-svg";
import { colors } from "./theme";

export function SteeringWheel({
  size = 48,
  color = colors.brand,
  rim = color,
  hub = colors.night,
}: {
  size?: number;
  color?: string;
  rim?: string;
  hub?: string;
}) {
  // Geometry on a 100×100 grid: rim, a filled lower "dash" segment like the
  // DRIOZ logo, three spokes and a hub.
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={43} stroke={rim} strokeWidth={10} fill="none" />
      <Path d="M7.4 56 A43 43 0 0 0 92.6 56" stroke={color} strokeWidth={10} fill="none" />
      <Path d="M8 54 Q50 38 92 54 A43 43 0 0 1 8 54 Z" fill={color} />
      <G fill={hub}>
        <Path d="M22 62 Q34 58 41 66 Q44 76 38 86 Q26 80 22 62 Z" opacity={0.9} />
        <Path d="M78 62 Q66 58 59 66 Q56 76 62 86 Q74 80 78 62 Z" opacity={0.9} />
      </G>
      <Circle cx={50} cy={53} r={7} fill={hub} />
    </Svg>
  );
}

type Motion = "spin" | "steer" | "none";
export function AnimatedWheel({
  size = 48,
  motion = "spin",
  duration = 1400,
  color,
  rim,
  hub,
  style,
}: {
  size?: number;
  motion?: Motion;
  duration?: number;
  color?: string;
  rim?: string;
  hub?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (motion === "none") return;
    v.setValue(0);
    const anim =
      motion === "spin"
        ? Animated.loop(
            Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          )
        : Animated.loop(
            Animated.sequence([
              Animated.timing(v, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(v, { toValue: -1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(v, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          );
    anim.start();
    return () => anim.stop();
  }, [motion, duration, v]);
  const rotate =
    motion === "spin"
      ? v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })
      : v.interpolate({ inputRange: [-1, 1], outputRange: ["-75deg", "75deg"] });
  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ rotate }] }, style]}>
      <SteeringWheel size={size} color={color} rim={rim} hub={hub} />
    </Animated.View>
  );
}

/** Full loader: a steering wheel turning over a moving road. */
export function SteeringLoader({ label, dark = false, size = 64 }: { label?: string; dark?: boolean; size?: number }) {
  const road = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(road, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [road]);
  const shift = road.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  return (
    <View style={{ alignItems: "center", gap: 14, padding: 28 }} accessibilityRole="progressbar" accessibilityLabel={label || "Loading"}>
      <AnimatedWheel size={size} motion="steer" duration={1600} rim={dark ? "#E9F2EE" : colors.ink} hub={dark ? colors.night : colors.surface} />
      <View style={{ width: size * 1.6, height: 4, overflow: "hidden", borderRadius: 2 }}>
        <Animated.View style={{ flexDirection: "row", gap: 10, transform: [{ translateX: shift }] }}>
          {Array.from({ length: 12 }, (_, i) => (
            <View key={i} style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: dark ? "#2B423A" : colors.lineStrong }} />
          ))}
        </Animated.View>
      </View>
      {label ? <Text style={{ color: dark ? "#9FB7AE" : colors.muted, fontSize: 14 }}>{label}</Text> : null}
    </View>
  );
}

/**
 * A horizontal strip of rolling steering wheels — the signature band used on
 * on trips that are under way.
 */
export function SteeringStrip({
  height = 44,
  speed = 2600,
  active = true,
  tint = colors.brand,
  background = colors.night,
  style,
}: {
  height?: number;
  speed?: number;
  active?: boolean;
  tint?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const wheel = Math.round(height * 0.62);
  const gap = Math.round(height * 0.55);
  const unit = wheel + gap;
  const count = 14;
  useEffect(() => {
    if (!active) return;
    t.setValue(0);
    const a = Animated.loop(Animated.timing(t, { toValue: 1, duration: speed, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [active, speed, t]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, -unit * 2] });
  // Wheels roll: rotation matches distance travelled (2 units per cycle).
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${-(unit * 2 / (Math.PI * wheel)) * 360}deg`] });
  return (
    <View style={[{ height, backgroundColor: background, overflow: "hidden", justifyContent: "center" }, style]}>
      <Animated.View style={{ flexDirection: "row", gap, paddingLeft: gap / 2, transform: [{ translateX }] }}>
        {Array.from({ length: count }, (_, i) => (
          <Animated.View key={i} style={{ transform: [{ rotate }], opacity: i % 3 === 1 ? 1 : 0.45 }}>
            <SteeringWheel size={wheel} color={tint} rim={i % 3 === 1 ? "#E9F2EE" : tint} hub={background} />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

/** Pulsing radar rings around a turning wheel — "finding your driver". */
export function SearchingWheel({ size = 120 }: { size?: number }) {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = rings.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 600),
          Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ width: size * 2, height: size * 1.6, alignItems: "center", justifyContent: "center" }}>
      {rings.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: colors.brand,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
          }}
        />
      ))}
      <AnimatedWheel size={size * 0.6} motion="steer" duration={1500} rim="#E9F2EE" hub={colors.night} />
    </View>
  );
}

/** One-shot branded intro played after the native splash screen. */
export function IntroSplash({ onDone, subtitle, logo }: { onDone: () => void; subtitle?: string; logo: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 700, delay: 350, useNativeDriver: true }),
      ]),
      Animated.delay(250),
      Animated.timing(out, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [spin, fade, out, onDone]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["-540deg", "0deg"] });
  const scale = spin.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return (
    <Animated.View style={{ flex: 1, backgroundColor: colors.night, alignItems: "center", justifyContent: "center", gap: 26, opacity: out }}>
      <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
        <SteeringWheel size={120} rim="#E9F2EE" hub={colors.night} />
      </Animated.View>
      <Animated.View style={{ opacity: fade, alignItems: "center", gap: 8, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <Animated.Image source={logo} style={{ width: 170, height: 58 }} resizeMode="contain" />
        {subtitle ? <Text style={{ color: colors.brand, letterSpacing: 4, fontWeight: "800", fontSize: 12 }}>{subtitle}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}
