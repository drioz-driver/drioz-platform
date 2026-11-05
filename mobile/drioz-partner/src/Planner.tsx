import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "./api";
import { Banner, Button, Card, Choices, Icon, colors, errorText, s, tap } from "./ui";
import { useT } from "./i18n";

const pad = (n: number) => String(n).padStart(2, "0");
const label = (min: number) => {
  const h = Math.floor(min / 60);
  return `${h % 12 || 12}${min % 60 ? ":" + pad(min % 60) : ""} ${h < 12 ? "AM" : "PM"}`;
};
/** IST calendar day YYYY-MM-DD, `offset` days from today. */
const istDay = (offset: number) => new Date(Date.now() + 19800000 + offset * 86400000).toISOString().slice(0, 10);

/** Next 7 days: mark a day off or choose a driving window (POST driver/plan). */
export default function Planner({ plans, refresh }: { plans: any[]; refresh: () => Promise<void> }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [start, setStart] = useState("9");
  const [end, setEnd] = useState("18");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => istDay(i));
  const planFor = (day: string) => plans.find((p) => p.day === day);
  async function save(day: string, off: boolean) {
    setBusy(true);
    setError("");
    try {
      await api("driver/plan", off ? { day, off: true } : { day, start: `${pad(Number(start))}:00`, end: `${pad(Number(end))}:00` });
      await refresh();
      setOpen(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const startHours = Array.from({ length: 17 }, (_, i) => i + 6); // 06–22
  const endHours = Array.from({ length: 23 - Number(start) }, (_, i) => Number(start) + 1 + i).filter((h) => h <= 23);
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name="calendar" size={20} color={colors.brandDeep} />
        <Text style={[s.h3, { flex: 1 }]}>{t("plan.title")}</Text>
      </View>
      <Text style={s.muted}>{t("plan.hint")}</Text>
      {days.map((day, i) => {
        const p = planFor(day);
        const name = i === 0 ? t("plan.today") : i === 1 ? t("plan.tomorrow") : new Date(day + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
        const summary = !p ? t("plan.notSet") : p.off ? t("plan.off") : `${label(p.start_min)} – ${label(p.end_min)}`;
        return (
          <View key={day} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tap();
                setOpen(open === day ? null : day);
                if (p && !p.off) {
                  setStart(String(Math.floor(p.start_min / 60)));
                  setEnd(String(Math.floor(p.end_min / 60)));
                }
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Text style={[s.text, { flex: 1, fontWeight: "700", fontSize: 15 }]}>{name}</Text>
              <Text style={{ color: !p ? colors.subtle : p.off ? colors.warn : colors.brandDeep, fontWeight: "600" }}>{summary}</Text>
              <Icon name={open === day ? "chevron-up" : "chevron-down"} size={18} color={colors.subtle} />
            </Pressable>
            {open === day && (
              <View style={{ gap: 6 }}>
                <Text style={s.label}>{t("plan.from")}</Text>
                <Choices
                  segmented={false}
                  value={start}
                  set={(v) => {
                    setStart(v);
                    if (Number(end) <= Number(v)) setEnd(String(Math.min(23, Number(v) + 8)));
                  }}
                  values={startHours.map((h) => ({ label: label(h * 60), value: String(h) }))}
                />
                <Text style={s.label}>{t("plan.to")}</Text>
                <Choices segmented={false} value={end} set={setEnd} values={endHours.map((h) => ({ label: label(h * 60), value: String(h) }))} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button small style={{ flex: 1 }} busy={busy} icon="checkmark" title={t("common.save")} onPress={() => save(day, false)} />
                  <Button small secondary style={{ flex: 1 }} disabled={busy} icon="moon-outline" title={t("plan.off")} onPress={() => save(day, true)} />
                </View>
              </View>
            )}
          </View>
        );
      })}
      {error ? <Banner text={error} onClose={() => setError("")} /> : null}
    </Card>
  );
}
