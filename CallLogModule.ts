import { NativeModules, NativeEventEmitter } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import { CallLogEntry } from './hooks/types';

const { CallLogModule } = NativeModules;

export const startMonitoring = () => CallLogModule.startMonitoring();
export const stopMonitoring = () => CallLogModule.stopMonitoring();

const emitter = new NativeEventEmitter(CallLogModule);

/**
 * Subscribes to call log updates from the native module. This function sets up an event listener
 * that listens for 'CallLogUpdated' events emitted by the native module. When a new call log entry
 * is detected, the provided callback function is invoked with the call log data.
 *
 * @param {function(CallLogEntry): void} callback - The function to be called when a new call log
 * update is received. It receives a CallLogEntry object as an argument.
 * @returns {function(): void} A function that can be called to unsubscribe from call log updates
 * and remove the event listener.
 */

export const subscribeToCallUpdates = (
  callback: (data: CallLogEntry) => void,
): (() => void) => {
  CallLogModule.addListener('CallLogUpdated');

  const listener: EmitterSubscription = emitter.addListener(
    'CallLogUpdated',
    callback,
  );

  return () => {
    listener.remove();
    CallLogModule.removeListeners(1);
  };
};
