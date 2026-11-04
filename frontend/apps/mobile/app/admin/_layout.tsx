// app/admin/_layout.tsx — thin wrapper, all logic lives in apps/mobile/admin/
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAdminGuard } from '@features/admin/hooks/useAdminGuard';
import { useTheme } from '@theme/useTheme';

export default function AdminLayout() {
  const { isAdmin } = useAdminGuard();
  const { tc } = useTheme();

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: tc.pageBg },
    }}>
      <Stack.Screen name="index"         options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="users"         options={{ title: 'User Management' }} />
      <Stack.Screen name="listings"      options={{ title: 'Listing Management' }} />
      <Stack.Screen name="reports"       options={{ title: 'Reports' }} />
      <Stack.Screen name="analytics"     options={{ title: 'Analytics' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="polls"         options={{ title: 'Community Polls' }} />
      <Stack.Screen name="verifications" options={{ title: 'Badge Verifications' }} />
      <Stack.Screen name="trending"      options={{ title: 'Trending Posts' }} />
      <Stack.Screen name="posts"         options={{ title: 'All Posts' }} />
      <Stack.Screen name="area"          options={{ title: 'Area Management' }} />
      <Stack.Screen name="feed"          options={{ title: 'Feed Management' }} />
      <Stack.Screen name="food"          options={{ title: 'Food Management' }} />
      <Stack.Screen name="community"     options={{ title: 'Community Management' }} />
      <Stack.Screen name="roommates"     options={{ title: 'Roommates' }} />
      <Stack.Screen name="auth"          options={{ title: 'Auth Sessions' }} />
      <Stack.Screen name="support"       options={{ title: 'Support Requests' }} />
      <Stack.Screen name="user-safety/[id]" options={{ title: 'User Safety Case File' }} />
      <Stack.Screen name="audit-log"        options={{ title: 'Audit Log' }} />
      <Stack.Screen name="privacy"          options={{ title: 'Data Privacy' }} />
      <Stack.Screen name="chat-moderation"  options={{ title: 'Chat Moderation' }} />
      <Stack.Screen name="stories"          options={{ title: 'Stories Moderation' }} />
    </Stack>
  );
}
