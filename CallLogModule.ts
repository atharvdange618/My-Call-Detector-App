import { NativeModules, NativeEventEmitter } from 'react-native';

const { CallLogModule } = NativeModules;

export const startMonitoring = () => CallLogModule.startMonitoring();
export const stopMonitoring = () => CallLogModule.stopMonitoring();

export const subscribeToCallUpdates = (callback: (data: any) => void) => {
  const emitter = new NativeEventEmitter(CallLogModule);
  const listener = emitter.addListener('CallLogUpdated', callback);
  return () => listener.remove();
};
