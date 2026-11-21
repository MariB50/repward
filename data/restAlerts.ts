import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const channelId = 'rest-timer';
const identifier = 'repward-rest';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function allowRestAlerts() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Rest timer',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  return existing.granted || (await Notifications.requestPermissionsAsync()).granted;
}

export async function updateRestAlert(until: number | null) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
  if (until && until > Date.now()) {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: 'Rest complete', body: 'Ready for your next set?', sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(until),
        channelId,
      },
    });
  }
}
