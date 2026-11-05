// Renders plain text with any http(s):// URLs turned into tappable links.
// React Native's <Text> does not auto-linkify URLs the way native text views can,
// so free-text fields (listing descriptions, bios, etc.) need this to make pasted
// links (e.g. a YouTube video tour) actually open.
import React from "react";
import { Text, Linking, Alert, type TextStyle, type StyleProp } from "react-native";
import { appAlert } from '../src/shared/ui/Dialogs';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({
  text,
  style,
  linkStyle,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
}) {
  const parts = text.split(URL_REGEX);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (!URL_REGEX.test(part)) {
          URL_REGEX.lastIndex = 0;
          return <React.Fragment key={i}>{part}</React.Fragment>;
        }
        URL_REGEX.lastIndex = 0;
        // Trim trailing punctuation that's likely part of the sentence, not the URL.
        const trailingMatch = part.match(/[).,!?]+$/);
        const trailing = trailingMatch ? trailingMatch[0] : "";
        const url = trailing ? part.slice(0, -trailing.length) : part;
        return (
          <React.Fragment key={i}>
            <Text
              style={linkStyle ?? { color: "#1A6BAE", textDecorationLine: "underline" }}
              onPress={() => {
                Linking.openURL(url).catch(() => {
                  appAlert("Could not open link", "This link could not be opened.");
                });
              }}
            >
              {url}
            </Text>
            {trailing}
          </React.Fragment>
        );
      })}
    </Text>
  );
}
