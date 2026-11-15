// src/features/explore/components/ExploreBento.tsx — Explore's bento (design D, plan 01; layout from design C).
//
// Tiles pop in one after another (scale 0.96 → 1, 35 ms apart). Each tile shows only when it has data (B6):
// greeting (gradient) · next event (photo, tall) · homes in the city (green) · the top question · stories ·
// a quest · a poll. The greeting tile is a plain gradient (the floating glow circle was removed).
// Left out on purpose (plan 01): the temperature (no weather source).
import { palette } from "../../../theme/palette";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  /** E-14: the next event and the homes count are still loading for the first time; their place is kept. */
  heroLoading?: boolean;
  stories: StoryAuthorGroup[];
  onAddStory: () => void;
  onStory: (authorIndex: number) => void;
  quest?: ApiChallenge;
  onQuest: () => void;
  poll?: Poll;
  onPoll: () => void;
  onQuestion: (q: Question) => void;
};

// Hidden on Explore on purpose: each has its own tab (Housing, Q&A, stories and polls in the feed tabs).
// Set a flag to true to bring its tile back.
const SHOW = { homes: false, question: false, stories: false, poll: false };

export function ExploreBento(p: Props) {
  const { tc } = useTheme();
  const { data: hot } = useQuery({
    queryKey: ["explore-hot-question", p.city],
    queryFn: () => getQuestions({ city: p.city, sort: "trending", limit: 1 }),
    enabled: !!p.city && SHOW.question,
    staleTime: 5 * 60_000,
  });
  const question = SHOW.question ? hot?.data?.[0] : undefined;
  const poll = SHOW.poll ? p.poll : undefined;
  const sideTiles = SHOW.homes || SHOW.question;
  // The list endpoint is not normalised (getQuestion is): the text can arrive as title.
  const questionText = question ? String(question.question || (question as any).title || "") : "";
  const e = p.nextEvent;
  let i = 0;

  return (
    <View style={s.grid}>
      {/* greeting */}
      <TileIn i={i++} style={s.wide}>
        <BentoTile tone="gradient" style={{ minHeight: 150 }}>
          <TileLabel light>{p.dateLine}</TileLabel>
          <Text style={[display(800), { color: palette.white, fontSize: 26, lineHeight: 29, marginTop: 6, marginBottom: 10 }]}>{p.greeting},{"\n"}{p.firstName}</Text>
          <Pressable onPress={p.onCity} hitSlop={8} style={s.city} accessibilityRole="button" accessibilityLabel={`Change city, currently ${p.city}`}>
            <Ionicons name="location-outline" size={15} color={palette.white} />
            <Text style={[body(700), { color: palette.white, fontSize: 14 }]}>{p.city}</Text>
            <Ionicons name="chevron-down" size={14} color={palette.white} />
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
              <Text style={[TYPE.cardTitle, { color: palette.white, marginTop: 4 }]} numberOfLines={3}>{e.title}</Text>
              {e.interested > 0 ? <TileLabel light style={{ marginTop: 2 }}>{e.interested} going</TileLabel> : null}
            </BentoTile>
          </TileIn>
        ) : null /* No empty placeholder while the next event loads (it showed as a big white box): the tile appears when it arrives. */}
        {sideTiles ? (
        <View style={[s.col, { gap: 10 }]}>
          {SHOW.homes && p.homesCount > 0 ? (
            <TileIn i={i++}>
              <BentoTile tone="mint" onPress={p.onHomes} accessibilityLabel={`${p.homesCount} homes in ${p.city}`}>
                <TileLabel style={{ color: "rgba(255,255,255,0.85)" }}>HOMES IN {p.city.toUpperCase()}</TileLabel>
                <Text style={[TYPE.tileBig, { color: palette.white, marginTop: "auto" }]}>{p.homesCount}</Text>
              </BentoTile>
            </TileIn>
          ) : SHOW.homes && p.heroLoading ? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <BentoTile style={{ minHeight: 118 }}><View /></BentoTile>
            </View>
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
        ) : null}
      </View>

      {/* stories */}
      {SHOW.stories ? (
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
                  <GradientFill colors={[tc.mint, tc.accent, palette.brandGreen] as const} style={s.ring}>
                    <View style={[s.ringInner, { borderColor: tc.cardBg }]}>
                      {uri ? <FadeImage uri={uri} style={s.ringImg} /> : <GradientFill style={s.ringImg}><Text style={[body(800), { color: palette.white, fontSize: 17 }]}>{ini}</Text></GradientFill>}
                    </View>
                  </GradientFill>
                  <Text style={[body(600), s.storyName, { color: tc.textSecondary }]} numberOfLines={1}>{(g.author.name || g.author.username).split(" ")[0]}</Text>
                </PressableScale>
              );
            })}
          </GHScrollView>
        </BentoTile>
      </TileIn>
      ) : null}

      {p.quest || poll ? (
        <View style={s.cols}>
          {p.quest ? (
            <TileIn i={i++} style={s.col}>
              <BentoTile onPress={p.onQuest} accessibilityLabel={`Quest: ${p.quest.title}`}>
                <TileLabel>QUEST{p.quest.isJoined ? " · JOINED" : ""}</TileLabel>
                <Text style={[display(700), { color: tc.textPrimary, fontSize: 15, lineHeight: 18, marginTop: 4 }]} numberOfLines={3}>{p.quest.title}</Text>
                {(p.quest.participantCount ?? 0) > 0 ? <TileLabel style={{ marginTop: "auto" }}>{p.quest.participantCount} joined</TileLabel> : null}
              </BentoTile>
            </TileIn>
          ) : null}
          {poll ? (
            <TileIn i={i++} style={s.col}>
              <BentoTile onPress={p.onPoll} accessibilityLabel={`Poll: ${poll.question}`}>
                <TileLabel>POLL{poll.category ? ` · ${poll.category.toUpperCase()}` : ""}</TileLabel>
                <Text style={[display(700), { color: tc.textPrimary, fontSize: 15, lineHeight: 18, marginTop: 4 }]} numberOfLines={3}>{poll.question}</Text>
                {poll.totalVotes > 0 ? <TileLabel style={{ marginTop: "auto" }}>{poll.totalVotes} voted</TileLabel> : null}
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
  city: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: "auto", alignSelf: "flex-start" },
  story: { alignItems: "center", width: 60 },
  add: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  storyName: { fontSize: 12, marginTop: 3 },
  ring: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  ringInner: { width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  ringImg: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
});

