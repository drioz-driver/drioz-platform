import React, { useState } from "react";
import { Text } from "react-native";
import { api } from "./api";
import { Card, Button, Field, s } from "./ui";
export default function SupportScreen({
  data,
  refresh,
}: {
  data: any;
  refresh: () => Promise<void>;
}) {
  const [thread, T] = useState<any>(null),
    [subject, S] = useState(""),
    [message, M] = useState(""),
    [reply, R] = useState(""),
    [error, E] = useState(""),
    [busy, B] = useState(false);
  async function run(task: () => Promise<void>) {
    B(true);
    E("");
    try {
      await task();
      await refresh();
    } catch (e) {
      E(e instanceof Error ? e.message : "Request failed");
    } finally {
      B(false);
    }
  }
  return (
    <>
      <Text style={s.h1}>We’re here to help.</Text>
      <Card>
        <Text style={s.muted}>
          This inbox is not monitored for emergencies. Contact local emergency
          services if you are in immediate danger.
        </Text>
        <Field label="Subject" value={subject} onChange={S} />
        <Field label="Message" value={message} onChange={M} />
        <Button
          disabled={
            busy || subject.trim().length < 5 || message.trim().length < 10
          }
          title="Send support request"
          onPress={() =>
            run(async () => {
              await api("tickets", {
                bookingId: null,
                category: "booking",
                subject,
                message,
              });
              S("");
              M("");
            })
          }
        />
      </Card>
      {data.tickets.map((ticket: any) => (
        <Button
          key={ticket.id}
          secondary
          title={ticket.subject + " · " + ticket.status}
          disabled={busy}
          onPress={() =>
            run(async () => {
              T(await api("tickets/" + ticket.id));
            })
          }
        />
      ))}
      {thread && (
        <Card>
          <Text style={s.h2}>{thread.ticket.subject}</Text>
          {thread.messages.map((r: any) => (
            <Text key={r.id} style={s.text}>
              {r.name}: {r.message}
            </Text>
          ))}
          <Field label="Reply" value={reply} onChange={R} />
          <Button
            disabled={busy || !reply.trim()}
            title="Send reply"
            onPress={() =>
              run(async () => {
                await api("tickets/" + thread.ticket.id, { message: reply });
                R("");
                T(await api("tickets/" + thread.ticket.id));
              })
            }
          />
        </Card>
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </>
  );
}
