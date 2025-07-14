import { useEffect, useRef } from 'react';
import { analyzeCallLogEntry } from '../utils/CallLogAnalyzer';
import { subscribeToCallUpdates } from '../CallLogModule';

/**
 * Custom hook to monitor call logs using the native Android service.
 * This hook is now solely responsible for managing the JavaScript side
 * of event subscription and unsubscription. The native service lifecycle
 * (start/stop) is managed by the parent component (App.tsx).
 * @param {object} props - The hook properties.
 * @param {function(AnalyzedCall): void} props.onCallDetected - Callback function when a new call is detected.
 */
export function useCallLogMonitor({ onCallDetected }: any) {
  const previousLogs = useRef<CallLogEntry[]>([]);

  useEffect(() => {
    console.log('useCallLogMonitor useEffect: Subscribing to call updates...');
    // Subscribe to call updates from the native module.
    // The 'event' object directly contains the data sent from the native service via putExtra.
    const unsubscribe = subscribeToCallUpdates(event => {
      try {
        const newCallData = {
          number: event.number,
          type: event.type,
          duration: event.duration,
          date: event.timestamp,
        };

        const analyzedResult = analyzeCallLogEntry(newCallData);

        if (analyzedResult) {
          onCallDetected(analyzedResult);
          previousLogs.current = [...previousLogs.current, newCallData];
        }
      } catch (err) {
        console.warn(
          'Failed to process call log update from native module:',
          err,
        );
      }
    });

    return () => {
      console.log(
        'useCallLogMonitor cleanup: Unsubscribing from call updates.',
      );
      unsubscribe();
    };
  }, [onCallDetected]);
}

/**
 * Type definition for a raw call log entry from the native module.
 */
export type CallLogEntry = {
  number: string;
  type: number;
  date: number;
  duration: number;
};

/**
 * Type definition for an analyzed call event.
 */
export type AnalyzedCall = {
  type: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'unknown';
  number: string;
  duration: number;
  timestamp: number;
};
