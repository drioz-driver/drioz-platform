import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { money } from "./api";
import { Badge, Card, Icon, colors, s } from "./ui";
import { SteeringWheel } from "./Steering";
import { useT } from "./i18n";

/** Today / week / month earnings, rating, bonus progress and bonus payouts. */
export default function Earnings({ data }: { data: any }) {
  const t = useT();
  const e = data.earnings || { today: 0, todayTrips: 0, week: 0, weekTrips: 0, month: 0, monthTrips: 0 };
  const rating = data.driverRating || { avg: null, count: 0 };
  const incentives: any[] = data.incentives || [];
  const awards: any[] = data.awards || [];
  const tiles: [string, number, number][] = [
    [t("earn.today"), e.today, e.todayTrips],
    [t("earn.week"), e.week, e.weekTrips],
    [t("earn.month"), e.month, e.monthTrips],
  ];
  return (
    <>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {tiles.map(([label, amount, trips], i) => (
          <View
            key={label}
            style={{
              flex: 1,
              borderRadius: 18,
              padding: 12,
              backgroundColor: i === 0 ? colors.night : colors.surface,
              borderWidth: 1,
              borderColor: i === 0 ? colors.night3 : colors.line,
              gap: 2,
            }}
          >
            <Text style={{ fontSize: 12, color: i === 0 ? "#9FB7AE" : colors.muted, fontWeight: "600" }}>{label}</Text>
            <Text style={{ fontSize: 19, fontWeight: "900", color: i === 0 ? "#fff" : colors.ink, letterSpacing: -0.5, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit>
              {money(amount)}
            </Text>
            <Text style={{ fontSize: 11.5, color: i === 0 ? colors.brand : colors.subtle }}>{t("earn.trips", { n: trips })}</Text>
          </View>
        ))}
      </View>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
        <Icon name="star" size={26} color="#F5B700" />
        <View style={{ flex: 1 }}>
          <Text style={s.muted}>{t("earn.rating")}</Text>
          <Text style={s.h3}>{rating.count ? `${Number(rating.avg).toFixed(1)} ★ · ${t("earn.ratings", { n: rating.count })}` : t("earn.noRating")}</Text>
        </View>
      </Card>
      {incentives.length > 0 && (
        <Card>
          <Text style={s.h3}>{t("earn.incentives")}</Text>
          {incentives.map((inc) => (
            <IncentiveRow key={inc.id} inc={inc} />
          ))}
        </Card>
      )}
      {awards.length > 0 && (
        <Card>
          <Text style={s.h3}>{t("earn.awards")}</Text>
          {awards.map((a) => (
            <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Icon name="gift" size={18} color={colors.brandDeep} />
              <Text style={[s.text, { flex: 1, fontSize: 14.5 }]} numberOfLines={1}>{a.title}</Text>
              <Text style={[s.h3, { fontSize: 15 }]}>{money(a.amount)}</Text>
              <Badge value={a.status === "paid" ? t("earn.paid") : t("earn.pending")} tone={a.status === "paid" ? "good" : "warn"} />
            </View>
          ))}
          <Text style={s.muted}>{t("earn.note")}</Text>
        </Card>
      )}
    </>
  );
}

function IncentiveRow({ inc }: { inc: any }) {
  const t = useT();
  const pct = Math.min(1, inc.done / Math.max(1, inc.target));
  const width = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (inc.achieved)
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })).start();
  }, [pct, inc.achieved, width, spin]);
  return (
    <View style={{ gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {inc.achieved ? (
          <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
            <SteeringWheel size={26} rim={colors.ink} hub={colors.surface} />
          </Animated.View>
        ) : (
          <Icon name="trophy-outline" size={22} color={colors.ink2} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.text, { fontSize: 15, fontWeight: "700" }]}>{inc.title}</Text>
          <Text style={s.muted}>
            {inc.achieved ? t("earn.unlocked") : t("earn.progress", { done: inc.done, target: inc.target })} · {t("earn.endsOn", { date: new Date(inc.endsAt).toLocaleDateString() })}
          </Text>
        </View>
        <Text style={{ fontWeight: "900", color: inc.achieved ? colors.brandDeep : colors.ink }}>{money(inc.bonus)}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface3, overflow: "hidden" }}>
        <Animated.View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: inc.achieved ? colors.brandStrong : colors.brand,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          }}
        />
      </View>
    </View>
  );
}
