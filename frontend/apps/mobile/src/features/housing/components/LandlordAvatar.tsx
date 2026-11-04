import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FadeImage } from "../../../../components/FadeImage";

/** Owner / landlord avatar: photo when URL resolves, else initials on brand color. */
export function LandlordAvatar({
  uri,
  initials,
  color,
  diameter,
  style,
  textStyle,
}: {
  uri: string;
  initials: string;
  color: string;
  diameter: number;
  style?: object;
  textStyle?: object;
}) {
  const [showPhoto, setShowPhoto] = useState(!!uri);
  useEffect(() => {
    setShowPhoto(!!uri);
  }, [uri]);
  const fontSize = Math.max(11, Math.round(diameter * 0.36));
  return (
    <View
      style={[
        style,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: color,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {showPhoto && uri ? (
        <FadeImage // SPRINT-42: render owner avatars through the shared image component.
          uri={uri} // SPRINT-42: pass the resolved avatar URL.
          style={StyleSheet.absoluteFill}
          fallbackComponent={<Text style={[{ fontSize, fontWeight: "800", color: "#FFF" }, textStyle]}>{initials}</Text>} // SPRINT-42: preserve initials fallback on failed avatar load.
        />
      ) : (
        <Text style={[{ fontSize, fontWeight: "800", color: "#FFF" }, textStyle]}>{initials}</Text>
      )}
    </View>
  );
}
