import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  AppStateStatus,
  AppState,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallLogMonitor } from './hooks/useCallLogMonitor';
import { startMonitoring, stopMonitoring } from './CallLogModule';
import { AnalyzedCall } from './hooks/types';

import notifee, { EventType } from '@notifee/react-native';
import { usePermissions } from './hooks/usePermissions';
import { openWhatsApp } from './utils/OpenWhatsApp';
import {
  createNotificationChannel,
  displayClientCheckNotification,
} from './utils/Notification';

export const CALL_HISTORY_STORAGE_KEY = '@CallDetectorApp:callHistory';

interface CompleteAppState {
  callHistory: AnalyzedCall[];
  isMonitoring: boolean;
  isLoadingHistory: boolean;
}

type PermissionStatusType = 'granted' | 'denied' | 'checking' | 'error';

interface PermissionState {
  status: PermissionStatusType;
  message: string;
}

export default function App() {
  const [appState, setAppState] = useState<CompleteAppState>({
    callHistory: [],
    isMonitoring: false,
    isLoadingHistory: true,
  });

  const { status: corePermissionStatus, request: requestCorePermissions } =
    usePermissions();

  const [permissionState, setPermissionState] = useState<PermissionState>({
    status: 'checking',
    message: 'Checking permissions...',
  });

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isInitializedRef = useRef(false);

  const statusColor = useMemo(() => {
    if (
      permissionState.status === 'denied' ||
      permissionState.status === 'error'
    ) {
      return '#e74c3c';
    }
    if (appState.isMonitoring) {
      return '#27ae60';
    }
    return '#f39c12';
  }, [permissionState.status, appState.isMonitoring]);

  const callHistoryCount = useMemo(
    () => appState.callHistory.length,
    [appState.callHistory.length],
  );

  const updateAppState = useCallback((updates: Partial<CompleteAppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePermissionState = useCallback(
    (updates: Partial<PermissionState>) => {
      setPermissionState(prev => ({ ...prev, ...updates }));
    },
    [],
  );

  const addCallToHistory = useCallback((call: AnalyzedCall) => {
    setAppState(prev => {
      const isDuplicate = prev.callHistory.some(
        existingCall =>
          existingCall.timestamp === call.timestamp &&
          existingCall.number === call.number,
      );

      if (isDuplicate) {
        return prev;
      }

      return {
        ...prev,
        callHistory: [call, ...prev.callHistory],
      };
    });
  }, []);

  const clearCallHistory = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      callHistory: [],
    }));
  }, []);

  const loadCallHistory = useCallback(async () => {
    try {
      updateAppState({ isLoadingHistory: true });
      const storedHistory = await AsyncStorage.getItem(
        CALL_HISTORY_STORAGE_KEY,
      );

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          updateAppState({ callHistory: parsedHistory });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load call history. Starting fresh.');
    } finally {
      updateAppState({ isLoadingHistory: false });
    }
  }, [updateAppState]);

  const saveCallHistory = useCallback(async (history: AnalyzedCall[]) => {
    try {
      await AsyncStorage.setItem(
        CALL_HISTORY_STORAGE_KEY,
        JSON.stringify(history),
      );
    } catch (error) {
      console.error('Failed to save call history to AsyncStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (!appState.isLoadingHistory && appState.callHistory.length >= 0) {
      const timeoutId = setTimeout(() => {
        saveCallHistory(appState.callHistory);
      }, 500); // Debounce saves by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [appState.callHistory, appState.isLoadingHistory, saveCallHistory]);

  const handlePermissionRequest = useCallback(async (): Promise<boolean> => {
    updatePermissionState({
      status: 'checking',
      message: 'Requesting permissions...',
    });

    const granted = await requestCorePermissions();

    if (granted) {
      updatePermissionState({
        status: 'granted',
        message: 'Permissions granted. Ready to monitor calls.',
      });
      if (Platform.OS === 'android') {
        await createNotificationChannel();
      }
      return true;
    } else {
      updatePermissionState({
        status: 'denied',
        message: 'Required permissions denied. Please enable them in settings.',
      });
      Alert.alert(
        'Permissions Required',
        'Please grant all necessary permissions in app settings to use this feature.',
        [{ text: 'Go to Settings', onPress: () => Linking.openSettings() }],
      );
      return false;
    }
  }, [requestCorePermissions, updatePermissionState]);

  const handleStartMonitoring = useCallback(async () => {
    try {
      updateAppState({ isMonitoring: true });

      const granted = await handlePermissionRequest();
      if (granted) {
        startMonitoring();
      } else {
        updateAppState({ isMonitoring: false });
        Alert.alert(
          'Permission Denied',
          'Cannot start monitoring without necessary permissions.',
        );
      }
    } catch (error) {
      updateAppState({ isMonitoring: false });
      updatePermissionState({
        status: 'error',
        message: 'Error starting monitoring.',
      });
      Alert.alert('Error', 'Failed to start monitoring. Please try again.');
    }
  }, [updateAppState, handlePermissionRequest, updatePermissionState]);

  const handleStopMonitoring = useCallback(() => {
    try {
      stopMonitoring();
      updateAppState({ isMonitoring: false });
      Alert.alert('Monitoring Stopped', 'Call log monitoring has been paused.');
    } catch (error) {
      console.error('Error during stop monitoring:', error);
      Alert.alert('Error', 'Failed to stop monitoring. Check logs.');
    }
  }, [updateAppState]);

  const handleClearHistory = useCallback(async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all call history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              clearCallHistory();
              await AsyncStorage.removeItem(CALL_HISTORY_STORAGE_KEY);
              Alert.alert(
                'History Cleared',
                'All call history has been removed.',
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history.');
            }
          },
        },
      ],
    );
  }, [clearCallHistory]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const granted = await handlePermissionRequest();

        if (granted) {
          if (!appState.isMonitoring) {
            updateAppState({ isMonitoring: true });
            startMonitoring();
          }
        } else {
          if (appState.isMonitoring) {
            stopMonitoring();
            updateAppState({ isMonitoring: false });
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [handlePermissionRequest, appState.isMonitoring, updateAppState]);

  useEffect(() => {
    switch (corePermissionStatus) {
      case 'granted':
        updatePermissionState({
          status: 'granted',
          message: 'All permissions granted.',
        });
        break;
      case 'denied':
        updatePermissionState({
          status: 'denied',
          message: 'Required permissions denied.',
        });
        break;
      case 'pending':
      default:
        updatePermissionState({
          status: 'checking',
          message: 'Checking permissions...',
        });
        break;
    }
  }, [corePermissionStatus, updatePermissionState]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      loadCallHistory();
    }
  }, [loadCallHistory]);

  useEffect(() => {
    const initializeMonitoringOnLoad = async () => {
      if (!appState.isLoadingHistory) {
        if (corePermissionStatus === 'granted') {
          if (!appState.isMonitoring) {
            updateAppState({ isMonitoring: true });
            startMonitoring();
          }
        } else if (corePermissionStatus === 'denied') {
          if (appState.isMonitoring) {
            stopMonitoring();
            updateAppState({ isMonitoring: false });
          }
          Alert.alert(
            'Permissions Needed',
            'Please grant permissions to enable call monitoring.',
          );
        }
      }
    };
    const timeoutId = setTimeout(initializeMonitoringOnLoad, 100);
    return () => clearTimeout(timeoutId);
  }, [
    appState.isLoadingHistory,
    corePermissionStatus,
    updateAppState,
    appState.isMonitoring,
  ]);

  useEffect(() => {
    return () => {
      if (appState.isMonitoring) {
        try {
          stopMonitoring();
        } catch (error) {
          console.error('Error stopping monitoring on cleanup:', error);
        }
      }
    };
  }, [appState.isMonitoring]);

  useCallLogMonitor({
    onCallDetected: useCallback(
      async (event: AnalyzedCall) => {
        if (corePermissionStatus === 'granted') {
          await displayClientCheckNotification(event);
        } else {
          console.warn(
            'Skipping notification display: Permissions not granted.',
          );
        }
      },
      [corePermissionStatus],
    ),
  });

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;

      if (!notification || !pressAction) return;

      const callDataString = notification.data?.callData as string;

      if (!callDataString) {
        console.warn('No callData found in notification payload.');
        return;
      }
      const call: AnalyzedCall = JSON.parse(callDataString);

      switch (type) {
        case EventType.PRESS:
          await notifee.cancelNotification(notification.id);
          break;

        case EventType.ACTION_PRESS:
          switch (pressAction.id) {
            case 'no_client':
              console.log(
                `❌ User chose NO (client check), call will NOT be stored for: ${call.number}`,
              );
              await notifee.cancelNotification(notification.id);
              break;

            case 'yes_send_message':
              console.log(
                `✅ User chose YES (message prompt), opening WhatsApp for: ${call.number}`,
              );
              await addCallToHistory(call);
              await openWhatsApp(
                call.number,
                'Hello! We recently had a call. How can I help you today?',
              );
              await notifee.cancelNotification(notification.id);
              break;

            default:
              console.log(`Unknown action ID: ${pressAction.id}`);
              break;
          }
          break;
      }
    });

    return () => unsubscribe();
  }, [addCallToHistory]);

  const formatTimestamp = useCallback((timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  }, []);

  const getCallTypeIcon = useCallback((type: string) => {
    switch (type.toLowerCase()) {
      case 'incoming':
        return '📞';
      case 'outgoing':
      case 'dialed':
        return '📲';
      case 'missed':
        return '❌';
      default:
        return '📱';
    }
  }, []);

  const getCallTypeColor = useCallback((type: string) => {
    switch (type.toLowerCase()) {
      case 'incoming':
        return '#27ae60';
      case 'outgoing':
      case 'dialed':
        return '#3498db';
      case 'missed':
        return '#e74c3c';
      default:
        return '#6c757d';
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#2c3e50" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Call Monitor</Text>
        <Text style={styles.headerSubtitle}>
          Smart call tracking & management
        </Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>System Status</Text>
            <View
              style={[styles.statusIndicator, { backgroundColor: statusColor }]}
            />
          </View>

          <View style={styles.statusContent}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Permission Status</Text>
              <Text style={[styles.statusValue, { color: statusColor }]}>
                {permissionState.message}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Monitoring</Text>
              <View style={styles.monitoringBadge}>
                <View
                  style={[
                    styles.monitoringDot,
                    {
                      backgroundColor: appState.isMonitoring
                        ? '#27ae60'
                        : '#e74c3c',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.monitoringText,
                    { color: appState.isMonitoring ? '#27ae60' : '#e74c3c' },
                  ]}
                >
                  {appState.isMonitoring ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Controls</Text>

          <View style={styles.buttonContainer}>
            {!appState.isMonitoring ? (
              <TouchableOpacity
                style={[styles.primaryButton, styles.startButton]}
                onPress={handleStartMonitoring}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  ▶️ Start Monitoring
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, styles.stopButton]}
                onPress={handleStopMonitoring}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>⏹️ Stop Monitoring</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryButton]}
              onPress={handleClearHistory}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>🗑️ Clear History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Call History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Call History</Text>
            <View style={styles.historyBadge}>
              <Text style={styles.historyCount}>{callHistoryCount}</Text>
            </View>
          </View>

          {appState.isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Loading call history...</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {appState.callHistory.length > 0 ? (
                appState.callHistory.map((call, index) => (
                  <View
                    key={`${call.timestamp}-${index}`}
                    style={styles.callCard}
                  >
                    <View style={styles.callHeader}>
                      <View style={styles.callTypeContainer}>
                        <Text style={styles.callTypeIcon}>
                          {getCallTypeIcon(call.type)}
                        </Text>
                        <Text
                          style={[
                            styles.callType,
                            { color: getCallTypeColor(call.type) },
                          ]}
                        >
                          {call.type.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.callDuration}>{call.duration}s</Text>
                    </View>

                    <Text style={styles.callNumber}>{call.number}</Text>
                    <Text style={styles.callTime}>
                      {formatTimestamp(call.timestamp)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📞</Text>
                  <Text style={styles.emptyStateTitle}>No calls yet</Text>
                  <Text style={styles.emptyStateDescription}>
                    Start monitoring to see your call history appear here
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    opacity: 0.9,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusContent: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  monitoringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monitoringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monitoringText: {
    fontSize: 14,
    fontWeight: '600',
  },
  controlSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: '#27ae60',
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f39c12',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#f39c12',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  historySection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyList: {
    gap: 12,
  },
  callCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callTypeIcon: {
    fontSize: 16,
  },
  callType: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  callDuration: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  callNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  callTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});
