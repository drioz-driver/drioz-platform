import React from "react";
import { Text, View } from "react-native";
import { api, Badge, Button, Card, errorText, s } from "./kit";

/** Address-verification requests that are waiting for operations before dispatch. */
export default function RequestsList({ data, refresh, setError }: { data: any; refresh: () => Promise<void>; setError: (m: string) => void }) {
  const requests = (data.locationRequests || []).filter((r: any) => r.customer_id === data.me.id && r.status !== "converted");
  return (
    <>
      {requests.map((r: any) => (
        <Card key={r.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.label}>REQUEST · {r.id.slice(0, 8).toUpperCase()}</Text>
            <Badge value={r.status === "pending" ? "verifying address" : r.status} tone={r.status === "pending" ? "warn" : undefined} />
          </View>
          <Text style={s.h3}>{r.pickup}</Text>
          <Text style={s.muted}>→ {r.destination}</Text>
          {r.status === "pending" && (
            <Button
              variant="danger"
              small
              title="Cancel request"
              onPress={async () => {
                try {
                  await api(`location-requests/${r.id}/cancel`, {});
                  await refresh();
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            />
          )}
        </Card>
      ))}
    </>
  );
}
