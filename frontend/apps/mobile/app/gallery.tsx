// The full-screen photo gallery (TR-017), a transparent modal route over the screen that opened it (see
// app/_layout.tsx). Opened with openGallery(images, index) from src/features/housing/galleryStore.ts.
import { useEffect } from "react";
import { FullscreenImageViewer } from "../src/features/housing/components/ImageViewer";
import { peekGallery } from "../src/features/housing/galleryStore";
import { closeDetail } from "../src/hooks/useDetailRoute";

export default function GalleryScreen() {
  const gallery = peekGallery();
  useEffect(() => {
    // Nothing to show (a cold link): leave at once.
    if (!gallery) closeDetail();
  }, [gallery]);
  if (!gallery) return null;
  return <FullscreenImageViewer images={gallery.images} startIndex={gallery.startIndex} onClose={closeDetail} />;
}
