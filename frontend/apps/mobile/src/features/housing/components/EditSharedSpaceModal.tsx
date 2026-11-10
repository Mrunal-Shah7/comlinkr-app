// src/features/housing/components/EditSharedSpaceModal.tsx
//
// The owner's quick edit of a shared space (description, rent, deposit, spots). Opened from the room detail
// route; moved out of the Listings tab with plan 03.
import { palette } from "../../../theme/palette";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { DSheet } from "../../../shared/d/Sheet";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../../theme/colors";
import { useTheme } from "../../../theme/useTheme";
import { rs } from "../../../utils/responsive";
import { ApiError } from "../../../api/client";
import { updateSharedSpace } from "../../../api/roommates.api";
import { showToast } from "../../../shared/ui/Toast";
import { type AvailableRoom, toUiAvailableRoom } from "../roommateModel";

export function EditSharedSpaceModal({
  room,
  onClose,
  onSaved,
}: {
  room: AvailableRoom | null;
  onClose: () => void;
  onSaved: (room: AvailableRoom) => void;
}) {
  const { tc } = useTheme();
  const [editRoomDesc, setEditRoomDesc] = useState("");
  const [editRoomPrice, setEditRoomPrice] = useState("");
  const [editRoomDeposit, setEditRoomDeposit] = useState("");
  const [editRoomSpots, setEditRoomSpots] = useState("");
  const [editRoomSaving, setEditRoomSaving] = useState(false);

  // Fill the form each time a room is opened for editing.
  useEffect(() => {
    if (!room) return;
    // The description, not apartmentDesc (that is the title): saving must not overwrite one with the other.
    setEditRoomDesc(room.api?.description ?? "");
    setEditRoomPrice(String(room.rentPerMonth ?? ""));
    setEditRoomDeposit(String(room.deposit ?? ""));
    setEditRoomSpots(String(room.availableRooms ?? ""));
  }, [room]);

  const handleSaveEditSharedSpace = async () => {
    if (!room) return;
    const price = Number(editRoomPrice);
    const deposit = editRoomDeposit.trim() ? Number(editRoomDeposit) : undefined;
    const availableSpots = Number(editRoomSpots);
    if (!editRoomDesc.trim()) {
      showToast("Description can't be empty.", "error");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      showToast("Enter a valid monthly rent.", "error");
      return;
    }
    if (!Number.isFinite(availableSpots) || availableSpots < 0) {
      showToast("Enter a valid number of available spots.", "error");
      return;
    }
    setEditRoomSaving(true);
    try {
      const updated = await updateSharedSpace(room.id, {
        description: editRoomDesc.trim(),
        price,
        deposit: deposit != null && Number.isFinite(deposit) ? deposit : undefined,
        availableSpots,
      });
      const merged = toUiAvailableRoom(updated);
      onSaved(merged);
      onClose();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Changes saved.", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save changes. Try again.", "error");
    } finally {
      setEditRoomSaving(false);
    }
  };

  return (
    <DSheet visible={!!room} onClose={() => !editRoomSaving && onClose()} full>
        <View style={{ flex: 1, backgroundColor: tc.sheetBg ?? tc.cardBg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: rs(20), paddingVertical: rs(14), borderBottomWidth: 1, borderBottomColor: tc.borderLight }}>
            <Pressable onPress={() => !editRoomSaving && onClose()} hitSlop={12}>
              <Ionicons name="close" size={24} color={tc.textPrimary} />
            </Pressable>
            <Text style={{ fontSize: rs(16), fontWeight: "800", color: tc.textPrimary }}>Edit Listing</Text>
            <Pressable
              onPress={() => void handleSaveEditSharedSpace()}
              hitSlop={12}
              disabled={editRoomSaving}
              style={{ backgroundColor: Colors.brand.blue, borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(7), opacity: editRoomSaving ? 0.65 : 1 }}
            >
              {editRoomSaving ? <ActivityIndicator color={palette.white} size="small" /> : <Text style={{ color: palette.white, fontWeight: "800", fontSize: rs(13) }}>Save</Text>}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: rs(20), gap: rs(18) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                Description
              </Text>
              <TextInput
                style={{ borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(12), backgroundColor: tc.inputBg, color: tc.textPrimary, paddingHorizontal: rs(14), paddingVertical: rs(12), fontSize: rs(14), minHeight: rs(110), textAlignVertical: "top" }}
                value={editRoomDesc}
                onChangeText={setEditRoomDesc}
                placeholder="Describe the space, house rules, what makes it a good fit..."
                placeholderTextColor={tc.textTertiary}
                multiline
                editable={!editRoomSaving}
              />
            </View>

            <View style={{ flexDirection: "row", gap: rs(10) }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Monthly Rent
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, paddingHorizontal: rs(10), height: rs(46) }}>
                  <Text style={{ color: tc.textSecondary, fontWeight: "700", marginRight: rs(4) }}>$</Text>
                  <TextInput
                    style={{ flex: 1, fontSize: rs(14), color: tc.textPrimary }}
                    value={editRoomPrice}
                    onChangeText={setEditRoomPrice}
                    keyboardType="numeric"
                    placeholder="Rent"
                    placeholderTextColor={tc.textTertiary}
                    editable={!editRoomSaving}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Deposit
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, paddingHorizontal: rs(10), height: rs(46) }}>
                  <Text style={{ color: tc.textSecondary, fontWeight: "700", marginRight: rs(4) }}>$</Text>
                  <TextInput
                    style={{ flex: 1, fontSize: rs(14), color: tc.textPrimary }}
                    value={editRoomDeposit}
                    onChangeText={setEditRoomDeposit}
                    keyboardType="numeric"
                    placeholder="Deposit"
                    placeholderTextColor={tc.textTertiary}
                    editable={!editRoomSaving}
                  />
                </View>
              </View>
            </View>

            <View>
              <Text style={{ fontSize: rs(12), fontWeight: "700", color: tc.textTertiary, marginBottom: rs(8), textTransform: "uppercase", letterSpacing: 0.4 }}>
                Available Spots
              </Text>
              <TextInput
                style={{ borderWidth: 1.5, borderColor: tc.borderLight, borderRadius: rs(10), backgroundColor: tc.inputBg, color: tc.textPrimary, paddingHorizontal: rs(14), height: rs(46), fontSize: rs(14) }}
                value={editRoomSpots}
                onChangeText={setEditRoomSpots}
                keyboardType="numeric"
                placeholder="e.g. 1"
                placeholderTextColor={tc.textTertiary}
                editable={!editRoomSaving}
              />
            </View>
          </ScrollView>
        </View>
    </DSheet>
  );
}
