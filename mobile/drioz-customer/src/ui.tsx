import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors } from "./theme";
import { SteeringLoader, AnimatedWheel } from "./Steering";
export { colors };
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const tap = () => {
  if (Platform.OS !== "web")
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
export const errorText = (e: unknown, fallback = "Something went wrong") =>
  e instanceof Error && e.message ? e.message : fallback;

export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

type Variant = "primary" | "dark" | "secondary" | "ghost" | "danger";
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  variant,
  dark,
  icon,
  busy = false,
  small = false,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  variant?: Variant;
  dark?: boolean;
  icon?: IconName;
  busy?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v: Variant = variant || (dark ? "dark" : secondary ? "secondary" : "primary");
  const fg =
    v === "primary"
      ? "#04140E"
      : v === "dark"
        ? "#fff"
        : v === "danger"
          ? colors.danger
          : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        v === "primary" && s.primary,
        v === "dark" && s.dark,
        v === "secondary" && s.secondary,
        v === "ghost" && s.ghost,
        v === "danger" && s.danger,
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        (disabled || busy) && { opacity: 0.45 },
        style,
      ]}
    >
      {busy ? (
        <AnimatedWheel
          size={small ? 18 : 22}
          motion="spin"
          duration={900}
          color={fg}
          rim={fg}
          hub={v === "primary" ? colors.brand : v === "dark" ? colors.ink : colors.surface}
        />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
          <Text
            style={[s.buttonText, small && { fontSize: 14 }, { color: fg }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChange,
  secure = false,
  placeholder = "",
  keyboard = "default",
  multiline = false,
  autoCapitalize = "none",
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder?: string;
  keyboard?: "default" | "email-address" | "phone-pad" | "numeric";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  maxLength?: number;
  hint?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ marginVertical: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboard}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        multiline={multiline}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          s.input,
          multiline && { minHeight: 110, textAlignVertical: "top" },
          focused && { borderColor: colors.brandStrong },
        ]}
      />
      {hint ? <Text style={[s.muted, { marginTop: 6 }]}>{hint}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  dark = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}) {
  return <View style={[s.card, dark && s.cardDark, style]}>{children}</View>;
}

