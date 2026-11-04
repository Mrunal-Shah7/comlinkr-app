import * as Linking from 'expo-linking';

export const getInitialURL = async () => {
  const url = await Linking.getInitialURL();
  return url;
};

export const subscribeToLinks = (callback: (url: string) => void) => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    callback(url);
  });

  return () => subscription.remove();
};
