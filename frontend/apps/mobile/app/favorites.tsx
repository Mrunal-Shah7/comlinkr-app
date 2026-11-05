// Favourites is a tab of Saved now (design D `saved`: Saved, Interested and Favourites in one screen).
import { useEffect } from "react";
import { router } from "expo-router";

export default function FavoritesScreen() {
  useEffect(() => {
    router.replace({ pathname: "/saved", params: { seg: "fav" } } as never);
  }, []);
  return null;
}
