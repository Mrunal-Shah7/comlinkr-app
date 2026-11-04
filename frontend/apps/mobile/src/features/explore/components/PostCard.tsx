import { rs } from "../../../utils/responsive";
import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { TYPE, body, display } from "../../../theme/d";
import { SPRING } from "../../../shared/motion/presets";
import { FadeImage } from "../../../../components/FadeImage";
import { VerifiedBadgePill } from "../../../../components/BadgeIndicator";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { reportCommunityPost } from "../../../api/community.api";
import { showToast } from "../../../shared/ui/Toast";
import { appAlert } from "../../../shared/ui/Dialogs";
import { type PostCardModel } from "../models";

const LIKE = "#F0457E";

function Pop({ on, name, onName, color, onColor, label, count, onPress }: {
  on: boolean; name: keyof typeof Ionicons.glyphMap; onName: keyof typeof Ionicons.glyphMap; color: string; onColor: string; label: string; count?: number | string; onPress?: () => void;
}) {
  const sc = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Pressable disabled={!onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }}
      onPress={() => { sc.value = withSequence(withTiming(1.32, { duration: 120 }), withSpring(1, SPRING.press)); onPress?.(); }} style={pcd.act}>
      <Animated.View style={st}><Ionicons name={on ? onName : name} size={18} color={on ? onColor : color} /></Animated.View>
      {count !== undefined ? <Text style={[body(700), { fontSize: 13, color: on ? onColor : color }]}>{count}</Text> : null}
    </Pressable>
  );
}

/** A neighbour's post in Explore, design D (plan 01): a speech bubble with the author, title, text, an optional
 *  photo and tags. Report and block live in the ··· menu (problem 7), as do edit and delete for the owner. */
