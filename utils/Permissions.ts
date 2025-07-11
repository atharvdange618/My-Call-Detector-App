import { PermissionsAndroid, Platform } from 'react-native';

export async function requestAllPermissions(): Promise<boolean> {
  const permissionsToRequest = [
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
  ];

  if (Platform.Version >= 33) {
    permissionsToRequest.push(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }

  console.log('Requesting permissions:', permissionsToRequest);
  const grantedResults = await PermissionsAndroid.requestMultiple(
    permissionsToRequest,
  );

  const allGranted = permissionsToRequest.every(permission => {
    const isGranted =
      grantedResults[permission] === PermissionsAndroid.RESULTS.GRANTED;
    console.log(
      `Permission ${permission}: ${grantedResults[permission]} (Granted: ${isGranted})`,
    );
    return isGranted;
  });

  console.log('All required permissions granted:', allGranted);
  return allGranted;
}
