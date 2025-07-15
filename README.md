# My Call Detector App

This is a React Native application for Android that demonstrates how to monitor and display the device's call history. It uses a native Android module to access the call log and a foreground service to monitor for new calls, even when the app is in the background.

## Features

- **Real-time Call Monitoring**: Monitors the device's call log in real-time using a foreground service, ensuring operation even when the app is in the background.
- **Instant Notifications**: Displays a notification immediately after a call ends, prompting the user to check if the caller is a potential client.
- **One-Tap WhatsApp Messaging**: Allows users to open a WhatsApp chat with the caller directly from the notification with a single tap.
- **Call History Display**: Shows a clear and detailed list of all detected calls, including type (incoming, outgoing, missed), phone number, duration, and timestamp.
- **Permissions Handling**: Gracefully requests all necessary permissions (`READ_CALL_LOG`, `POST_NOTIFICATIONS`, etc.) on startup.
- **State Persistence**: Saves the call history to local storage, so no data is lost between app sessions.

## How It Works

The application is composed of two main parts: a React Native front-end and a native Android back-end.

### React Native Front-end

- **`App.tsx`**: The main component responsible for rendering the UI, managing state, and orchestrating user interactions. It utilizes custom hooks and utility modules to handle core functionalities.
- **`hooks/useCallLogMonitor.ts`**: A custom React hook that encapsulates the logic for interacting with the native `CallLogModule`, subscribing to call updates, and managing the call log state.
- **`hooks/usePermissions.ts`**: A custom hook that handles the process of requesting necessary Android permissions from the user, ensuring the app has the required access to function correctly.
- **`CallLogModule.ts`**: Defines the JavaScript interface for the native module, exposing methods like `startMonitoring` and `stopMonitoring` to the React Native environment.
- **`utils/CallLogAnalyzer.ts`**: A utility module that processes raw call log data from the native module, transforming it into a structured and usable format for the application.
- **`utils/Notification.ts`**: This utility handles the creation and display of local notifications, providing immediate feedback to the user after a call is detected.
- **`utils/OpenWhatsApp.ts`**: This utility provides a simple function to open WhatsApp with a pre-filled message, allowing users to quickly contact numbers from the call log.

### Native Android Back-end

- **`CallLogModule.kt`**: This is the native module that's exposed to the React Native front-end. It's responsible for starting and stopping the `CallLogMonitorService` and for sending call log data to the React Native side via a `BroadcastReceiver`.
- **`CallLogMonitorService.kt`**: This is an Android foreground service that runs in the background and periodically checks the call log for new entries. When a new call is detected, it sends a broadcast intent with the call details.
- **`CallLogHelper.kt`**: This is a helper class that. It provides a simple interface for querying the Android call log.
- **`BootReceiver.kt`**: This `BroadcastReceiver` is responsible for starting the `CallLogMonitorService` when the device boots up.

## Getting Started

### Prerequisites

- Node.js
- React Native CLI
- Android Studio

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/atharvdange618/My-Call-Detector-App.git
   ```

2. Install the dependencies:

   ```bash
   cd My-Call-Detector-App
   npm install
   ```

3. Run the app on an Android emulator or a physical device:

   ```bash
   npx react-native run-android
   ```

## Permissions

The app requires the following permissions to function correctly:

- `INTERNET`: Standard access for React Native apps.
- `READ_CALL_LOG`: To read the device's call log.
- `READ_PHONE_STATE`: To detect incoming calls.
- `READ_PHONE_NUMBERS`: To access phone numbers associated with calls.
- `FOREGROUND_SERVICE`: To run the call monitoring service in the background.
- `FOREGROUND_SERVICE_PHONE_CALL`: Specific foreground service type for phone calls (API 34+).
- `POST_NOTIFICATIONS`: To display a notification when the app is running in the background (required for Android 13 and above).

The app will request these permissions from the user when it's first launched.
