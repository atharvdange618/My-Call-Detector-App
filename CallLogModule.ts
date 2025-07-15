import { NativeModules, NativeEventEmitter } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import { CallLogEntry } from './hooks/types';

const { CallLogModule } = NativeModules;

export const startMonitoring = () => CallLogModule.startMonitoring();
export const stopMonitoring = () => CallLogModule.stopMonitoring();

const emitter = new NativeEventEmitter(CallLogModule);

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
