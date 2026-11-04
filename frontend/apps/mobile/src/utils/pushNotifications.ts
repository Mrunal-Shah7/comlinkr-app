import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Expo Go does not support remote push notifications on SDK 53+.
  // Keep this flow as a no-op so normal app usage continues in Expo Go.
  if (Constants.appOwnership === 'expo') {
    console.warn('Push notifications are disabled in Expo Go. Use a development build.');
    return null;
  }

  // Simulators/emulators cannot receive push notifications.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    console.warn('Push notifications require a physical device.');
    return null;
  }

  const Notifications = await import('expo-notifications');

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
