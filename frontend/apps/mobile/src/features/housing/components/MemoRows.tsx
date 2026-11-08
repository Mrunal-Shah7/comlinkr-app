import { memo } from "react";
import { type Roommate } from "../roommateModel";
import { RoommateCard } from "./RoommateCard";

// ── Memoized list rows ───────────────────────────────────────────────────────
// Parent handlers are stable (useStableCallback) and take ids/rows, so a card only re-renders
// when its own listing / saved flag changes instead of on every HousingScreen render.
export const MemoRoommateCard = memo(function MemoRoommateCard({
  roommate,
  isSaved,
  onToggleSaveId,
  onOpenId,
  onConnectRm,
  onCancelRm,
  onOpenConversation,
}: {
  roommate: Roommate;
  isSaved: boolean;
  onToggleSaveId: (id: string) => void;
  onOpenId: (id: string) => void;
  onConnectRm: (rm: Roommate) => void;
  onCancelRm: (rm: Roommate) => void;
  onOpenConversation: (conversationId: string) => void;
}) {
  return (
    <RoommateCard
      roommate={roommate}
      isSaved={isSaved}
      onToggleSave={() => onToggleSaveId(roommate.id)}
      onPress={() => onOpenId(roommate.id)}
      onConnect={() => onConnectRm(roommate)}
      onCancelRequest={() => onCancelRm(roommate)}
      onOpenConversation={onOpenConversation}
    />
  );
});
