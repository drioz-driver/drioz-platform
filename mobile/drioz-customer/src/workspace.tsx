/** App shell for DRIOZ (customer): session, snapshot polling, header, tab bar, inbox and account. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ExpoLinking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase, authCallback } from "./session";
import { api, apiOrigin, APIError } from "./api";
import { Badge, Button, Card, Empty, Icon, SectionTitle, colors, errorText, s, tap, type IconName } from "./ui";
import { SteeringWheel } from "./Steering";
import { useI18n } from "./i18n";

const logoDark = require("../assets/brand/logo-dark.png");

export const isStaff = (role?: string) => ["admin", "operator", "finance", "support"].includes(role || "");
export const ago = (n: number) => {
  const m = Math.round((Date.now() - n) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(n).toLocaleDateString();
};
export const initialsOf = (name: string) =>
  String(name || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

export function useWorkspace({ pollMs = 15000, onSignOut }: { pollMs?: number; onSignOut?: () => Promise<void> } = {}) {
  const [session, setSession] = useState<Session | null>(null),
    [initial, setInitial] = useState(true),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [refreshing, setRefreshing] = useState(false);
  const snapshotRequest = useRef(0);
  const generation = useRef(0),
    mounted = useRef(true);
  const refresh = useCallback(async () => {
    const current = generation.current, request = ++snapshotRequest.current;
    const result = await api("snapshot");
    if (mounted.current && current === generation.current && request === snapshotRequest.current) setData(result);
  }, []);
  const applyBooking = useCallback((booking: any) => {
    ++snapshotRequest.current;
    setData((current: any) => current && (booking.driver_id === current.me.id || booking.customer_id === current.me.id) ? { ...current, bookings: [booking, ...current.bookings.filter((b: any) => b.id !== booking.id)] } : current);
  }, []);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session);
      setInitial(false);
      if (error) setError(error.message);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      generation.current++;
      setSession(next);
      if (!next) {
        setData(null);
        onSignOut?.().catch(() => {});
      }
    });
    const sub = ExpoLinking.addEventListener("url", ({ url }) => authCallback(url).catch((e) => setError(errorText(e))));
    ExpoLinking.getInitialURL()
      .then(async (url) => {
        if (url) await authCallback(url);
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      active = false;
      mounted.current = false;
      generation.current++;
      listener.subscription.unsubscribe();
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const load = () =>
      refresh()
        .then(() => active && setError(""))
        .catch((e) => {
          if (!active) return;
          setError(errorText(e, "Connection failed"));
          if (e instanceof APIError && e.status === 401) {
            onSignOut?.().catch(() => {});
            supabase.auth.signOut({ scope: "local" });
          }
        });
    // Poll a tiny change marker and download the full snapshot only when something changed
    // (or once a minute as a safety net). Cuts mobile data use and server load by ~90%.
    let pulse = "",
      fullAt = 0,
      busy = false;
    const sync = async (force = false) => {
      if (busy || AppState.currentState !== "active") return;
      busy = true;
      try {
        // Read the marker first so a change landing during the snapshot is caught on the next tick.
        const marker = await api("pulse");
        if (!force && pulse && marker.v === pulse && Date.now() - fullAt < 60000) return;
        await load();
        pulse = marker.v;
        fullAt = Date.now();
      } catch {
        // Older servers without the pulse endpoint fall back to a plain refresh.
        if (Date.now() - fullAt >= pollMs) {
          await load();
          fullAt = Date.now();
        }
      } finally {
        busy = false;
      }
    };
    load();
    const interval = setInterval(() => sync(), pollMs);
    const resume = AppState.addEventListener("change", (state) => state === "active" && sync(true));
    return () => {
      active = false;
      clearInterval(interval);
      resume.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, refresh, pollMs]);
  async function reload() {
    setRefreshing(true);
    setError("");
    try {
      await refresh();
    } catch (e) {
      setError(errorText(e, "Unable to refresh"));
    } finally {
      setRefreshing(false);
    }
  }
  async function signout() {
    try {
      await onSignOut?.();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setData(null);
    } catch (e) {
      setError(errorText(e, "Unable to sign out"));
    }
  }
  return { applyBooking, session, initial, data, setData, error, setError, refresh, reload, refreshing, signout };
}

export function Header({ me, badge, onAccount }: { me: any; badge?: string; onAccount: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Image source={logoDark} style={{ width: 108, aspectRatio: 1100 / 378, flexShrink: 0 }} resizeMode="contain" accessibilityLabel="DRIOZ" />
        {badge ? (
          <View style={{ backgroundColor: colors.ink, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ color: colors.brand, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account"
        onPress={onAccount}
        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontWeight: "800", color: "#04140E" }}>{initialsOf(me.name)}</Text>
      </Pressable>
    </View>
  );
}

export type TabDef = { id: string; label: string; icon: IconName | "wheel"; iconOn?: IconName; badge?: number };
function TabIcon({ def, on }: { def: TabDef; on: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on || def.icon !== "wheel") return;
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(2)), useNativeDriver: true }).start();
  }, [on, def.icon, spin]);
  if (def.icon === "wheel")
    return (
      <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["-180deg", "0deg"] }) }] }}>
        <SteeringWheel size={24} color={on ? colors.brandStrong : colors.subtle} rim={on ? colors.ink : colors.subtle} hub={colors.surface} />
      </Animated.View>
    );
  return <Icon name={(on ? def.iconOn || def.icon : def.icon) as IconName} size={23} color={on ? colors.ink : colors.subtle} />;
}
export function TabBar({ tabs, tab, setTab }: { tabs: TabDef[]; tab: string; setTab: (t: string) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((def) => {
        const on = tab === def.id;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={def.label}
            accessibilityState={{ selected: on }}
            key={def.id}
            onPress={() => {
              tap();
              setTab(def.id);
            }}
            style={s.tab}
          >
            <View>
              <TabIcon def={def} on={on} />
              {!!def.badge && (
                <View style={{ position: "absolute", top: -2, right: -7, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{def.badge > 9 ? "9+" : def.badge}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11, color: on ? colors.ink : colors.subtle, fontWeight: on ? "700" : "500" }}>{def.label}</Text>
            {on && <View style={{ position: "absolute", top: -8, width: 24, height: 3, borderRadius: 2, backgroundColor: colors.brand }} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export function InboxScreen({ data, refresh, setError }: { data: any; refresh: () => Promise<void>; setError: (m: string) => void }) {
  const { t } = useI18n();
  const unread = data.notifications.filter((n: any) => !n.read).length;
  return (
    <>
      <SectionTitle
        eyebrow={t("inbox.eyebrow")}
        title={t("inbox.title")}
        right={
          unread ? (
            <Button
              small
              secondary
              icon="checkmark-done"
              title={t("inbox.readAll")}
              onPress={async () => {
                try {
                  await api("notifications/read", {});
                  await refresh();
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            />
          ) : null
        }
      />
      {data.notifications.length ? (
        data.notifications.map((n: any) => (
          <View key={n.id} style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, backgroundColor: n.read ? colors.surface : colors.brandSoft, borderWidth: 1, borderColor: n.read ? colors.line : "transparent" }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: n.read ? colors.surface3 : colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Icon name="notifications" size={17} color={n.read ? colors.muted : colors.brandDeep} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.text, { fontSize: 15, fontWeight: n.read ? "500" : "700" }]}>{n.message}</Text>
              <Text style={s.muted}>{ago(n.created_at)}</Text>
            </View>
          </View>
        ))
      ) : (
        <Empty icon="notifications-off-outline" title={t("inbox.emptyTitle")} text={t("inbox.emptyText")} />
      )}
    </>
  );
}

export function AccountScreen({
  data,
  signout,
  children,
}: {
  data: any;
  signout: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const rows: [IconName, string, () => void][] = [
    ["globe-outline", t("account.website"), () => Linking.openURL(apiOrigin)],
    ["key-outline", t("account.resetPassword"), () => Linking.openURL(apiOrigin + "/forgot-password")],
  ];
  return (
    <>
      <SectionTitle eyebrow={t("account.eyebrow")} title={t("account.title")} />
      <Card dark style={{ alignItems: "center", paddingVertical: 26 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#04140E" }}>{initialsOf(data.me.name)}</Text>
        </View>
        <Text style={[s.h2, { color: "#fff" }]}>{data.me.name}</Text>
        <Text style={{ color: "#9FB7AE" }}>{data.me.email}</Text>
        {data.company ? <Text style={{ color: colors.brand, fontWeight: "700" }}>{data.company.name}</Text> : null}
        <Badge value={data.me.role} tone="good" />
      </Card>
      {children}
      <Card>
        {rows.map(([icon, title, onPress]) => (
          <Pressable key={title} accessibilityRole="button" onPress={() => { tap(); onPress(); }} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface3, alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={18} color={colors.ink2} />
            </View>
            <Text style={[s.text, { flex: 1, fontWeight: "600" }]}>{title}</Text>
            <Icon name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>
        ))}
      </Card>
      <Button variant="dark" icon="log-out-outline" title={t("common.signOut")} onPress={signout} />
    </>
  );
}

/** Shown when a driver account signs in to the customer app. */
export function WrongApp({ title, text, signout }: { title: string; text: string; signout: () => void }) {
  return (
    <ScrollView contentContainerStyle={[s.content, { paddingTop: 40, alignItems: "stretch" }]}>
      <View style={{ alignItems: "center", marginBottom: 10 }}>
        <SteeringWheel size={90} rim={colors.ink} hub={colors.bg} />
      </View>
      <Text style={[s.h1, { textAlign: "center" }]}>{title}</Text>
      <Text style={[s.muted, { textAlign: "center", fontSize: 15 }]}>{text}</Text>
      <Button title="Sign in with another account" onPress={signout} />
    </ScrollView>
  );
}
