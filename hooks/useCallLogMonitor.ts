import { useCallback, useEffect, useRef } from 'react';
import { analyzeCallLogEntry } from '../utils/CallLogAnalyzer';
import { subscribeToCallUpdates } from '../CallLogModule';
import { CallLogEntry } from './types';

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

  const processCallLogEntry = useCallback(
    (entry: CallLogEntry) => {
      if (
        typeof entry.number !== 'string' ||
        typeof entry.type !== 'number' ||
        typeof entry.duration !== 'number' ||
        typeof entry.timestamp !== 'number'
      ) {
        console.warn('Malformed call log entry from native:', entry);
        return;
      }
      console.log('Received raw event from native module:', entry);
      try {
        const newCallData = {
          number: entry.number,
          type: entry.type,
          duration: entry.duration,
          timestamp: entry.timestamp,
        };

        if (
          previousLogs.current.some(
            log =>
              log.timestamp === newCallData.timestamp &&
              log.number === newCallData.number,
          )
        ) {
          console.log('Duplicate call entry ignored:', newCallData);
          return;
        }

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
    },
    [onCallDetected],
  );

  useEffect(() => {
    console.log('useCallLogMonitor useEffect: Subscribing to call updates...');
    // Subscribe to call updates from the native module.
    // The 'event' object directly contains the data sent from the native service via putExtra.
    const unsubscribe = subscribeToCallUpdates(entry => {
      processCallLogEntry(entry);
    });

    return () => {
      console.log(
        'useCallLogMonitor cleanup: Unsubscribing from call updates.',
      );
      unsubscribe();
    };
  }, [onCallDetected, processCallLogEntry]);
}
