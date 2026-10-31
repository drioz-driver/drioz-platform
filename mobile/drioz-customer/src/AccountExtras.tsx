/** Account settings for DRIOZ (customer): language, phone, saved places and account deletion. */
import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { api, type Point } from "./api";
import { Banner, Button, Card, Choices, Field, Icon, s, colors, errorText, tap } from "./ui";
import AddressPicker from "./AddressPicker";
import { locales, useI18n, type Locale } from "./i18n";
import { unregisterPush } from "./push";

export function LanguageCard() {
  const { t, locale, setLocale } = useI18n();
  return (
    <Card>
      <Text style={s.h3}>{t("account.language")}</Text>
      <Choices value={locale} set={(v) => setLocale(v as Locale)} values={locales} />
    </Card>
  );
}

export function PhoneCard({ me, refresh }: { me: any; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState(me.phone || ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [tone, setTone] = useState<"good" | "bad">("good");
  return (
    <Card>
      <Field label={t("account.phone")} value={phone} onChange={setPhone} keyboard="phone-pad" placeholder="+91 98765 43210" hint={t("account.phoneHint")} maxLength={20} />
      {message ? <Banner tone={tone} text={message} onClose={() => setMessage("")} /> : null}
      <Button
        small
        secondary
        busy={busy}
        disabled={phone.replace(/[\s()-]/g, "") === (me.phone || "")}
        icon="call-outline"
        title={t("account.savePhone")}
        onPress={async () => {
          setBusy(true);
          setMessage("");
          try {
            await api("account/profile", { phone: phone.replace(/[\s()-]/g, "") });
            await refresh();
            setTone("good");
            setMessage(t("common.saved"));
          } catch (e) {
            setTone("bad");
            setMessage(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}

export function PlacesCard({ places, refresh }: { places: any[]; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false),
    [label, setLabel] = useState("home"),
    [custom, setCustom] = useState(""),
    [point, setPoint] = useState<Point | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const name = label === "other" ? custom.trim() : t("places." + label);
  async function save() {
    if (!point || !name) return;
    setBusy(true);
    setError("");
    try {
      await api("places", { label: name.slice(0, 40), address: point.label.slice(0, 200), lat: point.lat, lng: point.lng });
      await refresh();
      setAdding(false);
      setPoint(null);
      setCustom("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={s.h3}>{t("places.title")}</Text>
        {!adding && places.length < 10 ? <Button small secondary icon="add" title={t("places.add")} onPress={() => setAdding(true)} /> : null}
      </View>
      {!places.length && !adding ? <Text style={s.muted}>{t("places.empty")}</Text> : null}
      {places.map((p) => (
        <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
          <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={/home|घर|ఇల్లు/i.test(p.label) ? "home" : /work|office|ऑफ़िस|ఆఫీస్/i.test(p.label) ? "briefcase" : "location"} size={17} color={colors.brandDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.text, { fontWeight: "700", fontSize: 15 }]}>{p.label}</Text>
            <Text style={s.muted} numberOfLines={1}>
              {p.address}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("places.remove")}
            hitSlop={10}
            onPress={() => {
              tap();
              api(`places/${p.id}/delete`, {})
                .then(refresh)
                .catch((e) => setError(errorText(e)));
            }}
          >
            <Icon name="trash-outline" size={19} color={colors.danger} />
          </Pressable>
        </View>
      ))}
      {adding ? (
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
          <Text style={s.label}>{t("places.label")}</Text>
          <Choices
            value={label}
            set={setLabel}
            values={[
              { label: t("places.home"), value: "home" },
              { label: t("places.work"), value: "work" },
              { label: t("places.other"), value: "other" },
            ]}
          />
          {label === "other" ? <Field label={t("places.custom")} value={custom} onChange={setCustom} autoCapitalize="words" maxLength={40} /> : null}
          <AddressPicker title={t("places.location")} kind="place" point={point} onSelect={setPoint} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button style={{ flex: 1 }} busy={busy} disabled={!point || !name} icon="bookmark" title={t("places.save")} onPress={save} />
            <Button secondary title={t("common.cancel")} onPress={() => setAdding(false)} />
          </View>
        </View>
      ) : null}
      {error ? <Banner text={error} onClose={() => setError("")} /> : null}
    </Card>
  );
}

export function DeleteAccountCard({ signout }: { signout: () => Promise<void> | void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false),
    [typed, setTyped] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Card style={{ borderColor: open ? colors.danger : colors.line }}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="trash-outline" size={18} color={colors.danger} />
        </View>
        <Text style={[s.text, { flex: 1, fontWeight: "600", color: colors.danger }]}>{t("account.delete")}</Text>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.subtle} />
      </Pressable>
      {open ? (
        <>
          <Text style={s.muted}>{t("account.deleteBody")}</Text>
          <Text style={s.label}>{t("account.typeDelete")}</Text>
          <TextInput
            accessibilityLabel={t("account.typeDelete")}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor={colors.subtle}
            style={[s.input, { borderColor: typed === "DELETE" ? colors.danger : colors.line }]}
          />
          {error ? <Banner text={error} /> : null}
          <Button
            variant="danger"
            busy={busy}
            disabled={typed !== "DELETE"}
            icon="trash"
            title={t("account.deleteConfirm")}
            onPress={() =>
              Alert.alert(t("account.delete"), t("account.deleteBody"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("account.deleteConfirm"),
                  style: "destructive",
                  onPress: async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await unregisterPush();
                      await api("account/delete", { confirm: "DELETE" });
                      await signout();
                    } catch (e) {
                      setError(errorText(e));
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ])
            }
          />
        </>
      ) : null}
    </Card>
  );
}
