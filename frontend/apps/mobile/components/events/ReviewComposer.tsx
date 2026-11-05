// SPRINT-42: create/edit event review composer with contract bounds (create content max 1000, update max 2000).
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../src/theme/colors";
import { useTheme } from "../../src/theme/useTheme";
import { StarRatingInput } from "./StarRatingInput";
import { appAlert } from '../../src/shared/ui/Dialogs';

const CREATE_CONTENT_MAX = 1000; // SPRINT-42:
const UPDATE_CONTENT_MAX = 2000; // SPRINT-42:

export function ReviewComposer({
  mode,
  initialRating = 0,
  initialContent = "",
  submitting = false,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initialRating?: number;
  initialContent?: string;
  submitting?: boolean;
  onSubmit: (payload: { rating: number; content: string }) => void | Promise<void>;
  onCancel?: () => void;
}) {
  // SPRINT-42:
  const { tc } = useTheme();
  const [rating, setRating] = useState(initialRating);
  const [content, setContent] = useState(initialContent);
  const maxLen = mode === "create" ? CREATE_CONTENT_MAX : UPDATE_CONTENT_MAX;

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      appAlert("Add a rating", "Tap a star to rate this event.");
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) {
      appAlert("Add a review", "Please write a short review.");
      return;
    }
    if (trimmed.length > maxLen) {
      appAlert("Too long", `Reviews can be at most ${maxLen} characters.`);
      return;
    }
    void onSubmit({ rating, content: trimmed });
  };

  return (
    <View style={styles.wrap}>
      <StarRatingInput value={rating} onChange={setRating} disabled={submitting} />
      <View style={[styles.inputWrap, { backgroundColor: tc.inputBg, borderColor: tc.borderLight }]}>
        <TextInput
          style={[styles.input, { color: tc.textPrimary }]}
          placeholder="Share how the event went…"
          placeholderTextColor={tc.textTertiary}
          value={content}
          onChangeText={(t) => setContent(t.slice(0, maxLen))}
          multiline
          editable={!submitting}
          maxLength={maxLen}
        />
        <Text style={[styles.counter, { color: tc.textTertiary }]}>
          {content.trim().length}/{maxLen}
        </Text>
      </View>
      <Pressable
        style={[styles.submitBtn, (!content.trim() || rating < 1 || submitting) && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={!content.trim() || rating < 1 || submitting}
      >
        <LinearGradient colors={[Colors.brand.green, "#256B49"]} style={styles.submitGrad}>
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name={mode === "edit" ? "save-outline" : "send"} size={14} color="#FFF" />
              <Text style={styles.submitText}>{mode === "edit" ? "Save Changes" : "Submit Review"}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
      {onCancel ? (
        <Pressable onPress={onCancel} style={{ marginTop: 8 }} disabled={submitting}>
          <Text style={{ color: tc.textTertiary, textAlign: "center", fontSize: 13 }}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 }, // SPRINT-42:
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    minHeight: 88,
  }, // SPRINT-42:
  input: { fontSize: 14, minHeight: 64, textAlignVertical: "top" }, // SPRINT-42:
  counter: { fontSize: 11, fontWeight: "600", textAlign: "right", marginTop: 4 }, // SPRINT-42:
  submitBtn: { borderRadius: 12, overflow: "hidden", marginTop: 10 }, // SPRINT-42:
  submitGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  }, // SPRINT-42:
  submitText: { color: "#FFF", fontWeight: "800", fontSize: 14 }, // SPRINT-42:
});
