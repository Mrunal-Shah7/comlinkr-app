// src/features/explore/components/ExploreBento.tsx — Explore's bento (design D, plan 01; layout from design C).
//
// Tiles pop in one after another (scale 0.96 → 1, 45 ms apart). Each tile shows only when it has data (B6):
// greeting (gradient) · next event (photo, tall) · homes in the city (green) · the top question · stories ·
// a quest · a poll. The greeting tile carries a slow floating glow (6 s loop), off with reduce motion.
// Left out on purpose (plan 01): the temperature (no weather source).
import { useEffect } from "react";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, display } from "../../../theme/d";
import { BentoTile, GradientFill, PressableScale, TileIn, TileLabel } from "../../../shared/d";
import { FadeImage } from "../../../../components/FadeImage";
import { getQuestions, type Question } from "../../../api/community-qa.api";
import { resolveApiAssetUrl } from "../../../api/feed.api";
import type { StoryAuthorGroup } from "../../../api/stories.api";
import type { ApiChallenge } from "../../../api/challenges.api";
import type { Poll } from "../../../api/community.api";
import type { ExploreEventRow } from "../models";

type Props = {
  city: string;
  dateLine: string;            // e.g. "WED 5 NOV · 12:19"
  greeting: string;            // "Good afternoon"
  firstName: string;
  onCity: () => void;
  nextEvent?: ExploreEventRow;
  onEvent: (e: ExploreEventRow) => void;
  homesCount: number;
  onHomes: () => void;
  stories: StoryAuthorGroup[];
  onAddStory: () => void;
  onStory: (authorIndex: number) => void;
  quest?: ApiChallenge;
  onQuest: () => void;
  poll?: Poll;
  onPoll: () => void;
  onQuestion: (q: Question) => void;
};

function Glow() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, t]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -14 * t.value }, { translateY: 10 * t.value }, { scale: 1 + 0.1 * t.value }] }));
  return <Animated.View pointerEvents="none" style={[s.glow, st]} />;
}

