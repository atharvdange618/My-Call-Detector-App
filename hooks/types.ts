export type CallLogEntry = {
  number: string;
  type: number;
  duration: number;
  date: number;
};

export type AnalyzedCall = {
  type: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'unknown';
  number: string;
  duration: number;
  timestamp: number;
};
