/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const openWhatsAppHeadless = async (number, templateMessage) => {
  const url = `whatsapp://send?phone=${number}&text=${encodeURIComponent(
    templateMessage,
  )}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log(
        'WhatsApp is not installed. Opening web link from headless task.',
      );
      await Linking.openURL(
        `https://wa.me/${number}?text=${encodeURIComponent(templateMessage)}`,
      );
    }
  } catch (error) {
    console.error(
      'An error occurred while trying to open WhatsApp in headless task:',
      error,
    );
  }
};

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (!notification || !pressAction) return;

  const callDataString = notification.data?.callData;
  const notificationStage = notification.data?.notificationStage;
  const CALL_HISTORY_STORAGE_KEY = '@CallDetectorApp:callHistory';
  const CHANNEL_ID = 'call_monitor_channel';

  if (!callDataString) {
    console.warn(
      'No callData found in background notification payload (headless).',
    );
    return;
  }
  const call = JSON.parse(callDataString);

  switch (type) {
    case EventType.ACTION_PRESS:
      console.log(
        `Headless Task: Action pressed: ${pressAction.id} on notification ${notification.id}`,
      );
      switch (pressAction.id) {
        case 'yes_client':
          const history = JSON.parse(
            (await AsyncStorage.getItem(CALL_HISTORY_STORAGE_KEY)) || '[]',
          );
          history.unshift({ ...call });
          await AsyncStorage.setItem(
            CALL_HISTORY_STORAGE_KEY,
            JSON.stringify(history),
          );

          await notifee.cancelNotification(notification.id);
          await notifee.displayNotification({
            id: `message_prompt_${call.timestamp}`,
            title: '💬 Send Template Message?',
            body: `Do you want to send a template message to ${call.number}?`,
            data: {
              callData: JSON.stringify(call),
              notificationStage: 'messagePrompt',
            },
            android: {
              channelId: CHANNEL_ID,
              autoCancel: false,
              pressAction: {
                id: 'default',
                launchActivity: 'default',
              },
              actions: [
                {
                  title: '✅ Yes, Send',
                  pressAction: {
                    id: 'yes_send_message',
                  },
                },
                {
                  title: '❌ No',
                  pressAction: {
                    id: 'no_send_message',
                  },
                },
              ],
            },
          });
          break;

        case 'no_client':
          await notifee.cancelNotification(notification.id);
          console.log(
            `Headless Task: User chose NO for client: ${call.number}`,
          );
          break;

        case 'yes_send_message':
          await openWhatsAppHeadless(
            call.number,
            'Hello! We recently had a call. How can I help you today?',
          );
          await notifee.cancelNotification(notification.id);
          break;

        case 'no_send_message':
          await notifee.cancelNotification(notification.id);
          console.log(
            `Headless Task: User chose NO for message: ${call.number}`,
          );
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
