import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Animated, Share, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { VerifiedBadgePill } from "../../../../components/BadgeIndicator";
import { useRequireAuth } from "../../../shared/hooks/useRequireAuth";
import { getShareLink } from "../../../utils/shareLinks";
import { actionSheet } from "../../../shared/ui/Dialogs";
import { type Listing, navigateToLandlordChat } from "../listingModel";
import { s } from "../styles/housingScreen.styles";
import { ImageCarousel } from "./ImageViewer";
import { CARD_W } from "../utils";
import { LandlordAvatar } from "./LandlordAvatar";
import { ReportListingModal } from "./ReportListingModal";

// ── Premium Listing card ──────────────────────────────────────────────────────
export function ListingCard({
  listing,
  onPress,
  saved,
  onToggleSave,
  onImagePress,
}: {
  listing: Listing;
  onPress: () => void;
  saved: boolean;
  onToggleSave: () => void;
  onImagePress?: (index: number) => void;
}) {
  const { tc, isDark } = useTheme();
  const { requireAuth } = useRequireAuth();
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const [currentImg, setCurrentImg] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(bookmarkScale, { toValue: 1.35, useNativeDriver: true, speed: 300, bounciness: 18 }),
      Animated.spring(bookmarkScale, { toValue: 1, useNativeDriver: true, speed: 200, bounciness: 6 }),
    ]).start();
    onToggleSave();
  };

  // Double-tap the photo to save (single tap still opens the fullscreen viewer).
  const heartAnim = useRef(new Animated.Value(0)).current;
  const lastImageTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current); }, []);
  const handleImagePress = (idx: number) => {
    const now = Date.now();
    if (now - lastImageTapRef.current < 280) {
      lastImageTapRef.current = 0;
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (saved) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else handleSave();
      heartAnim.setValue(0);
      Animated.sequence([
        Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 12 }),
        Animated.delay(380),
        Animated.timing(heartAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      return;
    }
    lastImageTapRef.current = now;
    singleTapTimerRef.current = setTimeout(() => onImagePress?.(idx), 280);
  };

  const shareListing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = getShareLink("listing", listing.id);
    Share.share({
      message: `Check out this listing: ${listing.title} - ${listing.price}/mo at ${listing.address}. ${listing.beds} beds, ${listing.baths} baths, ${listing.sqft} sqft. Listed on ComLinkr!

${link}`,
      ...(Platform.OS === "ios" ? { url: link } : {}),
    });
  };

  // Long-press the card for quick actions.
  const openQuickActions = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const choice = await actionSheet({
      title: listing.title,
      options: [
        { label: saved ? "Remove from saved" : "Save listing", value: "save" },
        ...(!listing.isOwner ? [{ label: "Message landlord", value: "chat" }] : []),
        { label: "Share", value: "share" },
        { label: "View details", value: "open" },
        ...(!listing.isOwner ? [{ label: "Report listing", value: "report", destructive: true }] : []),
      ],
    });
    if (choice === "save") handleSave();
    else if (choice === "chat") navigateToLandlordChat(listing);
    else if (choice === "share") shareListing();
    else if (choice === "open") onPress();
    else if (choice === "report" && requireAuth(undefined, "Sign in to report this listing.")) setShowReportModal(true);
  };

  const walkColor = listing.walkScore >= 90 ? "#16A34A" : listing.walkScore >= 70 ? "#B45309" : "#DC2626";
  const walkBg    = listing.walkScore >= 90 ? "#DCFCE7" : listing.walkScore >= 70 ? "#FEF9C3" : "#FEE2E2";

  return (
    <View style={[s.card, { backgroundColor: tc.cardBg, borderColor: tc.borderLight }, listing.featured && s.cardFeatured]}>

      {/* ── IMAGE SECTION (own touch events, no Pressable wrapper) ── */}
      <View>
        {listing.images.length > 0 ? (
          <ImageCarousel
            images={listing.images}
            width={CARD_W}
            height={220}
            showDots={false}
            onPageChange={setCurrentImg}
            onImagePress={handleImagePress}
          />
        ) : (
          // LST-02: an intentional compact no-photo state instead of a blank hero
          <View
            style={{ width: CARD_W, height: 188, alignItems: "center", justifyContent: "flex-start", paddingTop: 22, gap: 4, backgroundColor: isDark ? tc.inputBg : "#E8EDF5" }}
            accessibilityLabel="No photos for this listing"
          >
            <Ionicons name="image-outline" size={30} color={tc.textTertiary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: tc.textTertiary }}>No photos yet</Text>
          </View>
        )}

        {/* Bottom scrim — price + location overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.42)"]}
          style={s.imageScrim}
          pointerEvents="none"
        >
          <View style={s.scrimBadgeRow}>
            <View style={[s.typePill, { backgroundColor: "rgba(26,107,174,0.88)" }]}>
              <Text style={s.typePillText}>{listing.type.toUpperCase()}</Text>
            </View>
            {listing.available === "Immediate" && (
              <View style={s.availNowPill}>
                <View style={s.availDot} />
                <Text style={s.availNowText}>Available Now</Text>
              </View>
            )}
          </View>
          <Text style={s.imagePrice}>
            {listing.price}
            <Text style={s.imagePriceNote}>{listing.priceNote}</Text>
          </Text>
          <View style={s.imageLocation}>
            <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={s.imageLocationText} numberOfLines={1}>{listing.address}</Text>
          </View>
        </LinearGradient>

        {/* Dots rendered AFTER the scrim so they sit on top of it */}
        {listing.images.length > 1 && (
          <View style={s.dotsRow} pointerEvents="none">
            {listing.images.map((_, i) => (
              <View key={i} style={[s.dot, i === currentImg && s.dotActive]} />
            ))}
          </View>
        )}

        {/* Top-left badges */}
        <View style={s.cardTopLeft} pointerEvents="none">
          {listing.featured && (
            <View style={s.featuredBadge}>
              <Ionicons name="star" size={10} color="#92400E" />
              <Text style={s.featuredText}>Featured</Text>
            </View>
          )}
          {listing.isNew && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Top-right: image count + save */}
        <View style={s.cardTopRight} pointerEvents="box-none">
          {listing.images.length > 1 && (
            <View style={s.imgCountPill} pointerEvents="none">
              <Ionicons name="images-outline" size={11} color="#FFF" />
              <Text style={s.imgCountText}>{listing.images.length}</Text>
            </View>
          )}
          <Pressable onPress={handleSave} hitSlop={10}>
            <Animated.View style={[s.saveBtn, { transform: [{ scale: bookmarkScale }] }]}>
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={19}
                color={saved ? "#257A86" : "#FFF"}
              />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Double-tap save burst */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.saveBurst,
          { opacity: heartAnim, transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] },
        ]}
      >
        <Ionicons name="bookmark" size={64} color="#FFFFFF" />
      </Animated.View>

      {/* ── CARD BODY — Pressable opens detail modal; long-press for quick actions ── */}
      <Pressable
        style={({ pressed }) => [s.cardBody, { backgroundColor: tc.cardBg }, pressed && { backgroundColor: isDark ? tc.sectionBg : "#F8FAFF" }]}
        onPress={onPress}
        onLongPress={() => void openQuickActions()}
        delayLongPress={350}
      >
        {/* ── Landlord bar — avatar, name, rating + Chat & Share ── */}
        <View style={s.landlordBar}>
          <LandlordAvatar
            uri={listing.landlord.avatarUrl}
            initials={listing.landlord.initials}
            color={listing.landlord.color}
            diameter={38}
            style={s.landlordAvatarSmall}
            textStyle={s.landlordInitialsSmall}
          />
          <View style={s.landlordInfo}>
            <View style={s.landlordNameRow}>
              <Text style={[s.landlordNameSmall, { flex: 1, color: tc.textPrimary }]} numberOfLines={1}>{listing.landlord.name}</Text>
              {listing.verified && <VerifiedBadgePill badge="landlord" />}
            </View>
          </View>
          <View style={s.landlordActions}>
            <Pressable
              style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const link = getShareLink("listing", listing.id);
                Share.share({
                  message: `Check out this listing: ${listing.title} - ${listing.price}/mo at ${listing.address}. ${listing.beds} beds, ${listing.baths} baths, ${listing.sqft} sqft. Listed on ComLinkr!\n\n${link}`,
                  ...(Platform.OS === "ios" ? { url: link } : {}),
                });
              }}
            >
              <Ionicons name="share-social-outline" size={13} color={Colors.brand.blue} />
            </Pressable>
            {!listing.isOwner ? (
              <Pressable
                style={({ pressed }) => [s.reportBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (!requireAuth(undefined, "Sign in to report this listing.")) return;
                  setShowReportModal(true);
                }}
              >
                <Ionicons name="flag-outline" size={12} color="#DC2626" />
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [s.chatBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
              onPress={(e) => {
                e.stopPropagation();
                navigateToLandlordChat(listing);
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={13} color="#FFF" />
              <Text style={s.chatBtnText}>Chat</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Title ── */}
        <View style={s.titleRow}>
          <Text style={[s.cardTitle, { color: tc.textPrimary }]} numberOfLines={2}>{listing.title}</Text>
        </View>

        {/* ── Deposit + available ── */}
        <View style={s.subRow}>
          <View style={[s.depositPill, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
            <Ionicons name="card-outline" size={11} color={tc.textSecondary} />
            <Text style={[s.depositText, { color: tc.textSecondary }]}>Deposit {listing.deposit}</Text>
          </View>
          {listing.available === "Immediate" ? (
            <View style={s.availImmediatePill}>
              <View style={s.availDotSmall} />
              <Text style={s.availImmediateText}>Move-in Ready</Text>
            </View>
          ) : (
            <View style={[s.availDatePill, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
              <Ionicons name="calendar-outline" size={11} color={Colors.brand.blue} />
              <Text style={[s.availDateText, isDark && { color: tc.textPrimary }]}>{listing.available}</Text>
            </View>
          )}
        </View>

        {/* ── 4-col stats grid ── */}
        <View style={[s.statsGrid, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
          {[
            { icon: "bed-outline" as const,      val: listing.beds === 0 ? "Studio" : String(listing.beds), lbl: "Beds",  bg: "#EEF5FF", color: Colors.brand.blue },
            { icon: "water-outline" as const,     val: String(listing.baths),                                lbl: "Baths", bg: "#E3F1EA", color: Colors.brand.green },
            { icon: "resize-outline" as const,    val: listing.sqft,                                         lbl: "Sqft",  bg: "#E2F0F1", color: "#257A86" },
            { icon: "business-outline" as const,  val: listing.floor === "Ground Floor" ? "G" : listing.floor.split(" ")[0],                         lbl: "Floor", bg: Colors.brand.blueLight, color: Colors.brand.blue },
          ].map((st, idx) => (
            <View key={st.lbl} style={[s.statCell, idx < 3 && s.statCellBorder, idx < 3 && isDark && { borderRightColor: tc.borderLight }]}>
              <View style={[s.statIconBox, { backgroundColor: isDark ? tc.sectionBg : st.bg }]}>
                <Ionicons name={st.icon} size={15} color={st.color} />
              </View>
              <Text style={[s.statVal, { color: tc.textPrimary }]}>{st.val}</Text>
              <Text style={[s.statLbl, { color: tc.textTertiary }]}>{st.lbl}</Text>
            </View>
          ))}
        </View>

        {/* ── Walk score + transit (only when the listing has them; 0 / "N/A" mean no data) ── */}
        {(listing.walkScore > 0 || listing.transitInfo !== "N/A") && (
          <View style={s.transportRow}>
            {listing.walkScore > 0 && (
              <View style={[s.transportPill, { backgroundColor: isDark ? tc.inputBg : walkBg }]}>
                <Text style={[s.transportPillText, { color: walkColor }]}>🚶 Walk {listing.walkScore}</Text>
              </View>
            )}
            {listing.transitInfo !== "N/A" && (
              <View style={[s.transportPill, { backgroundColor: isDark ? tc.inputBg : Colors.brand.blueLight }]}>
                <Text style={[s.transportPillText, { color: Colors.brand.blue }]}>🚇 {listing.transitInfo}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Amenity tags ── */}
        <View style={s.tagsRowCard}>
          {listing.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={s.tagChip}>
              <Ionicons name="checkmark-circle" size={11} color={Colors.brand.green} />
              <Text style={s.tagChipText}>{tag}</Text>
            </View>
          ))}
          {listing.tags.length > 3 && (
            <View style={[s.tagChip, s.tagChipMore]}>
              <Text style={[s.tagChipText, { color: Colors.brand.blue }]}>+{listing.tags.length - 3}</Text>
            </View>
          )}
        </View>

        {/* ── View Details CTA ── */}
        <Pressable
          style={({ pressed }) => [s.viewDetailsCta, isDark && { backgroundColor: tc.inputBg, borderColor: tc.borderLight }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={onPress}
        >
          <Text style={[s.viewDetailsText, isDark && { color: tc.textPrimary }]}>View Full Details</Text>
        </Pressable>
      </Pressable>

      <ReportListingModal
        visible={showReportModal}
        listingId={listing.id}
        listingTitle={listing.title}
        onClose={() => setShowReportModal(false)}
      />
    </View>
  );
}
