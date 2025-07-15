import { AppRegistry } from 'react-native';
import App, { CALL_HISTORY_STORAGE_KEY } from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openWhatsApp } from './utils/OpenWhatsApp';
import { CHANNEL_ID } from './utils/Notification';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (!notification || !pressAction) return;

  const callDataString = notification.data?.callData;

  if (!callDataString) {
    return;
  }
  const call = JSON.parse(callDataString);

  switch (type) {
    case EventType.ACTION_PRESS:
      switch (pressAction.id) {
        case 'no_client':
          await notifee.cancelNotification(notification.id);
          console.log(
            `Headless Task: User chose NO for client: ${call.number}`,
          );
          break;

        case 'yes_send_message':
          const history = JSON.parse(
            (await AsyncStorage.getItem(CALL_HISTORY_STORAGE_KEY)) || '[]',
          );
          history.unshift({ ...call });
          await AsyncStorage.setItem(
            CALL_HISTORY_STORAGE_KEY,
            JSON.stringify(history),
          );
          await openWhatsApp(
            call.number,
            'Hello! We recently had a call. How can I help you today?',
          );
          await notifee.cancelNotification(notification.id);
          break;
      }
      return Promise.resolve();
    case EventType.PRESS:
      return Promise.resolve();
    default:
      return Promise.resolve();
  }
});

AppRegistry.registerComponent(appName, () => App);
