// src/shared/d/DetailLink.tsx — iOS peek and context menu for a card that opens a detail route (TR-013, point 8).
// On iOS the card is wrapped in an expo-router <Link> with <Link.Preview> (press and hold shows the detail) and an
// optional <Link.Menu>. The tap stays the card's own Pressable, so the route is pushed once; tapping the preview
// opens it through the Link. On Android and web the card is returned as it is.
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Link, type Href } from "expo-router";

export type DetailLinkAction = {
  title: string;
  /** SF Symbol name. */
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
};

export const DETAIL_LINK_ON = process.env.EXPO_OS === "ios";

export function DetailLink({ href, children, style, actions }: {
  href: string;
  children: ReactNode;
  /** Layout for the wrapper, e.g. { flex: 1 } when the card sits in a row. iOS only. */
  style?: StyleProp<ViewStyle>;
  actions?: DetailLinkAction[];
}) {
  if (!DETAIL_LINK_ON) return <>{children}</>;
  return (
    <Link href={href as Href} asChild>
      <Link.Trigger>
        <View style={style}>{children}</View>
      </Link.Trigger>
      <Link.Preview />
      {actions && actions.length ? (
        <Link.Menu>
          {actions.map((a) => (
            <Link.MenuAction key={a.title} title={a.title} icon={a.icon as never} destructive={a.destructive} onPress={a.onPress} />
          ))}
        </Link.Menu>
      ) : null}
    </Link>
  );
}

/** The route for each detail, so cards and menus agree. */
export const detailHref = {
  listing: (id: string) => `/listing/${encodeURIComponent(id)}`,
  room: (id: string) => `/room/${encodeURIComponent(id)}`,
  restaurant: (id: string) => `/restaurant/${encodeURIComponent(id)}`,
  event: (id: string) => `/events/${encodeURIComponent(id)}`,
};
