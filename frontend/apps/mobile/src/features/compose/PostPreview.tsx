// Split out of app/create-post.tsx (TR-013, point 9b).
import { palette } from "../../theme/palette";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { type Restaurant } from "../../api/food.api";
import { FadeImage } from "../../../components/FadeImage";
import { createThemedStyles } from "../../theme/themedStyles";
import { PostType } from "./postTypes";
import { s } from "./styles";
import { AttachedMedia } from "./types";

export type PostPreviewProps = {
  type: PostType;
  title: string;
  body: string;
  attachedFiles: AttachedMedia[];
  extraFields: { label: string; value: string; icon: string }[];
  location?: string;
  userName: string;
  userInitials: string;
  storyMediaType?: string;
  storyCategory?: string;
  storyHashtags?: string;
  storyDuration?: string;
  eventDate?: string;
  eventTime?: string;
  eventCategory?: string;
  challengeType?: string;
  challengeDuration?: string;
  challengeGoal?: string;
  challengeReward?: string;
  challengeMaxParticipants?: string;
  challengeHashtags?: string;
  listingPrice?: string;
  listingCurrency?: string;
  listingDeposit?: string;
  listingAvailable?: string;
  listingAmenities?: string[];
  listingWalkScore?: string;
  listingTransitInfo?: string;
  listingIsVerified?: boolean;
  restCuisine?: string;
  restPriceRange?: string;
  restFeatures?: string[];
};

