import React, { useState } from "react";
import { Text, View, Pressable, Linking } from "react-native";
import { api } from "./api";
import { Card, Button, Field, Choices, Badge, Banner, Empty, Icon, SectionTitle, s, colors, errorText, tap } from "./ui";
import { useI18n } from "./i18n";

export default function SupportScreen({ data, refresh }: { data: any; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [thread, setThread] = useState<any>(null),
    [category, setCategory] = useState("booking"),
    [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [reply, setReply] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(task: () => Promise<void>, success = "") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      await refresh();
      if (success) setNotice(success);
    } catch (e) {
      setError(errorText(e, "Request failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionTitle eyebrow={t("support.eyebrow")} title={t("support.title")} />
      <Pressable
        accessibilityRole="button"
        onPress={() => Linking.openURL("tel:112")}
        style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderRadius: 16, backgroundColor: colors.warnSoft }}
      >
        <Icon name="warning" size={20} color={colors.warn} />
        <Text style={[s.muted, { flex: 1, color: colors.ink2 }]}>
          Emergency? This inbox is not monitored around the clock. Tap to call 112 or contact local emergency services.
        </Text>
      </Pressable>
      {notice ? <Banner tone="good" text={notice} onClose={() => setNotice("")} /> : null}
      {error ? <Banner text={error} onClose={() => setError("")} /> : null}
      {thread ? (
        <Card>
          <Pressable onPress={() => setThread(null)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }} hitSlop={10}>
            <Icon name="chevron-back" size={18} color={colors.brandDeep} />
            <Text style={{ color: colors.brandDeep, fontWeight: "700" }}>All tickets</Text>
          </Pressable>
          <Text style={s.h2}>{thread.ticket.subject}</Text>
          <Badge value={thread.ticket.status} />
          {thread.messages.map((r: any) => {
            const mine = r.user_id === data.me.id;
            return (
              <View
                key={r.id}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  backgroundColor: mine ? colors.brandSoft : colors.surface3,
                  borderRadius: 16,
                  padding: 12,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink2 }}>{mine ? "You" : r.name}</Text>
                <Text style={[s.text, { fontSize: 15 }]}>{r.message}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{new Date(r.created_at).toLocaleString()}</Text>
              </View>
            );
          })}
          <Field label="Reply" value={reply} onChange={setReply} multiline autoCapitalize="sentences" maxLength={3000} />
          <Button
            busy={busy}
            disabled={!reply.trim()}
            icon="send"
            title="Send reply"
            onPress={() =>
              run(async () => {
                await api("tickets/" + thread.ticket.id, { message: reply.trim() });
                setReply("");
                setThread(await api("tickets/" + thread.ticket.id));
              })
            }
          />
        </Card>
      ) : (
        <>
          <Card>
            <Text style={s.h3}>New conversation</Text>
            <Choices
              segmented={false}
              value={category}
              set={setCategory}
              values={["booking", "payment", "safety", "account"].map((c) => ({ label: c[0].toUpperCase() + c.slice(1), value: c }))}
            />
            <Field label="Subject" value={subject} onChange={setSubject} autoCapitalize="sentences" maxLength={150} />
            <Field label="Message" value={message} onChange={setMessage} multiline autoCapitalize="sentences" maxLength={3000} hint="At least 10 characters. Include your trip reference if relevant." />
            <Button
              busy={busy}
              disabled={subject.trim().length < 5 || message.trim().length < 10}
              icon="paper-plane-outline"
              title="Send to support"
              onPress={() =>
                run(async () => {
                  await api("tickets", { bookingId: null, category, subject: subject.trim(), message: message.trim() });
                  setSubject("");
                  setMessage("");
                }, "Ticket created. We’ll reply in your inbox.")
              }
            />
          </Card>
          <Text style={s.h2}>Your tickets</Text>
          {data.tickets.length ? (
            data.tickets.map((ticket: any) => (
              <Pressable
                key={ticket.id}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  tap();
                  run(async () => setThread(await api("tickets/" + ticket.id)));
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface3, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="chatbubble-ellipses-outline" size={18} color={colors.ink2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.h3} numberOfLines={1}>{ticket.subject}</Text>
                  <Text style={s.muted}>{ticket.category} · {new Date(ticket.created_at).toLocaleDateString()}</Text>
                </View>
                <Badge value={ticket.status} />
              </Pressable>
            ))
          ) : (
            <Empty icon="chatbubbles-outline" title="No conversations yet" text="Messages with our team will appear here." />
          )}
        </>
      )}
    </>
  );
}