export function PostCard({
  post, isLiked, isSaved, onLike, onSave, onBlock, onComment, onShare, onDelete, onEdit,
}: {
  post: PostCardModel;
  isLiked: boolean; isSaved: boolean;
  onLike: () => void; onSave: () => void;
  onBlock?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  /** Shown in header when user owns the post */
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const { tc, isDark } = useTheme();
  const [showReportModal, setShowReportModal] = useState(false);
  const more = () => {
    if (post.isOwner && onDelete && onEdit) {
      appAlert("Post options", undefined, [{ text: "Edit", onPress: onEdit }, { text: "Delete", style: "destructive", onPress: onDelete }, { text: "Cancel", style: "cancel" }]);
      return;
    }
    appAlert(post.author, "What would you like to do?", [
      { text: "Report post", onPress: () => setShowReportModal(true) },
      ...(onBlock ? [{ text: "Block " + post.author, style: "destructive" as const, onPress: onBlock }] : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };
  return (
    <View style={[pcd.bubble, { backgroundColor: tc.cardBg, borderWidth: isDark ? 1 : 0, borderColor: tc.glassLine }]}>
      <View style={pcd.head}>
        <FadeImage uri={post.avatar} style={pcd.avatar} resizeMode="cover" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={pcd.nameRow}>
            <Text style={[body(700), { color: tc.textPrimary, fontSize: 14 }]} numberOfLines={1}>{post.author}</Text>
            {post.verified ? <VerifiedBadgePill badge="local_reviewer" /> : null}
          </View>
          <Text style={[TYPE.small, { color: tc.textSecondary }]}>{post.time}{post.isEdited ? " · Edited" : ""}</Text>
        </View>
        <Pressable onPress={more} hitSlop={8} style={pcd.more} accessibilityRole="button" accessibilityLabel="More options">
          <Ionicons name="ellipsis-horizontal" size={18} color={tc.textSecondary} />
        </Pressable>
      </View>
      <Text style={[display(700), { fontSize: 18, lineHeight: 22, color: tc.textPrimary, marginTop: 8 }]}>{post.title}</Text>
      {post.content ? <LinkifiedText text={post.content} style={[TYPE.body, { color: tc.textSecondary, marginTop: 4 }]} /> : null}
      {post.image ? <FadeImage uri={post.image} style={pcd.img} /> : null}
      {post.tags.length ? (
        <View style={pcd.tags}>
          {post.tags.map((t) => (
            <View key={t} style={[pcd.tag, { backgroundColor: tc.accentSoft }]}><Text style={[body(700), { fontSize: 12, color: tc.accentText }]}>{t}</Text></View>
          ))}
        </View>
      ) : null}
      <View style={pcd.actions}>
        <Pop on={isLiked} name="heart-outline" onName="heart" color={tc.textSecondary} onColor={LIKE} label="Like" count={post.likes + (isLiked ? 1 : 0)} onPress={onLike} />
        <Pop on={false} name="chatbubble-outline" onName="chatbubble" color={tc.textSecondary} onColor={tc.textSecondary} label="Comments" count={post.comments} onPress={onComment} />
        <Pop on={false} name="share-social-outline" onName="share-social" color={tc.textSecondary} onColor={tc.textSecondary} label="Share" onPress={onShare} />
        <View style={{ marginLeft: "auto" }}>
          <Pop on={isSaved} name="bookmark-outline" onName="bookmark" color={tc.textSecondary} onColor={tc.accentText} label="Save" onPress={onSave} />
        </View>
      </View>
      <ReportPostModal visible={showReportModal} postId={post.id} onClose={() => setShowReportModal(false)} />
    </View>
  );
}

const pcd = StyleSheet.create({
  bubble: { padding: 16, paddingBottom: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomRightRadius: 22, borderBottomLeftRadius: 6, marginBottom: 12, shadowColor: "#0F283C", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  more: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  img: { width: "100%", aspectRatio: 16 / 10, borderRadius: 18, marginTop: 10 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  actions: { flexDirection: "row", alignItems: "center", marginTop: 6, marginHorizontal: -8 },
  act: { flexDirection: "row", alignItems: "center", gap: 5, height: 36, paddingHorizontal: 8 },
});

// ── Report post modal (proper modal with a real close button, instead of
//    nesting one Alert.alert inside another's callback — nested native Alerts
//    on Android can leave the inner dialog with no working dismiss action) ──
export function ReportPostModal({
  visible,
  postId,
  onClose,
}: {
  visible: boolean;
  postId: string;
  onClose: () => void;
}) {
  const { isDark, tc } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const REASONS = ["Spam or scam", "Misinformation", "Inappropriate content", "Harassment or hate", "Other"];

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected) {
      showToast("Please choose a reason for your report.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await reportCommunityPost(postId, selected);
      showToast("We'll review this post. Thanks for keeping the community safe.", "success");
      handleClose();
    } catch {
      showToast("Could not report. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={rpm.overlay} onPress={handleClose}>
        <Pressable style={[rpm.sheet, isDark && { backgroundColor: tc.sheetBg }]} onPress={(e) => e.stopPropagation()}>
          <View style={rpm.header}>
            <Text style={[rpm.title, { color: tc.textPrimary }]}>Report Post</Text>
            <Pressable onPress={handleClose} hitSlop={10} style={[rpm.closeBtn, { backgroundColor: tc.inputBg }]}>
              <Ionicons name="close" size={18} color={tc.textSecondary} />
            </Pressable>
          </View>
          <Text style={[rpm.subtitle, { color: tc.textSecondary }]}>Why are you reporting this?</Text>
          {REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => setSelected(reason)}
              style={[
                rpm.reasonRow,
                { borderColor: tc.borderLight, backgroundColor: tc.inputBg },
                selected === reason && rpm.reasonRowActive,
              ]}
            >
              <Ionicons
                name={selected === reason ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={selected === reason ? "#DC2626" : tc.textTertiary}
              />
              <Text style={[rpm.reasonText, { color: tc.textPrimary }]}>{reason}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={submitting}
            style={[rpm.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
          >
            {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={rpm.submitText}>Submit Report</Text>}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const rpm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: rs(20), borderTopRightRadius: rs(20), padding: rs(20), paddingBottom: rs(32) },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: rs(6) },
  title: { fontSize: rs(17), fontWeight: "900" },
  closeBtn: { width: rs(30), height: rs(30), borderRadius: rs(15), alignItems: "center", justifyContent: "center" },
  subtitle: { fontSize: rs(13), fontWeight: "600", marginBottom: rs(14) },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(13), borderRadius: rs(12), borderWidth: 1.5, marginBottom: rs(8) },
  reasonRowActive: { borderColor: "#DC2626", backgroundColor: "#FEE2E2" },
  reasonText: { fontSize: rs(14), fontWeight: "700" },
  submitBtn: { marginTop: rs(8), backgroundColor: "#DC2626", borderRadius: rs(14), paddingVertical: rs(14), alignItems: "center" },
  submitText: { color: "#FFF", fontSize: rs(15), fontWeight: "800" },
});

export const pc = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderRadius: rs(18), marginBottom: rs(14), borderWidth: 1, borderColor: "#ECEEF1", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: rs(8), elevation: 2, overflow: "hidden" },
  img: { width: "100%", height: rs(185) },
  body: { padding: rs(14) },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: rs(10), marginBottom: rs(10) },
  headLeft: { flexDirection: "row", alignItems: "center", gap: rs(10), flex: 1, minWidth: 0 },
  deleteBtn: { width: rs(36), height: rs(36), borderRadius: rs(10), backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  avatar: { width: rs(38), height: rs(38), borderRadius: rs(19) },
  nameRow: { flexDirection: "row", alignItems: "center", gap: rs(6) },
  author: { fontSize: rs(14), fontWeight: "700", color: Colors.text.primary },
  vBadge: { backgroundColor: "#DCFCE7", borderRadius: rs(6), paddingHorizontal: rs(6), paddingVertical: rs(2) },
  vText: { fontSize: rs(10), fontWeight: "700", color: Colors.brand.green },
  time: { fontSize: rs(12), color: Colors.text.tertiary, marginTop: rs(1) },
  title: { fontSize: rs(15), fontWeight: "700", color: Colors.text.primary, marginBottom: rs(4) },
  content: { fontSize: rs(14), color: Colors.text.secondary, lineHeight: rs(20) },
  tags: { flexDirection: "row", gap: rs(6), marginTop: rs(10), flexWrap: "wrap" },
  tag: { backgroundColor: Colors.brand.blueLight, borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(3) },
  tagText: { fontSize: rs(11), fontWeight: "600", color: Colors.brand.blue },
  actions: { flexDirection: "row", gap: rs(16), marginTop: rs(12), paddingTop: rs(12), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#ECEEF1", alignItems: "center" },
  action: { flexDirection: "row", alignItems: "center", gap: rs(5) },
  actionText: { fontSize: rs(13), fontWeight: "600", color: Colors.text.secondary },
  reportBtn: { width: rs(30), height: rs(30), borderRadius: rs(8), backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
});
