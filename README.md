# My Call Detector App

This is a React Native application for Android that demonstrates how to monitor and display the device's call history. It uses a native Android module to access the call log and a foreground service to monitor for new calls, even when the app is in the background.

## Features

- **Real-time Call Monitoring**: The app can monitor the device's call log in real-time.
- **Background Operation**: Thanks to an Android foreground service, the app can continue to monitor calls even when it's not in the foreground.
- **Call History Display**: The app displays a list of detected calls, including the type of call (incoming, outgoing, missed), the phone number, the duration, and the timestamp.
- **Permissions Handling**: The app properly requests the necessary permissions from the user before accessing the call log.
- **State Persistence**: The call history is saved to the device's local storage and is restored when the app is reopened.

## How It Works

The application is composed of two main parts: a React Native front-end and a native Android back-end.

### React Native Front-end

- **`App.tsx`**: This is the main component of the application. It's responsible for rendering the UI, managing the application's state, and handling user interactions.
- **`useCallLogMonitor.ts`**: This custom React hook encapsulates the logic for interacting with the native module. It subscribes to call updates from the native side and provides a clean interface for the `App` component.
- **`CallLogModule.ts`**: This file defines the JavaScript interface for the native module. It exposes the `startMonitoring` and `stopMonitoring` methods to the React Native code.
- **`Permissions.ts`**: This utility file handles the process of requesting the necessary Android permissions from the user.
- **`CallLogAnalyzer.ts`**: This utility file processes the raw call log data received from the native module and transforms it into a more structured and usable format.

### Native Android Back-end

- **`CallLogModule.kt`**: This is the native module that's exposed to the React Native front-end. It's responsible for starting and stopping the `CallLogMonitorService` and for sending call log data to the React Native side via a `BroadcastReceiver`.
- **`CallLogMonitorService.kt`**: This is an Android foreground service that runs in the background and periodically checks the call log for new entries. When a new call is detected, it sends a broadcast intent with the call details.
- **`CallLogHelper.kt`**: This is a helper class that provides a simple interface for querying the Android call log.
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
