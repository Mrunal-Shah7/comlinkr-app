// app/index.tsx

import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useAuthStore } from '../src/store/auth.store';

export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthed  = useAuthStore((s) => s.isAuthed);
  const user      = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Image
          source={require('../assets/images/brand/logo.jpg')}
          style={{ width: 160, height: 160, marginBottom: 32 }}
          contentFit="contain"
          transition={200}
        />
        <ActivityIndicator size="large" color="#0076EB" />
      </View>
    );
  }

  if (isAuthed && !user?.onboardingDone) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)/feed" />;
}
