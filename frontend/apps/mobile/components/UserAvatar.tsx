// A person's photo, or their initials on a colour picked from the name. Shared by the public profile and the Follows
// screen (plan 14).
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { palette } from "../src/theme/palette";
import { display } from "../src/theme/d";

export function UserAvatar({ name, uri, size = 88 }: { name: string; uri?: string; size?: number }) {
  const colors = [palette.brandBlue, palette.brandTeal, palette.brandGreen, palette.brandBlueDark, palette.brandGreenDark];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const bg = colors[Math.abs(h) % colors.length];
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
      ) : (
        <Text style={[display(800), { fontSize: size * 0.34, color: palette.white }]}>{initials}</Text>
      )}
    </View>
  );
}
