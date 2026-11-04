import { useEffect } from "react";
import { router } from "expo-router";

export default function FavoritesScreen() {
  useEffect(() => {
    router.replace("/saved" as any);
  }, []);
  return null;
}
