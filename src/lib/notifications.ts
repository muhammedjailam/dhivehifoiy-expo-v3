import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { openLink } from './nav';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7E57C2',
    });
  }

  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
}

export async function initializeNotifications(): Promise<boolean> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await api.post('/customers/device', { token: token.data, platform: token.type });
      return true;
    }
  } catch (e) {
    console.warn('Push registration failed', e);
  }
  return false;
}

/** Each tapped notification is acted on once, whether it arrives via the listener or the launch check. */
const handled = new Set<string>();
const claim = (response: Notifications.NotificationResponse) => {
  const id = response.notification.request.identifier;
  if (handled.has(id)) return false;
  handled.add(id);
  return true;
};

/** Taps on notifications deep-link inside the app (same rules as v2). */
export function setupNotificationResponder() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (!claim(response)) return;
    const url = response.notification.request.content.data?.url as string | undefined;
    if (url) openLink(url);
  });
  return () => sub.remove();
}

export async function consumeLaunchNotificationUrl(): Promise<string | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response || !claim(response)) return null;
    const url = response.notification.request.content.data?.url;
    await Notifications.clearLastNotificationResponseAsync?.();
    return typeof url === 'string' && url ? url : null;
  } catch {}
  return null;
}