/** Segmented control for 2–3 options; horizontal chips for longer lists. */
export function Choices({
  values,
  value,
  set,
  segmented,
}: {
  values: { label: string; value: string }[];
  value: string;
  set: (v: string) => void;
  segmented?: boolean;
}) {
  const seg = segmented ?? values.length <= 3;
  if (seg)
    return (
      <View style={s.segment} accessibilityRole="tablist">
        {values.map((v) => {
          const on = value === v.value;
          return (
            <Pressable
              key={v.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                set(v.value);
              }}
              style={[s.segmentItem, on && s.segmentOn]}
            >
              <Text
                style={{
                  color: on ? colors.ink : colors.muted,
                  fontWeight: on ? "700" : "500",
                  fontSize: 14,
                }}
              >
                {v.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {values.map((v) => {
        const on = value === v.value;
        return (
          <Pressable
            key={v.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              set(v.value);
            }}
            style={[s.chip, on && s.chipOn]}
          >
            <Text
              style={{
                color: on ? "#fff" : colors.ink,
                fontWeight: on ? "700" : "500",
              }}
            >
              {v.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const tones: Record<string, [string, string]> = {
  good: [colors.brandSoft, colors.brandDeep],
  warn: [colors.warnSoft, colors.warn],
  bad: [colors.dangerSoft, colors.danger],
  info: [colors.infoSoft, colors.info],
  neutral: [colors.surface3, colors.ink2],
};
export function toneFor(status: string) {
  if (["completed", "approved", "paid", "received", "online"].includes(status))
    return "good";
  if (["pending", "requested", "open", "offline"].includes(status)) return "warn";
  if (["cancelled", "rejected", "refunded"].includes(status)) return "bad";
  if (["assigned", "arrived", "in_progress", "resolved"].includes(status))
    return "info";
  return "neutral";
}
export function Badge({ value, tone }: { value: string; tone?: string }) {
  const [bg, fg] = tones[tone || toneFor(value)] || tones.neutral;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <View style={[s.badgeDot, { backgroundColor: fg }]} />
      <Text style={[s.badgeText, { color: fg }]}>
        {value.replaceAll("_", " ")}
      </Text>
    </View>
  );
}

export function Banner({
  text,
  tone = "bad",
  onClose,
}: {
  text: string;
  tone?: "bad" | "good" | "warn";
  onClose?: () => void;
}) {
  if (!text) return null;
  const [bg, fg] = tones[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[s.banner, { backgroundColor: bg }]}
    >
      <Ionicons
        name={tone === "good" ? "checkmark-circle" : "alert-circle"}
        size={18}
        color={fg}
      />
      <Text style={[s.text, { flex: 1, fontSize: 14, color: colors.ink }]}>
        {text}
      </Text>
      {onClose && (
        <Pressable accessibilityLabel="Dismiss" onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function Empty({
  icon = "file-tray-outline",
  title,
  text,
}: {
  icon?: IconName;
  title: string;
  text: string;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.brandDeep} />
      </View>
      <Text style={[s.h3, { textAlign: "center" }]}>{title}</Text>
      <Text style={[s.muted, { textAlign: "center" }]}>{text}</Text>
    </View>
  );
}

export function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={s.row}>
      <Text style={s.muted}>{label}</Text>
      <Text
        style={[s.text, strong && { fontWeight: "800", fontSize: 18 }]}
      >
        {value}
      </Text>
    </View>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={s.h1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function Loading({ label, dark }: { label?: string; dark?: boolean }) {
  return <SteeringLoader label={label} dark={dark} />;
}

export const s = StyleSheet.create({
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  brand: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.brand,
    letterSpacing: 1,
  },
  eyebrow: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: colors.brandDeep,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  h1: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  h3: { fontSize: 16, fontWeight: "700", color: colors.ink },
  text: { fontSize: 16, color: colors.ink, lineHeight: 23 },
  muted: { color: colors.muted, fontSize: 13.5, lineHeight: 20 },
  card: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
    shadowColor: "#0C1714",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardDark: { backgroundColor: colors.night, borderColor: colors.night3 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink2,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  button: {
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 3,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14, borderRadius: 12 },
  primary: { backgroundColor: colors.brand },
  dark: { backgroundColor: colors.ink },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: colors.dangerSoft },
  buttonText: { fontSize: 16, fontWeight: "700" },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface3,
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 11,
  },
  segmentOn: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 12,
    borderRadius: 14,
    overflow: "hidden",
  },
  empty: {
    alignItems: "center",
    gap: 8,
    padding: 28,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface2,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineStrong,
    paddingTop: 8,
  },
  tab: { flex: 1, paddingVertical: 4, alignItems: "center", gap: 3 },
  price: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
});

/** Collapsible card (used by wallet panels). */
export function Disclosure({ title, children, initial = false }: { title: string; children: React.ReactNode; initial?: boolean }) {
  const [open, setOpen] = React.useState(initial);
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={[s.row, { minHeight: 44 }]}>
        <Text style={[s.h3, { flex: 1 }]}>{title}</Text>
        <Text style={[s.h3, { color: colors.muted }]}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? children : null}
    </Card>
  );
}

/** Pickup → destination route with the DRIOZ ring/square markers. */
export function Route({ pickup, destination }: { pickup: string; destination?: string }) {
  return (
    <View style={{ gap: 14, paddingVertical: 4 }}>
      {[pickup, destination].filter(Boolean).map((label, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ width: 14, height: 14, borderWidth: 4, borderColor: i ? colors.ink : colors.brandStrong, borderRadius: i ? 3 : 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{i ? "Destination" : "Pickup"}</Text>
            <Text style={s.text}>{label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
