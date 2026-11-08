// src/shared/navigation/ComposeSheet.tsx — the "Post something" sheet behind the tab bar's + (design D, plan 01).
// Each row opens today's composer for that type (app/create-post.tsx), or the Community ask sheet.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { RADIUS, TYPE } from '../../theme/d';
import { DSheet } from '../d/Sheet';
import { GradientFill, PressableScale, Reveal } from '../d';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Item = { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; href: any; auth: string };
const ITEMS: Item[] = [
  { icon: 'home-outline', title: 'A whole place for rent', sub: 'Apartment, house or studio', href: { pathname: '/create-post', params: { type: 'listing' } }, auth: 'Sign in to publish a property listing.' },
  { icon: 'key-outline', title: 'A room in my home', sub: 'Find a housemate', href: { pathname: '/create-post', params: { type: 'shared_space' } }, auth: 'Sign in to list a room.' },
  { icon: 'document-text-outline', title: 'News for neighbours', sub: 'Updates, closures, tips', href: { pathname: '/create-post', params: { type: 'news' } }, auth: 'Sign in to share with your neighbourhood.' },
  { icon: 'calendar-outline', title: 'An event', sub: 'Meetups, classes, markets', href: { pathname: '/create-post', params: { type: 'event' } }, auth: 'Sign in to host an event.' },
  { icon: 'camera-outline', title: 'A story', sub: 'A photo or video from today', href: { pathname: '/create-post', params: { type: 'story' } }, auth: 'Sign in to add a story.' },
  { icon: 'restaurant-outline', title: 'My restaurant', sub: 'Put your place on the map', href: { pathname: '/create-post', params: { type: 'restaurant' } }, auth: 'Sign in to add a restaurant.' },
  { icon: 'star-outline', title: 'Review a restaurant', sub: 'Pick it, rate it, done', href: { pathname: '/create-post', params: { type: 'restaurant', mode: 'review' } }, auth: 'Sign in to review a restaurant.' },
  { icon: 'trophy-outline', title: 'A quest', sub: 'A challenge for the city', href: { pathname: '/create-post', params: { type: 'challenge' } }, auth: 'Sign in to start a quest.' },
  { icon: 'help-circle-outline', title: 'A question', sub: 'Ask the people around you', href: '__ask__', auth: 'Sign in to ask your neighbours a question.' },
];

export function ComposeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tc } = useTheme();
  const { requireAuth } = useRequireAuth();
  const insets = useSafeAreaInsets();
  const open = (it: Item) => {
    onClose();
    if (!requireAuth(undefined, it.auth)) return;
    // Let the sheet start closing before the next screen opens.
    setTimeout(() => {
      if (it.href === '__ask__') router.push({ pathname: '/community', params: { ask: String(Date.now()) } } as any);
      else router.push(it.href);
    }, 180);
  };
  return (
    <DSheet visible={visible} onClose={onClose} title="Post something">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {ITEMS.map((it, i) => (
          <Reveal key={it.title} i={i}>
            <PressableScale onPress={() => open(it)} style={[s.row, { backgroundColor: tc.inputBg }]} accessibilityRole="button" accessibilityLabel={it.title}>
              <GradientFill style={s.icon}><Ionicons name={it.icon} size={21} color="#fff" /></GradientFill>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.bodyStrong, { color: tc.textPrimary }]}>{it.title}</Text>
                <Text style={[TYPE.small, { color: tc.textSecondary }]}>{it.sub}</Text>
              </View>
            </PressableScale>
          </Reveal>
        ))}
      </ScrollView>
    </DSheet>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, marginBottom: 8 },
  icon: { width: 42, height: 42, borderRadius: RADIUS.input, alignItems: 'center', justifyContent: 'center' },
});
