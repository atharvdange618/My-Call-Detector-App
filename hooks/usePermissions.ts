import { useState, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export type PermissionStatus = 'pending' | 'granted' | 'denied';
export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatus>('pending');

  const request = useCallback(async (): Promise<boolean> => {
    const perms = [
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
    ];
    if (Platform.Version >= 33) {
      perms.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    try {
      const result = await PermissionsAndroid.requestMultiple(perms);
      const denied = Object.entries(result)
        .filter(([_, v]) => v !== PermissionsAndroid.RESULTS.GRANTED)
        .map(([k]) => k);
      if (denied.length === 0) {
        setStatus('granted');
        return true;
      }
      setStatus('denied');
      console.warn('Missing permissions:', denied);
      return false;
    } catch (err) {
      setStatus('denied');
      console.error('Permission request error:', err);
      return false;
    }
  }, []);

  return { status, request };
}
