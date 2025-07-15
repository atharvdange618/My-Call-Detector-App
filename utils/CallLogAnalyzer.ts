import { AnalyzedCall, CallLogEntry } from '../hooks/types';

/**
 * Analyzes a call log entry and returns a structured representation.
 * Determines the type of call based on the entry type and duration.
 *
 * @param {CallLogEntry} entry - The raw call log entry data.
 * @returns {AnalyzedCall | null} An object containing the analyzed call data,
 * including type, number, duration, and timestamp, or null if analysis fails.
 */
export function analyzeCallLogEntry(entry: CallLogEntry): AnalyzedCall | null {
  let type: AnalyzedCall['type'] = 'unknown';

  switch (entry.type) {
    case 1:
      type = entry.duration > 0 ? 'incoming' : 'missed';
      break;
    case 2:
      type = 'outgoing';
      break;
    case 3:
      type = 'missed';
      break;
    case 5:
      type = 'rejected';
      break;
    default:
      type = 'unknown';
  }

  return {
    type,
    number: entry.number,
    duration: entry.duration,
    timestamp: entry.timestamp,
  };
}
