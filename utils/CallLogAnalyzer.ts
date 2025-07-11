export type CallLogEntry = {
  number: string;
  type: number;
  date: number;
  duration: number;
};

export type AnalyzedCall = {
  type: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'unknown';
  number: string;
  duration: number;
  timestamp: number;
};

export function analyzeCallLogEntry(entry: CallLogEntry): AnalyzedCall {
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
    timestamp: entry.date,
  };
}