export function ExploreBento(p: Props) {
  const { tc } = useTheme();
  const { data: hot } = useQuery({
    queryKey: ["explore-hot-question", p.city],
    queryFn: () => getQuestions({ city: p.city, sort: "trending", limit: 1 }),
    enabled: !!p.city,
    staleTime: 5 * 60_000,
  });
  const question = hot?.data?.[0];
  // The list endpoint is not normalised (getQuestion is): the text can arrive as title.
  const questionText = question ? String(question.question || (question as any).title || "") : "";
  const e = p.nextEvent;
  let i = 0;

  return (
    <View style={s.grid}>
      {/* greeting */}
      <TileIn i={i++} style={s.wide}>
        <BentoTile tone="gradient" style={{ minHeight: 150 }}>
          <Glow />
          <TileLabel light>{p.dateLine}</TileLabel>
          <Text style={[display(800), { color: "#fff", fontSize: 26, lineHeight: 29, marginTop: 6, marginBottom: 10 }]}>{p.greeting},{"\n"}{p.firstName}</Text>
          <Pressable onPress={p.onCity} hitSlop={8} style={s.city} accessibilityRole="button" accessibilityLabel={`Change city, currently ${p.city}`}>
            <Ionicons name="location-outline" size={15} color="#fff" />
            <Text style={[body(700), { color: "#fff", fontSize: 14 }]}>{p.city}</Text>
            <Ionicons name="chevron-down" size={14} color="#fff" />
          </Pressable>
        </BentoTile>
      </TileIn>

      <View style={s.cols}>
        {e ? (
          <TileIn i={i++} style={s.col}>
            <BentoTile onPress={() => p.onEvent(e)} style={[s.imgTile, { minHeight: 246 }]} accessibilityLabel={`Next event: ${e.title}`}>
              {e.image ? <FadeImage uri={e.image} style={StyleSheet.absoluteFill} /> : <GradientFill style={StyleSheet.absoluteFill} />}
              <GradientFill colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"] as const} style={[StyleSheet.absoluteFill, { top: "30%" }]} />
              <TileLabel light>NEXT UP · {e.date.toUpperCase()}</TileLabel>
              <Text style={[TYPE.cardTitle, { color: "#fff", marginTop: 4 }]} numberOfLines={3}>{e.title}</Text>
              {e.interested > 0 ? <TileLabel light style={{ marginTop: 2 }}>{e.interested} going</TileLabel> : null}
            </BentoTile>
          </TileIn>
        ) : null}
        <View style={[s.col, { gap: 10 }]}>
          {p.homesCount > 0 ? (
            <TileIn i={i++}>
              <BentoTile tone="mint" onPress={p.onHomes} accessibilityLabel={`${p.homesCount} homes in ${p.city}`}>
                <TileLabel style={{ color: "rgba(255,255,255,0.85)" }}>HOMES IN {p.city.toUpperCase()}</TileLabel>
                <Text style={[TYPE.tileBig, { color: "#fff", marginTop: "auto" }]}>{p.homesCount}</Text>
              </BentoTile>
            </TileIn>
          ) : null}
          {question && questionText ? (
            <TileIn i={i++}>
              <BentoTile onPress={() => p.onQuestion(question)} accessibilityLabel={`Hot question: ${questionText}`}>
                <TileLabel>🔥 HOT QUESTION</TileLabel>
                <Text style={[display(700), { color: tc.textPrimary, fontSize: 15, lineHeight: 18, marginTop: 4 }]} numberOfLines={4}>{questionText}</Text>
              </BentoTile>
            </TileIn>
          ) : null}
        </View>
      </View>

      {/* stories */}
      <TileIn i={i++} style={s.wide}>
        <BentoTile style={{ minHeight: 0 }}>
          <TileLabel>STORIES NEARBY</TileLabel>
          <GHScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 10 }}>
            <PressableScale onPress={p.onAddStory} style={s.story} accessibilityLabel="Add a story">
              <View style={[s.add, { borderColor: tc.borderMedium }]}><Ionicons name="add" size={24} color={tc.textPrimary} /></View>
              <Text style={[body(600), s.storyName, { color: tc.textSecondary }]}>You</Text>
            </PressableScale>
            {p.stories.map((g, ai) => {
              const uri = g.author.avatarUrl ? resolveApiAssetUrl(g.author.avatarUrl) : null;
              const ini = (g.author.name || g.author.username || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <PressableScale key={g.author.id} onPress={() => p.onStory(ai)} style={s.story} accessibilityLabel={`Stories by ${g.author.name}`}>
                  <GradientFill colors={[tc.mint, tc.accent, "#30855B"] as const} style={s.ring}>
                    <View style={[s.ringInner, { borderColor: tc.cardBg }]}>
                      {uri ? <FadeImage uri={uri} style={s.ringImg} /> : <GradientFill style={s.ringImg}><Text style={[body(800), { color: "#fff", fontSize: 17 }]}>{ini}</Text></GradientFill>}
                    </View>
                  </GradientFill>
                  <Text style={[body(600), s.storyName, { color: tc.textSecondary }]} numberOfLines={1}>{(g.author.name || g.author.username).split(" ")[0]}</Text>
                </PressableScale>
              );
            })}
          </GHScrollView>
        </BentoTile>
      </TileIn>

      {p.quest || p.poll ? (
        <View style={s.cols}>
          {p.quest ? (
            <TileIn i={i++} style={s.col}>
              <BentoTile onPress={p.onQuest} accessibilityLabel={`Quest: ${p.quest.title}`}>
                <TileLabel>QUEST{p.quest.isJoined ? " · JOINED" : ""}</TileLabel>
                <Text style={[display(700), { color: tc.textPrimary, fontSize: 15, lineHeight: 18, marginTop: 4 }]} numberOfLines={3}>{p.quest.title}</Text>
                {(p.quest.participantsCount ?? 0) > 0 ? <TileLabel style={{ marginTop: "auto" }}>{p.quest.participantsCount} joined</TileLabel> : null}
              </BentoTile>
            </TileIn>
          ) : null}
          {p.poll ? (
            <TileIn i={i++} style={s.col}>
              <BentoTile onPress={p.onPoll} accessibilityLabel={`Poll: ${p.poll.question}`}>
                <TileLabel>POLL{p.poll.category ? ` · ${p.poll.category.toUpperCase()}` : ""}</TileLabel>
                <Text style={[display(700), { color: tc.textPrimary, fontSize: 15, lineHeight: 18, marginTop: 4 }]} numberOfLines={3}>{p.poll.question}</Text>
                {p.poll.totalVotes > 0 ? <TileLabel style={{ marginTop: "auto" }}>{p.poll.totalVotes} voted</TileLabel> : null}
              </BentoTile>
            </TileIn>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  wide: {},
  cols: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  imgTile: { justifyContent: "flex-end", padding: 14 },
  glow: { position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.18)" },
  city: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: "auto", alignSelf: "flex-start" },
  story: { alignItems: "center", width: 60 },
  add: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  storyName: { fontSize: 12, marginTop: 3 },
  ring: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  ringInner: { width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  ringImg: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
});