// ── Post preview (rendered by the app/compose-preview.tsx route, TR-017) ──────────────────────────────────────────────────────────────
export function PostPreview({
  onClose,
  type,
  title,
  body,
  attachedFiles,
  extraFields,
  location,
  userName,
  userInitials,
  // story-specific
  storyMediaType,
  storyCategory,
  storyHashtags,
  storyDuration,
  // event-specific
  eventDate,
  eventTime,
  eventCategory,
  // challenge-specific
  challengeType,
  challengeDuration,
  challengeGoal,
  challengeReward,
  challengeMaxParticipants,
  challengeHashtags,
  // listing-specific
  listingPrice,
  listingCurrency,
  listingDeposit,
  listingAvailable,
  listingAmenities,
  listingWalkScore,
  listingTransitInfo,
  listingIsVerified,
  // restaurant-specific
  restCuisine,
  restPriceRange,
  restFeatures,
}: PostPreviewProps & { onClose: () => void }) {
  const { width: SW } = useWindowDimensions();
  const { isDark, tc } = useTheme();
  const renderStoryPreview = () => (
    <View style={[pv.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      {/* Story image */}
      <View style={[pv.storyImgWrap, { backgroundColor: palette.navy }]}>
        {attachedFiles.length > 0 ? (
          <View style={pv.storyImgPlaceholder}>
            <FadeImage uri={attachedFiles[0].uri} style={{ width: "100%" as any, height: "100%" as any }} cachePolicy="memory" />
            {/* SPRINT-42: use shared FadeImage for story preview media. */}
            {attachedFiles.length > 1 && (
              <View style={pv.imgCountBadge}>
                <Ionicons name="images" size={11} color={palette.white} />
                <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
              </View>
            )}
          </View>
        ) : (
          <LinearGradient
            colors={type.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={pv.storyImgPlaceholder}
          >
            <Ionicons
              name={storyMediaType === "video" ? "videocam" : "image"}
              size={42}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={pv.storyImgLabel}>
              {storyMediaType === "video" ? "Your video / story will appear here" : "Your photo will appear here"}
            </Text>
          </LinearGradient>
        )}
        {/* Duration badge — photos omit seconds */}
        <View style={pv.storyDurBadge}>
          <Ionicons name={storyMediaType === "video" ? "videocam" : "image"} size={10} color={palette.white} />
          <Text style={pv.storyDurText}>
            {storyMediaType === "video" ? `${storyDuration || "30"}s` : "Photo"}
          </Text>
        </View>
        {/* NEW badge */}
        <View style={pv.storyNewBadge}>
          <Text style={pv.storyNewText}>NEW</Text>
        </View>
      </View>
      {/* Body */}
      <View style={pv.storyBody}>
        <View style={pv.storyAuthorRow}>
          <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.storyAv}>
            <Text style={{ fontSize: 11, fontWeight: "900", color: palette.white }}>{userInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[pv.storyAuthorName, { color: tc.textPrimary }]}>{userName}</Text>
              <Ionicons name="checkmark-circle" size={13} color={palette.blue400} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={pv.storyTime}>Just now</Text>
              {storyCategory ? (
                <>
                  <View style={[pv.storyCatDot, { backgroundColor: type.color }]} />
                  <Text style={[pv.storyCatLabel, { color: type.color }]}>{storyCategory}</Text>
                </>
              ) : null}
            </View>
          </View>
          <Ionicons name="bookmark-outline" size={20} color={palette.gray400} />
        </View>
        <Text style={[pv.storyTitle, { color: tc.textPrimary }]} numberOfLines={2}>
          {title.trim() ? title : "Story"}
        </Text>
        {body.trim() ? (
          <Text style={[pv.storyDesc, { color: tc.textSecondary }]} numberOfLines={2}>
            {body}
          </Text>
        ) : null}
        {/* Hashtags */}
        {storyHashtags ? (
          <View style={pv.storyHashRow}>
            {storyHashtags.split(",").map((h, i) => (
              <Text key={i} style={pv.storyHash}>{h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`}</Text>
            ))}
          </View>
        ) : null}
        {/* Engagement */}
        <View style={pv.storyEngBar}>
          <View style={pv.storyEngItem}>
            <Ionicons name="heart-outline" size={16} color={palette.gray400} />
            <Text style={pv.storyEngText}>0</Text>
          </View>
          <View style={pv.storyEngItem}>
            <Ionicons name="chatbubble-outline" size={15} color={palette.gray400} />
            <Text style={pv.storyEngText}>0</Text>
          </View>
          <View style={pv.storyEngItem}>
            <Ionicons name="share-social-outline" size={15} color={palette.gray400} />
            <Text style={pv.storyEngText}>0</Text>
          </View>
          <View style={pv.storyEngItem}>
            <Ionicons name="eye-outline" size={15} color={palette.gray400} />
            <Text style={pv.storyEngText}>0</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ── Event-specific preview ──
  const renderEventPreview = () => (
    <View style={pv.eventCard}>
      {/* Big image area */}
      {attachedFiles.length > 0 ? (
        <View style={pv.eventImg}>
          <FadeImage uri={attachedFiles[0].uri} style={{ width: "100%" as any, height: "100%" as any }} cachePolicy="memory" />
          {/* SPRINT-42: use shared FadeImage for event preview media. */}
          {attachedFiles.length > 1 && (
            <View style={pv.imgCountBadge}>
              <Ionicons name="images" size={11} color={palette.white} />
              <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
            </View>
          )}
        </View>
      ) : (
        <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.eventImg}>
          <Ionicons name="calendar" size={48} color="rgba(255,255,255,0.3)" />
        </LinearGradient>
      )}
      {/* Overlay content */}
      <LinearGradient
        colors={["transparent", "rgba(4,12,24,0.88)"]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
        style={pv.eventOverlay}
      >
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          <View style={[pv.eventCatBadge, { backgroundColor: type.bg }]}>
            <Text style={[pv.eventCatText, { color: type.color }]}>{eventCategory || "Event"}</Text>
          </View>
          {eventDate ? (
            <View style={pv.eventDateBadge}>
              <Ionicons name="calendar-outline" size={11} color={palette.white} />
              <Text style={pv.eventDateText}>{eventDate}</Text>
            </View>
          ) : null}
        </View>
        <Text style={pv.eventTitle} numberOfLines={2}>{title || "Your event title..."}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 }}>
          {eventTime ? (
            <>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.75)" />
              <Text style={pv.eventMeta}>{eventTime}</Text>
              <View style={pv.eventDot} />
            </>
          ) : null}
          {location ? (
            <>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.75)" />
              <Text style={pv.eventMeta}>{location}</Text>
            </>
          ) : null}
        </View>
        {/* Action row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="people" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>0 going</Text>
          </View>
          <View style={pv.eventIntBtn}>
            <Ionicons name="star-outline" size={14} color={palette.white} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: palette.white }}>Interested</Text>
          </View>
          <View style={{ borderRadius: 18, overflow: "hidden" }}>
            <LinearGradient colors={[palette.brandTeal, palette.orangeL45]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.eventRsvp}>
              <Text style={{ fontSize: 11, fontWeight: "900", color: palette.white, letterSpacing: 0.5 }}>RSVP</Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // ── Challenge-specific preview ──
  const renderChallengePreview = () => (
    <View style={pv.challengeCard}>
      {/* Header gradient */}
      <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.challengeHeader}>
        <View style={pv.challengeHeaderDecor1} />
        <View style={pv.challengeHeaderDecor2} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <View style={pv.challengeTypePill}>
            <Ionicons name="trophy" size={11} color={palette.brandTeal} />
            <Text style={pv.challengeTypeText}>{challengeType || "CHALLENGE"}</Text>
          </View>
          {challengeDuration ? (
            <View style={pv.challengeDurPill}>
              <Ionicons name="time-outline" size={11} color={palette.white} />
              <Text style={{ fontSize: 10, fontWeight: "700", color: palette.white }}>{challengeDuration}</Text>
            </View>
          ) : null}
        </View>
        <Text style={pv.challengeTitle} numberOfLines={2}>{title || "Your challenge title..."}</Text>
        {location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>{location}</Text>
          </View>
        ) : null}
      </LinearGradient>
      {/* Body */}
      <View style={[pv.challengeBody, { backgroundColor: tc.cardBg }]}>
        {/* Author */}
        <View style={pv.challengeAuthorRow}>
          <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.challengeAv}>
            <Text style={{ fontSize: 10, fontWeight: "900", color: palette.white }}>{userInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[pv.challengeAuthorName, { color: tc.textPrimary }]}>{userName}</Text>
            <Text style={[pv.challengeAuthorTime, { color: tc.textTertiary }]}>Just now · Preview</Text>
          </View>
          <View style={[pv.challengeStatusPill, { backgroundColor: palette.green100 }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green500 }} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: palette.green700 }}>Active</Text>
          </View>
        </View>
        <Text style={[pv.challengeDesc, { color: tc.textSecondary }]} numberOfLines={3}>{body || "Challenge details will appear here..."}</Text>

        {/* Info chips */}
        <View style={pv.challengeInfoGrid}>
          {challengeGoal ? (
            <View style={[pv.challengeInfoChip, { backgroundColor: palette.orange50 }]}>
              <Ionicons name="flag" size={12} color={palette.brandTeal} />
              <Text style={[pv.challengeInfoText, { color: palette.orange700 }]}>{challengeGoal}</Text>
            </View>
          ) : null}
          {challengeReward ? (
            <View style={[pv.challengeInfoChip, { backgroundColor: palette.yellow100 }]}>
              <Ionicons name="gift" size={12} color={palette.yellow600} />
              <Text style={[pv.challengeInfoText, { color: palette.orangeL33 }]}>{challengeReward}</Text>
            </View>
          ) : null}
          {challengeMaxParticipants ? (
            <View style={[pv.challengeInfoChip, { backgroundColor: palette.brandBlueLight }]}>
              <Ionicons name="people" size={12} color={palette.brandBlue} />
              <Text style={[pv.challengeInfoText, { color: palette.blueL40_2 }]}>Max {challengeMaxParticipants}</Text>
            </View>
          ) : null}
        </View>

        {/* Hashtags */}
        {challengeHashtags ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {challengeHashtags.split(",").map((h, i) => (
              <Text key={i} style={{ fontSize: 12, fontWeight: "700", color: type.color }}>
                {h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Progress bar */}
        <View style={pv.challengeProgress}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: palette.gray500 }}>Participants</Text>
            <Text style={{ fontSize: 11, fontWeight: "800", color: type.color }}>0 / {challengeMaxParticipants || "∞"}</Text>
          </View>
          <View style={pv.challengeBarBg}>
            <View style={[pv.challengeBarFill, { width: "0%", backgroundColor: type.color }]} />
          </View>
        </View>

        {/* Action buttons */}
        <View style={pv.challengeActions}>
          <View style={{ flex: 1, borderRadius: 14, overflow: "hidden" }}>
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.challengeJoinBtn}>
              <Ionicons name="flash" size={15} color={palette.white} />
              <Text style={pv.challengeJoinText}>Join Challenge</Text>
            </LinearGradient>
          </View>
          <Pressable style={[pv.challengeShareBtn, { backgroundColor: isDark ? tc.inputBg : palette.gray100, borderColor: tc.borderLight }]}>
            <Ionicons name="share-social-outline" size={17} color={tc.textSecondary} />
          </Pressable>
          <Pressable style={[pv.challengeShareBtn, { backgroundColor: isDark ? tc.inputBg : palette.gray100, borderColor: tc.borderLight }]}>
            <Ionicons name="bookmark-outline" size={17} color={tc.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  // ── Listing-specific preview (matches Housing tab card) ──
  const renderListingPreview = () => {
    const bedsVal = extraFields.find((f) => f.label === "Beds")?.value ?? "";
    const bathsVal = extraFields.find((f) => f.label === "Baths")?.value ?? "";
    const sqftVal = extraFields.find((f) => f.label === "Sqft")?.value ?? "";
    const propTypeVal = extraFields.find((f) => f.label === "Type")?.value ?? "";
    const currSymbol = listingCurrency === "GBP" ? "£" : listingCurrency === "EUR" ? "€" : "$";
    const priceNum = parseFloat((listingPrice ?? "").replace(/,/g, ""));
    const priceStr = !Number.isNaN(priceNum) && priceNum > 0 ? `${currSymbol}${listingPrice}/mo` : "Price TBD";
    const depositStr = listingDeposit?.trim() ? `Deposit ${currSymbol}${listingDeposit}` : null;
    const availStr = listingAvailable?.trim() || null;
    const walkNum = parseInt(listingWalkScore ?? "", 10);
    const walkColor = !Number.isNaN(walkNum) ? (walkNum >= 90 ? palette.green600 : walkNum >= 70 ? palette.amber700 : palette.red600) : palette.brandBlue;
    const walkBg = !Number.isNaN(walkNum) ? (walkNum >= 90 ? palette.green100 : walkNum >= 70 ? palette.yellow100 : palette.red100) : palette.brandBlueLight;

    return (
      <View style={[pv.listCard, { borderColor: tc.borderLight }]}>
        {/* Image area with scrim overlay */}
        <View style={pv.listCardImgWrap}>
          {attachedFiles.length > 0 ? (
            <FadeImage uri={attachedFiles[0].uri} style={StyleSheet.absoluteFill} cachePolicy="memory" /> // SPRINT-42: use shared FadeImage for listing preview media.
          ) : (
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="home" size={52} color="rgba(255,255,255,0.3)" />
              </View>
            </LinearGradient>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.48)"]}
            style={pv.listImageScrim}
            pointerEvents="none"
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {propTypeVal ? (
                <View style={pv.listTypePill}>
                  <Text style={pv.listTypePillText}>{propTypeVal.toUpperCase()}</Text>
                </View>
              ) : null}
              {availStr === "Immediate" ? (
                <View style={pv.listAvailNowPill}>
                  <View style={pv.listAvailDot} />
                  <Text style={pv.listAvailNowText}>Available Now</Text>
                </View>
              ) : null}
            </View>
            <Text style={pv.listImagePrice}>{priceStr}</Text>
            {location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={pv.listImageLocation} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </LinearGradient>
          {/* NEW badge */}
          <View style={pv.listNewBadge}><Text style={pv.listNewBadgeText}>NEW</Text></View>
          {attachedFiles.length > 1 && (
            <View style={pv.imgCountBadge}>
              <Ionicons name="images" size={11} color={palette.white} />
              <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View style={[pv.listCardBody, { backgroundColor: tc.cardBg }]}>
          {/* Landlord bar */}
          <View style={pv.listLandlordBar}>
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.listAv}>
              <Text style={pv.listAvText}>{userInitials}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[pv.listLandlordName, { color: tc.textPrimary }]} numberOfLines={1}>{userName}</Text>
                {listingIsVerified ? (
                  <View style={pv.listVerifiedBadge}>
                    <Ionicons name="shield-checkmark" size={10} color={palette.brandGreen} />
                    <Text style={pv.listVerifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={pv.listChatBtn}>
              <Ionicons name="chatbubble-ellipses" size={13} color={palette.white} />
              <Text style={pv.listChatBtnText}>Chat</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[pv.listTitle, { color: tc.textPrimary }]} numberOfLines={2}>{title || "Property title..."}</Text>

          {/* Deposit + available row */}
          {(depositStr || availStr) ? (
            <View style={pv.listSubRow}>
              {depositStr ? (
                <View style={[pv.listDepositPill, { borderColor: tc.borderLight }]}>
                  <Ionicons name="card-outline" size={11} color={palette.gray500} />
                  <Text style={pv.listDepositText}>{depositStr}</Text>
                </View>
              ) : null}
              {availStr ? (
                <View style={pv.listAvailImmPill}>
                  <View style={pv.listAvailDotSmall} />
                  <Text style={pv.listAvailImmText}>{availStr === "Immediate" ? "Available Immediately" : availStr}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 4-col stats grid */}
          {(bedsVal || bathsVal || sqftVal) ? (
            <View style={[pv.listStatsGrid, { borderColor: tc.borderLight }]}>
              {[
                { icon: "bed-outline" as const, val: bedsVal || "–", lbl: "Beds", bg: palette.blueL97_2, color: palette.brandBlue },
                { icon: "water-outline" as const, val: bathsVal || "–", lbl: "Baths", bg: palette.brandGreenLight, color: palette.brandGreen },
                { icon: "resize-outline" as const, val: sqftVal || "–", lbl: "Sqft", bg: palette.brandTealLight, color: palette.brandTeal },
                { icon: "business-outline" as const, val: propTypeVal || "–", lbl: "Type", bg: palette.brandBlueLight, color: palette.brandBlue },
              ].map((st, idx) => (
                <View key={st.lbl} style={[pv.listStatCell, idx < 3 && pv.listStatCellBorder, idx < 3 && { borderRightColor: tc.borderLight }]}>
                  <View style={[pv.listStatIconBox, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon} size={14} color={st.color} />
                  </View>
                  <Text style={[pv.listStatVal, { color: tc.textPrimary }]}>{st.val}</Text>
                  <Text style={[pv.listStatLbl, { color: tc.textTertiary }]}>{st.lbl}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Walk + transit pills */}
          {(listingWalkScore || listingTransitInfo) ? (
            <View style={pv.listTransportRow}>
              {listingWalkScore ? (
                <View style={[pv.listTransportPill, { backgroundColor: walkBg }]}>
                  <Text style={[pv.listTransportText, { color: walkColor }]}>🚶 Walk {listingWalkScore}</Text>
                </View>
              ) : null}
              {listingTransitInfo ? (
                <View style={[pv.listTransportPill, { backgroundColor: palette.brandBlueLight }]}>
                  <Text style={[pv.listTransportText, { color: palette.brandBlue }]}>🚇 {listingTransitInfo}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Description */}
          {body ? (
            <Text style={[pv.listDesc, { color: tc.textSecondary }]} numberOfLines={2}>{body}</Text>
          ) : null}

          {/* Amenity chips */}
          {listingAmenities && listingAmenities.length > 0 ? (
            <View style={pv.listTagsRow}>
              {listingAmenities.slice(0, 4).map((tag, i) => (
                <View key={i} style={pv.listTagChip}>
                  <Ionicons name="checkmark-circle" size={11} color={palette.brandGreen} />
                  <Text style={pv.listTagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  // ── Restaurant preview (matches Food tab card) ──
  const renderRestaurantPreview = () => {
    const priceSymbol = (restPriceRange ?? "").includes("$$$$") ? "$$$$"
      : (restPriceRange ?? "").includes("$$$") ? "$$$"
      : (restPriceRange ?? "").includes("$$") ? "$$"
      : restPriceRange ? "$" : null;

    return (
      <View style={[pv.restCard, { borderColor: tc.borderLight }]}>
        {/* Image carousel / single image */}
        <View style={pv.restCardImgWrap}>
          {attachedFiles.length > 1 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={StyleSheet.absoluteFill}>
              {attachedFiles.map((f, i) => (
                <View key={i} style={{ width: SW - 32, height: 165 }}>
                  <FadeImage uri={f.uri} style={StyleSheet.absoluteFill} cachePolicy="memory" />
                  {/* SPRINT-42: use shared FadeImage for restaurant carousel media. */}
                </View>
              ))}
            </ScrollView>
          ) : attachedFiles.length === 1 ? (
            <FadeImage uri={attachedFiles[0].uri} style={StyleSheet.absoluteFill} cachePolicy="memory" /> // SPRINT-42: use shared FadeImage for restaurant preview media.
          ) : (
            <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="restaurant" size={44} color="rgba(255,255,255,0.3)" />
              </View>
            </LinearGradient>
          )}
          {/* Open badge */}
          <View style={pv.restStatusBadge}>
            <View style={pv.restStatusDot} />
            <Text style={pv.restStatusText}>Open · Preview</Text>
          </View>
          {/* Fav button */}
          <View style={pv.restFavBtn}>
            <Ionicons name="heart-outline" size={18} color={palette.white} />
          </View>
          {/* Price overlay */}
          {priceSymbol ? (
            <View style={pv.restPriceOverlay}>
              <Text style={pv.restPriceOverlayText}>{priceSymbol}</Text>
            </View>
          ) : null}
          {/* Image count pill */}
          {attachedFiles.length > 1 && (
            <View style={{ position: "absolute", top: 10, right: 48, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="images-outline" size={11} color={palette.white} />
              <Text style={{ color: palette.white, fontSize: 11, fontWeight: "700" }}>{attachedFiles.length} photos</Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View style={[pv.restCardBody, { backgroundColor: tc.cardBg }]}>
          {/* Name + verified */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Text style={[pv.restName, { color: tc.textPrimary }]} numberOfLines={1}>{title || "Restaurant name..."}</Text>
          </View>
          {restCuisine ? (
            <Text style={[pv.restCuisine, { color: tc.textSecondary }]}>{restCuisine}</Text>
          ) : null}

          {/* Rating + location chips */}
          <View style={pv.restInfoRow}>
            <View style={pv.restRatingChip}>
              <Ionicons name="star" size={12} color={palette.amber500} />
              <Text style={pv.restRatingNum}>New</Text>
            </View>
            {location ? (
              <View style={pv.restDistChip}>
                <Ionicons name="location-outline" size={11} color={palette.gray500} />
                <Text style={pv.restMetaText}>{location}</Text>
              </View>
            ) : null}
          </View>

          {/* Services row */}
          {restFeatures && restFeatures.length > 0 ? (
            <View style={pv.restServicesRow}>
              {restFeatures.slice(0, 3).map((sv, i) => (
                <View key={i} style={pv.restServiceChip}>
                  <Text style={pv.restServiceText}>{sv}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Description (popular dishes / review body) */}
          {body ? (
            <View style={pv.restDishesRow}>
              <Ionicons name="flame-outline" size={12} color={palette.brandTeal} />
              <Text style={[pv.restDishesText, { color: tc.textSecondary }]} numberOfLines={1}>{body}</Text>
            </View>
          ) : null}

          {/* Bottom action row */}
          <View style={[pv.restCardMeta, { borderTopColor: tc.borderLight }]}>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 }}>
              {extraFields.filter((f) => f.value && f.label !== "Cuisine" && f.label !== "Price" && f.label !== "Phone").slice(0, 2).map((f, i) => (
                <View key={i} style={pv.restCardTag}>
                  <Text style={pv.restCardTagText}>{f.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View style={pv.restNavBtn}>
                <Ionicons name="navigate-outline" size={14} color={palette.brandBlue} />
              </View>
              <View style={{ borderRadius: 10, overflow: "hidden" }}>
                <LinearGradient
                  colors={[palette.brandBlue, palette.brandGreen]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={pv.restReserveBtn}
                >
                  <Ionicons name="calendar-outline" size={12} color={palette.white} />
                  <Text style={pv.restReserveBtnText}>Reserve</Text>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ── News / community post preview (like PostCard in Feed) ──
  const renderNewsPreview = () => {
    const catField = extraFields.find((f) => f.label === "Category");
    const tagsField = extraFields.find((f) => f.label === "Tags");
    return (
      <View style={[pv.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
        {/* Gradient accent line */}
        <LinearGradient
          colors={type.gradient as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={pv.newsAccentLine}
        />
        {/* Image */}
        {attachedFiles.length > 0 && (
          <View style={[pv.newsImg, { overflow: "hidden" }]}>
            <FadeImage uri={attachedFiles[0].uri} style={StyleSheet.absoluteFill} cachePolicy="memory" />
            {/* SPRINT-42: use shared FadeImage for feed preview media. */}
            {attachedFiles.length > 1 && (
              <View style={pv.imgCountBadge}>
                <Ionicons name="images" size={11} color={palette.white} />
                <Text style={pv.imgCountText}>+{attachedFiles.length - 1}</Text>
              </View>
            )}
          </View>
        )}
        {/* Author row */}
        <View style={pv.authorRow}>
          <LinearGradient colors={type.gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pv.avatar}>
            <Text style={pv.avatarText}>{userInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[pv.authorName, { color: tc.textPrimary }]}>{userName}</Text>
            </View>
            <Text style={[pv.postTime, { color: tc.textTertiary }]}>Just now</Text>
          </View>
          {catField?.value ? (
            <View style={[pv.newsCatBadge, { backgroundColor: type.bg }]}>
              <Text style={[pv.newsCatText, { color: type.color }]}>{catField.value}</Text>
            </View>
          ) : null}
        </View>
        {/* Title + body */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[pv.title, { color: tc.textPrimary, paddingHorizontal: 0, marginBottom: 6 }]} numberOfLines={2}>
            {title || "Your post title..."}
          </Text>
          <Text style={[pv.body, { color: tc.textSecondary, paddingHorizontal: 0 }]} numberOfLines={3}>
            {body || "Your content will appear here..."}
          </Text>
        </View>
        {/* Tags */}
        {tagsField?.value ? (
          <View style={{ flexDirection: "row", gap: 6, marginHorizontal: 16, marginBottom: 10, flexWrap: "wrap" }}>
            {tagsField.value.split(",").slice(0, 3).map((t, i) => (
              <View key={i} style={{ backgroundColor: type.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: type.color }}>#{t.trim()}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {/* Action bar */}
        <View style={pv.actionsRow}>
          <View style={pv.actionItem}><Ionicons name="heart-outline" size={17} color={palette.gray400} /><Text style={pv.actionText}>0</Text></View>
          <View style={pv.actionItem}><Ionicons name="chatbubble-outline" size={16} color={palette.gray400} /><Text style={pv.actionText}>0</Text></View>
          <View style={pv.actionItem}><Ionicons name="share-social-outline" size={16} color={palette.gray400} /><Text style={pv.actionText}>Share</Text></View>
          <View style={[pv.actionItem, { marginLeft: "auto" as any }]}><Ionicons name="bookmark-outline" size={16} color={palette.gray400} /></View>
        </View>
      </View>
    );
  };

  return (
    // A form-sheet route (app/_layout.tsx): the native sheet gives the grabber, the rounded top and drag to close.
        <View style={[pv.sheet, { backgroundColor: tc.pageBg }]}>
          <View style={[pv.header, { borderBottomColor: tc.borderLight }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LinearGradient colors={type.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pv.headerBadge}>
                <Ionicons name={type.icon} size={11} color={palette.white} />
              </LinearGradient>
              <Text style={[pv.headerTitle, { color: tc.textPrimary }]}>Preview</Text>
            </View>
            <Pressable onPress={onClose} style={[pv.closeBtn, { backgroundColor: tc.inputBg }]}>
              <Ionicons name="close" size={18} color={tc.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Tab label */}
            <View style={[pv.feedTabHint, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
              <Ionicons name="phone-portrait-outline" size={13} color={tc.textTertiary} />
              <Text style={[pv.feedTabHintText, { color: tc.textTertiary }]}>
                This is how it looks on the{" "}
                <Text style={{ fontWeight: "800", color: type.color }}>
                  {type.id === "story" ? "Stories" : type.id === "event" ? "Events" : type.id === "challenge" ? "Quests" : type.id === "listing" ? "Housing" : type.id === "shared_space" ? "Shared Space" : type.id === "restaurant" ? "Food" : "News"}
                </Text>{" "}feed
              </Text>
            </View>

            {type.id === "story" && renderStoryPreview()}
            {type.id === "event" && renderEventPreview()}
            {type.id === "challenge" && renderChallengePreview()}
            {type.id === "listing" && renderListingPreview()}
            {type.id === "shared_space" && renderListingPreview()}
            {type.id === "restaurant" && renderRestaurantPreview()}
            {type.id === "news" && renderNewsPreview()}
          </ScrollView>
        </View>
  );
}

export const pv = createThemedStyles({
  sheet: { flex: 1, paddingTop: 22 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBadge: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  feedTabHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  feedTabHintText: { fontSize: 12, fontWeight: "600" },

  // ── Generic card (news / shared fallback) ──
  card: {
    margin: 16, borderRadius: 20, overflow: "hidden",
    borderWidth: 1, shadowColor: palette.black, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  newsAccentLine: { height: 3, width: "100%" },
  newsImg: {
    height: 160, position: "relative" as any,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden",
  },
  imgCountBadge: {
    position: "absolute" as any, bottom: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  imgCountText: { fontSize: 11, fontWeight: "800", color: palette.white },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, paddingHorizontal: 16, paddingTop: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "800", color: palette.white },
  authorName: { fontSize: 14, fontWeight: "700" },
  postTime: { fontSize: 11, marginTop: 1 },
  newsCatBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  newsCatText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 8, lineHeight: 23, letterSpacing: -0.3, paddingHorizontal: 16 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 12, paddingHorizontal: 16 },
  actionsRow: {
    flexDirection: "row", gap: 20, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center", paddingHorizontal: 16, paddingBottom: 14,
  },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, color: palette.gray400, fontWeight: "600" },

  // ── Story preview ──
  storyImgWrap: { width: "100%", height: 185, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden", position: "relative" },
  storyImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  storyImgLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginTop: 4 },
  storyDurBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  storyDurText: { fontSize: 10, fontWeight: "700", color: palette.white },
  storyNewBadge: {
    position: "absolute", top: 10, left: 10,
    backgroundColor: palette.brandBlue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  storyNewText: { fontSize: 8, fontWeight: "800", color: palette.white, letterSpacing: 0.5 },
  storyBody: { padding: 14 },
  storyAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  storyAv: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  storyAuthorName: { fontSize: 14, fontWeight: "800" },
  storyTime: { fontSize: 11, fontWeight: "500", color: palette.gray400 },
  storyCatDot: { width: 4, height: 4, borderRadius: 2 },
  storyCatLabel: { fontSize: 11, fontWeight: "700" },
  storyTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21, marginBottom: 4 },
  storyDesc: { fontSize: 13, fontWeight: "500", color: palette.gray500, lineHeight: 18, marginBottom: 8 },
  storyHashRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  storyHash: { fontSize: 12, fontWeight: "700", color: palette.brandBlue },
  storyEngBar: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.neutralL94,
  },
  storyEngItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  storyEngText: { fontSize: 12, fontWeight: "600", color: palette.gray400 },

  // ── Event preview ──
  eventCard: {
    margin: 16, borderRadius: 22, overflow: "hidden", height: 260,
    shadowColor: palette.black, shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  eventImg: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  eventOverlay: { ...StyleSheet.absoluteFill, padding: 16, justifyContent: "flex-end" },
  eventCatBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  eventCatText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  eventDateBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  eventDateText: { fontSize: 10, fontWeight: "700", color: palette.white },
  eventTitle: { fontSize: 20, fontWeight: "800", color: palette.white, lineHeight: 26, marginBottom: 8, letterSpacing: -0.3 },
  eventMeta: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  eventDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  eventIntBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  eventRsvp: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // ── Challenge preview ──
  challengeCard: {
    margin: 16, borderRadius: 22, overflow: "hidden", borderWidth: 1,
    shadowColor: palette.black, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  challengeHeader: { padding: 18, paddingBottom: 20, overflow: "hidden", position: "relative" },
  challengeHeaderDecor1: {
    position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  challengeHeaderDecor2: {
    position: "absolute", bottom: -20, left: -20, width: 70, height: 70, borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  challengeTypePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  challengeTypeText: { fontSize: 10, fontWeight: "900", color: palette.brandTeal, letterSpacing: 0.8, textTransform: "uppercase" },
  challengeDurPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  challengeTitle: { fontSize: 19, fontWeight: "900", color: palette.white, lineHeight: 25, letterSpacing: -0.3 },
  challengeBody: { padding: 16 },
  challengeAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  challengeAv: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  challengeAuthorName: { fontSize: 13, fontWeight: "700" },
  challengeAuthorTime: { fontSize: 10, fontWeight: "500", color: palette.gray400 },
  challengeStatusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  challengeDesc: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  challengeInfoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  challengeInfoChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  challengeInfoText: { fontSize: 11, fontWeight: "700" },
  challengeProgress: { marginBottom: 14 },
  challengeBarBg: { height: 6, borderRadius: 3, backgroundColor: palette.gray100 },
  challengeBarFill: { height: 6, borderRadius: 3, minWidth: 2 },
  challengeActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  challengeJoinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 14 },
  challengeJoinText: { fontSize: 14, fontWeight: "800", color: palette.white },
  challengeShareBtn: {
    width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },

  // ── Listing preview (matches Housing tab card) ──
  listCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: "hidden",
    shadowColor: palette.black, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1,
  },
  listCardImgWrap: { height: 220, position: "relative" as any, overflow: "hidden" },
  listImageScrim: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 110,
    paddingHorizontal: 14, paddingBottom: 14, justifyContent: "flex-end", gap: 4,
  },
  listTypePill: {
    backgroundColor: "rgba(26,107,174,0.88)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7,
  },
  listTypePillText: { fontSize: 10, fontWeight: "800", color: palette.white, letterSpacing: 0.5 },
  listAvailNowPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(22,163,74,0.88)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7,
  },
  listAvailDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.white },
  listAvailNowText: { fontSize: 10, fontWeight: "700", color: palette.white },
  listImagePrice: { fontSize: 20, fontWeight: "900", color: palette.white, letterSpacing: -0.3 },
  listImageLocation: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  listNewBadge: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: palette.brandBlue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  listNewBadgeText: { fontSize: 9, fontWeight: "900", color: palette.white, letterSpacing: 0.6 },
  listCardBody: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 },
  listLandlordBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  listAv: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  listAvText: { fontSize: 13, fontWeight: "900", color: palette.white },
  listLandlordName: { fontSize: 13, fontWeight: "700", flex: 1 },
  listVerifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: palette.green100, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  listVerifiedText: { fontSize: 10, fontWeight: "700", color: palette.brandGreen },
  listChatBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: palette.brandBlue, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  listChatBtnText: { fontSize: 12, fontWeight: "700", color: palette.white },
  listTitle: { fontSize: 16, fontWeight: "800", lineHeight: 22, marginBottom: 8 },
  listSubRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  listDepositPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
  },
  listDepositText: { fontSize: 11, fontWeight: "600", color: palette.gray500 },
  listAvailImmPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: palette.green100, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  listAvailDotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.green500 },
  listAvailImmText: { fontSize: 11, fontWeight: "700", color: palette.green700 },
  listStatsGrid: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1,
    overflow: "hidden", marginBottom: 10,
  },
  listStatCell: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3 },
  listStatCellBorder: { borderRightWidth: 1 },
  listStatIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  listStatVal: { fontSize: 13, fontWeight: "800" },
  listStatLbl: { fontSize: 10, fontWeight: "500" },
  listTransportRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  listTransportPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  listTransportText: { fontSize: 11, fontWeight: "700" },
  listDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  listTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  listTagChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: palette.brandGreenLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  listTagChipText: { fontSize: 11, fontWeight: "600", color: palette.green800 },

  // ── Restaurant preview (matches Food tab card) ──
  restCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: "hidden",
    shadowColor: palette.black, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
    borderWidth: 1,
  },
  restCardImgWrap: { height: 165, position: "relative" as any, overflow: "hidden" },
  restStatusBadge: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(22,163,74,0.9)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  restStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.white, opacity: 0.85 },
  restStatusText: { fontSize: 11, fontWeight: "700", color: palette.white },
  restFavBtn: {
    position: "absolute", top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  restPriceOverlay: {
    position: "absolute", bottom: 10, right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  restPriceOverlayText: { fontSize: 12, fontWeight: "800", color: palette.white },
  restCardBody: { padding: 14 },
  restName: { fontSize: 16, fontWeight: "800", flex: 1 },
  restCuisine: { fontSize: 12, marginBottom: 8 },
  restInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  restRatingChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: palette.yellowL95, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  restRatingNum: { fontSize: 13, fontWeight: "700" },
  restDistChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: palette.gray100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  restMetaText: { fontSize: 11, fontWeight: "600" },
  restServicesRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  restServiceChip: {
    borderWidth: 1, borderColor: palette.green200,
    borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3,
    backgroundColor: palette.neutralL99_3,
  },
  restServiceText: { fontSize: 10, fontWeight: "700", color: palette.green800 },
  restDishesRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  restDishesText: { fontSize: 11, flex: 1 },
  restCardMeta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 10, borderTopWidth: 1,
  },
  restCardTag: { backgroundColor: palette.green200, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  restCardTagText: { fontSize: 10, fontWeight: "600", color: palette.green800 },
  restNavBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: palette.brandBlueLight,
    alignItems: "center", justifyContent: "center",
  },
  restReserveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  restReserveBtnText: { fontSize: 12, fontWeight: "700", color: palette.white },
});
