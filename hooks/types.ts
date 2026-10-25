export type CallLogEntry = {
  number: string;
  type: number;
  duration: number;
  timestamp: number;
  name: string | null;
  photoUri: string | null;
};

export type AnalyzedCall = {
  type: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'unknown';
  number: string;
  duration: number;
  timestamp: number;
  // Optional because history saved before contact lookup has neither field.
  name?: string | null;
  photoUri?: string | null;
};
