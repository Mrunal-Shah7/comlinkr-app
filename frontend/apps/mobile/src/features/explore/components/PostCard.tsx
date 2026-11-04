import { rs } from "../../../utils/responsive";
import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { FadeImage } from "../../../../components/FadeImage";
import { VerifiedBadgePill } from "../../../../components/BadgeIndicator";
import { LinkifiedText } from "../../../../components/LinkifiedText";
import { reportCommunityPost } from "../../../api/community.api";
import { showToast } from "../../../shared/ui/Toast";
import { appAlert } from "../../../shared/ui/Dialogs";
import { type PostCardModel } from "../models";
 // SPRINT-42: preserve backend edit state through the feed-card model.

export function PostCard({
  post, isLiked, isSaved, onLike, onSave, onBlock, onComment, onShare, onDelete, onEdit, // SPRINT-42: expose owner edit in the card overflow.
}: {
  post: PostCardModel;
  isLiked: boolean; isSaved: boolean;
  onLike: () => void; onSave: () => void;
  onBlock?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  /** Shown in header when user owns the post */
  onDelete?: () => void;
  onEdit?: () => void; // SPRINT-42: route an authoritative owner to the shared editor.
}) {
  const { tc, isDark } = useTheme();
  const [showReportModal, setShowReportModal] = useState(false);
  return (
    <View style={[pc.card, isDark && { backgroundColor: tc.cardBg, borderColor: tc.borderLight }]}>
      <FadeImage uri={post.image} style={pc.img} />
      <View style={pc.body}>
        <View style={pc.head}>
          <View style={pc.headLeft}>
            <FadeImage uri={post.avatar} style={pc.avatar} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={pc.nameRow}>
                <Text style={[pc.author, isDark && { color: tc.textPrimary }]}>{post.author}</Text>
                {post.verified && <VerifiedBadgePill badge="local_reviewer" />}
              </View>
              <Text style={[pc.time, isDark && { color: tc.textTertiary }]}>{post.time}</Text>
            </View>
          </View>
          {post.isOwner && onDelete && onEdit ? ( // SPRINT-42: backend isOwner is the sole owner-action authority.
            <Pressable
              onPress={() => appAlert("Post options", undefined, [{ text: "Edit", onPress: onEdit }, { text: "Delete", style: "destructive", onPress: onDelete }, { text: "Cancel", style: "cancel" }])} // SPRINT-42: keep delete while adding Edit to overflow.
              hitSlop={10}
              style={[pc.deleteBtn, isDark && { backgroundColor: tc.sectionBg }]}
              accessibilityLabel="Post options" // SPRINT-42: identify the owner overflow action.
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={tc.textSecondary} />
              {/* SPRINT-42: use an overflow icon for Edit and Delete. */}
            </Pressable>
          ) : null}
        </View>
        <Text style={[pc.title, isDark && { color: tc.textPrimary }]}>{post.title}</Text>
        {post.isEdited ? <Text style={{ fontSize: rs(10), color: tc.textTertiary, marginBottom: rs(3) }}>Edited</Text> : null}
        {/* SPRINT-42: card marker is driven only by backend isEdited. */}
        <LinkifiedText text={post.content} style={[pc.content, isDark && { color: tc.textSecondary }]} />
        <View style={pc.tags}>
          {post.tags.map((t) => (
            <View key={t} style={[pc.tag, isDark && { backgroundColor: Colors.brand.blue + "22" }]}><Text style={[pc.tagText, isDark && { color: "#60A5FA" }]}>{t}</Text></View>
          ))}
        </View>
        <View style={[pc.actions, isDark && { borderTopColor: tc.borderLight }]}>
          <Pressable onPress={onLike} style={pc.action}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={17} color={isLiked ? "#EF4444" : (isDark ? tc.textSecondary : Colors.text.secondary)} />
            <Text style={[pc.actionText, isDark && { color: tc.textSecondary }]}>{post.likes + (isLiked ? 1 : 0)}</Text>
          </Pressable>
          <Pressable onPress={onComment} style={pc.action} disabled={!onComment}>
            <Ionicons name="chatbubble-outline" size={16} color={isDark ? tc.textSecondary : Colors.text.secondary} />
            <Text style={[pc.actionText, isDark && { color: tc.textSecondary }]}>{post.comments}</Text>
          </Pressable>
          <Pressable onPress={onShare} style={pc.action} disabled={!onShare}>
            <Ionicons name="share-social-outline" size={16} color={isDark ? tc.textSecondary : Colors.text.secondary} />
            <Text style={[pc.actionText, isDark && { color: tc.textSecondary }]}>Share</Text>
          </Pressable>
          <Pressable onPress={onSave} style={[pc.action, { marginLeft: "auto" as any }]}>
            <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={16} color={isSaved ? Colors.brand.blue : (isDark ? tc.textSecondary : Colors.text.secondary)} />
          </Pressable>
          {!post.isOwner ? (
            <Pressable
              style={[pc.reportBtn, isDark && { backgroundColor: tc.inputBg }]}
              onPress={() =>
                appAlert(
                  post.author,
                  "What would you like to do?",
                  [
                    { text: "🚩  Report post", onPress: () => setShowReportModal(true) },
                    { text: "🚫  Block " + post.author, style: "destructive", onPress: onBlock },
                    { text: "Cancel", style: "cancel" },
                  ]
                )
              }
            >
              <Ionicons name="flag-outline" size={16} color="#DC2626" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ReportPostModal
        visible={showReportModal}
        postId={post.id}
        onClose={() => setShowReportModal(false)}
      />
    </View>
  );
}

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
