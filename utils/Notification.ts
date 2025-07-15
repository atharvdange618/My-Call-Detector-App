import { AnalyzedCall } from '../hooks/types';
import notifee, {
  AndroidCategory,
  AndroidImportance,
} from '@notifee/react-native';

export const CHANNEL_ID = 'call_monitor_channel';

/**
 * Creates the notification channel for the call monitor notifications.
 * The channel is configured with:
 * - ID: 'call_monitor_channel'
 * - Name: 'Call Monitor Notifications'
 * - Importance: AndroidImportance.HIGH
 * - Sound: 'default'
 * - Vibration: true
 * - Category: AndroidCategory.CALL
 * @returns Promise that resolves when the notification channel is created.
 */
export async function createNotificationChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Call Monitor Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    category: AndroidCategory.CALL,
  });
}

// Function to display the "Client Check" notification

/**
 * Displays a notification to ask the user if the person at the given phone number is a client.
 * The notification has two actions: "Yes, Send" and "No". When the user presses "Yes, Send",
 * the notification with ID "message_prompt_<timestamp>" is displayed. When the user presses
 * "No", the notification is cancelled.
 * @param call The analyzed call to display the notification for.
 * @returns The ID of the notification that was displayed.
 */
export async function displayClientCheckNotification(call: AnalyzedCall) {
  const notificationId = `client_check_${call.timestamp}`;
  await notifee.displayNotification({
    id: notificationId,
    title: '📞 Recent Call Processed',
    body: `Was the person at ${call.number} a client? Do you want to send a template message to them?`,
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
            id: 'no_client',
          },
        },
      ],
    },
  });
  return notificationId;
}

// // Function to display the "Send Message" notification
// export async function displayMessagePromptNotification(call: AnalyzedCall) {
//   const notificationId = `message_prompt_${call.timestamp}`;
//   await notifee.displayNotification({
//     id: notificationId,
//     title: '💬 Send Template Message?',
//     body: `Do you want to send a template message to ${call.number}?`,
//     data: {
//       callData: JSON.stringify(call),
//       notificationStage: 'messagePrompt',
//     },
//     android: {
//       channelId: CHANNEL_ID,
//       autoCancel: false,
//       pressAction: {
//         id: 'default',
//         launchActivity: 'default',
//       },
//       actions: [
//         {
//           title: '✅ Yes, Send',
//           pressAction: {
//             id: 'yes_send_message',
//           },
//         },
//         {
//           title: '❌ No',
//           pressAction: {
//             id: 'no_send_message',
//           },
//         },
//       ],
//     },
//   });
//   return notificationId;
// }
