/** Post-trip rating: stars, quick tags and an optional comment. */
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "./api";
import { Banner, Button, Field, Icon, s, colors, errorText, tap } from "./ui";
import { useI18n } from "./i18n";

const TAGS = ["punctual", "safe_driving", "polite", "careful", "route"];

export default function RatingPrompt({ trip, refresh }: { trip: any; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [stars, setStars] = useState(0),
    [tags, setTags] = useState<string[]>([]),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (trip.my_rating)
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name="star" size={16} color="#F5A524" />
        <Text style={s.muted}>{t("rate.thanks", { stars: trip.my_rating })}</Text>
      </View>
    );
  return (
    <View style={{ backgroundColor: colors.surface2, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.line }}>
      <Text style={s.h3}>{t("rate.title")}</Text>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="adjustable" accessibilityLabel={`${stars} / 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
            hitSlop={6}
            onPress={() => {
              tap();
              setStars(n);
            }}
          >
            <Icon name={n <= stars ? "star" : "star-outline"} size={34} color={n <= stars ? "#F5A524" : colors.subtle} />
          </Pressable>
        ))}
      </View>
      {stars > 0 ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setTags((x) => (on ? x.filter((y) => y !== tag) : [...x, tag]))}
                  style={[s.chip, { paddingVertical: 7, paddingHorizontal: 12 }, on && s.chipOn]}
                >
                  <Text style={{ color: on ? "#fff" : colors.ink, fontSize: 13, fontWeight: on ? "700" : "500" }}>{t("rate." + tag)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label={t("rate.comment")} value={comment} onChange={setComment} multiline autoCapitalize="sentences" maxLength={500} />
          {error ? <Banner text={error} /> : null}
          <Button
            busy={busy}
            icon="star"
            title={t("rate.submit")}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await api(`bookings/${trip.id}/rate`, { stars, tags, comment: comment.trim() });
                await refresh();
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      ) : null}
    </View>
  );
}
