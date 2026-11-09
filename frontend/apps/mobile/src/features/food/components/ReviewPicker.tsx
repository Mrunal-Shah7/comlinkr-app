// Design D `compose-review`: search restaurants and pick one from the list (no exact name to type), then the
// stars and an optional line. The list fades up and out (200 ms); the picked place rises in (340 ms).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../services/cache/queryKeys";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { ActivityIndicator, Text, TextInput, View, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOutUp, useReducedMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, RADIUS } from "../../../theme/d";
import { PressableScale, Reveal } from "../../../shared/d";
import { StarPicker } from "../../../shared/d/StarPicker";
import { FadeImage } from "../../../../components/FadeImage";
import { getRestaurants, type Restaurant } from "../../../api/food.api";

export function ReviewPicker({ city, picked, onPick, rating, onRating, text, onText }: {
  city?: string;
  picked: Restaurant | null;
  onPick: (r: Restaurant | null) => void;
  rating: number;
  onRating: (n: number) => void;
  text: string;
  onText: (t: string) => void;
}) {
  const { tc } = useTheme();
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const search = useDebouncedValue(q.trim(), 250);
  // A search looks everywhere; an empty field lists the city's restaurants.
  const query = useQuery({
    queryKey: [...queryKeys.restaurantPicker(search ? null : city), search] as const,
    queryFn: async () => (await getRestaurants({ search: search || undefined, city: search ? undefined : city, pageSize: 20 })).data,
    enabled: !picked,
  });
  const list: Restaurant[] = query.data ?? [];
  const loading = query.isPending || (q.trim() !== search);

  if (picked) {
    return (
      <Animated.View entering={reduce ? undefined : FadeInDown.duration(340).withInitialValues({ transform: [{ translateY: 14 }] })} style={{ paddingTop: 4 }}>
        <View style={st.row}>
          <FadeImage uri={picked.image} style={st.img56} cachePolicy="disk" transition={200} />
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{picked.name}</Text>
            <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{[picked.cuisine, picked.city].filter(Boolean).join(" · ")}</Text>
          </View>
          <PressableScale onPress={() => onPick(null)} hitSlop={8} accessibilityLabel="Pick another restaurant">
            <Text style={[body(700), { fontSize: 13, color: tc.accentText }]}>Change</Text>
          </PressableScale>
        </View>
        <StarPicker value={rating} onChange={onRating} hint="Tap a star" />
        <Text style={[TYPE.label, { color: tc.textSecondary, marginTop: 16, marginBottom: 6 }]}>Your review (optional)</Text>
        <TextInput
          value={text}
          onChangeText={onText}
          multiline
          maxLength={1000}
          placeholder="What did you order?"
          placeholderTextColor={tc.textTertiary}
          style={[TYPE.body, st.area, { backgroundColor: tc.inputBg, color: tc.textPrimary }]}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View exiting={reduce ? undefined : FadeOutUp.duration(200)}>
      <View style={[st.search, { backgroundColor: tc.inputBg }]}>
        <Ionicons name="search" size={18} color={tc.textTertiary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={city ? `Search restaurants in ${city}` : "Search restaurants"}
          placeholderTextColor={tc.textTertiary}
          style={[body(500), { flex: 1, fontSize: 15.5, color: tc.textPrimary, paddingVertical: 0 }]}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search restaurants"
        />
      </View>
      {loading ? (
        <ActivityIndicator color={tc.accent} style={{ marginTop: 20 }} />
      ) : list.length === 0 ? (
        <Animated.Text entering={FadeIn} style={[TYPE.body, { color: tc.textSecondary, paddingHorizontal: 2, paddingTop: 14 }]}>
          {q.trim() ? `No restaurant matches “${q.trim()}”.` : "No restaurants listed here yet."}
        </Animated.Text>
      ) : (
        list.map((r, i) => (
          <Reveal key={r.id} i={i}>
            <PressableScale onPress={() => onPick(r)} accessibilityRole="button" accessibilityLabel={`Review ${r.name}`} style={[st.row, { paddingVertical: 8 }]}>
              <FadeImage uri={r.image} style={st.img52} cachePolicy="disk" transition={200} />
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]} numberOfLines={1}>{r.name}</Text>
                <Text style={[TYPE.small, { color: tc.textSecondary }]} numberOfLines={1}>{[r.cuisine, r.city].filter(Boolean).join(" · ")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
            </PressableScale>
          </Reveal>
        ))
      )}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14 },
  img52: { width: 52, height: 52, borderRadius: 12, overflow: "hidden" },
  img56: { width: 56, height: 56, borderRadius: 12, overflow: "hidden" },
  search: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, paddingHorizontal: 14, height: 50, borderRadius: RADIUS.input },
  area: { minHeight: 96, textAlignVertical: "top", borderRadius: 16, padding: 12 },
});
