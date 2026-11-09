// The preview of a post being written (TR-017), a form-sheet modal route over the compose form (see
// app/_layout.tsx). Opened with openPreview(draft) from src/features/compose/previewStore.ts.
import { useEffect } from "react";
import { PostPreview } from "../src/features/compose/PostPreview";
import { peekPreview } from "../src/features/compose/previewStore";
import { closeDetail } from "../src/hooks/useDetailRoute";

export default function ComposePreviewScreen() {
  const draft = peekPreview();
  useEffect(() => {
    // Nothing to show (a cold link): leave at once.
    if (!draft) closeDetail();
  }, [draft]);
  if (!draft) return null;
  return <PostPreview {...draft} onClose={closeDetail} />;
}
