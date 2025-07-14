import { NativeModules, NativeEventEmitter } from 'react-native';
import { CallLogEntry } from './hooks/types';

const { CallLogModule } = NativeModules;

export const startMonitoring = () => CallLogModule.startMonitoring();
export const stopMonitoring = () => CallLogModule.stopMonitoring();

export const subscribeToCallUpdates = (
  callback: (data: CallLogEntry) => void,
) => {
  const emitter = new NativeEventEmitter(CallLogModule);
  const listener = emitter.addListener('CallLogUpdated', callback);
  return () => listener.remove();
};
