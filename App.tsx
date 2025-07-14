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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallLogMonitor } from './hooks/useCallLogMonitor';
import { requestAllPermissions } from './utils/Permissions';
import { startMonitoring, stopMonitoring } from './CallLogModule';
import { CallPopup, Stage } from './components/CallPopup';
import { AnalyzedCall } from './hooks/types';

const CALL_HISTORY_STORAGE_KEY = '@CallDetectorApp:callHistory';

// Enhanced types for better type safety
interface CompleteAppState {
  callHistory: AnalyzedCall[];
  permissionStatus: string;
  isMonitoring: boolean;
  isLoadingHistory: boolean;
  popupVisible: boolean;
  popupStage: Stage;
  currentCall: AnalyzedCall | null;
}

type PermissionStatusType = 'granted' | 'denied' | 'checking' | 'error';

interface PermissionState {
  status: PermissionStatusType;
  message: string;
}

export default function App() {
  // Consolidated state management
  const [appState, setAppState] = useState<CompleteAppState>({
    callHistory: [],
    permissionStatus: 'Checking permissions...',
    isMonitoring: false,
    isLoadingHistory: true,
    popupVisible: false,
    popupStage: 'clientCheck',
    currentCall: null,
  });

  // Separate permission state for better control
  const [permissionState, setPermissionState] = useState<PermissionState>({
    status: 'checking',
    message: 'Checking permissions...',
  });

  // Refs for cleanup and app state monitoring
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isInitializedRef = useRef(false);

  // Memoized values to prevent unnecessary re-renders
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

  // Optimized state update functions
  const updateAppState = useCallback((updates: Partial<CompleteAppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePermissionState = useCallback(
    (updates: Partial<PermissionState>) => {
      setPermissionState(prev => ({ ...prev, ...updates }));
    },
    [],
  );

  // Optimized call history operations
  const addCallToHistory = useCallback((call: AnalyzedCall) => {
    setAppState(prev => {
      // Check if a call with the same timestamp and number already exists
      const isDuplicate = prev.callHistory.some(
        existingCall =>
          existingCall.timestamp === call.timestamp &&
          existingCall.number === call.number,
      );

      if (isDuplicate) {
        console.log('Duplicate call detected, not adding to history:', call);
        return prev; // Return previous state if duplicate
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

  // Load call history with better error handling
  const loadCallHistory = useCallback(async () => {
    try {
      updateAppState({ isLoadingHistory: true });
      const storedHistory = await AsyncStorage.getItem(
        CALL_HISTORY_STORAGE_KEY,
      );

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        // Validate the parsed data
        if (Array.isArray(parsedHistory)) {
          updateAppState({ callHistory: parsedHistory });
        } else {
          console.warn('Invalid call history format in AsyncStorage');
        }
      }
    } catch (error) {
      console.error('Failed to load call history from AsyncStorage:', error);
      Alert.alert('Error', 'Failed to load call history. Starting fresh.');
    } finally {
      updateAppState({ isLoadingHistory: false });
    }
  }, [updateAppState]);

  // Save call history with debouncing
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

  // Debounced save effect
  useEffect(() => {
    if (!appState.isLoadingHistory && appState.callHistory.length >= 0) {
      const timeoutId = setTimeout(() => {
        saveCallHistory(appState.callHistory);
      }, 500); // Debounce saves by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [appState.callHistory, appState.isLoadingHistory, saveCallHistory]);

  // Permission management with better error handling
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      updatePermissionState({
        status: 'checking',
        message: 'Requesting permissions...',
      });

      const granted = await requestAllPermissions();

      if (granted) {
        updatePermissionState({
          status: 'granted',
          message: 'Permissions granted. Ready to monitor calls.',
        });
        return true;
      } else {
        updatePermissionState({
          status: 'denied',
          message: 'Permission denied. App needs call log access.',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      updatePermissionState({
        status: 'error',
        message: 'Error requesting permissions. Please try again.',
      });
      return false;
    }
  }, [updatePermissionState]);

  // Monitoring controls with better error handling
  const handleStartMonitoring = useCallback(async () => {
    try {
      updateAppState({ isMonitoring: true });

      const granted = await requestPermissions();
      if (granted) {
        startMonitoring();
        Alert.alert('Monitoring Started', 'Call log monitoring has begun.');
      } else {
        updateAppState({ isMonitoring: false });
        Alert.alert(
          'Permission Denied',
          'Cannot start monitoring without necessary permissions.',
        );
      }
    } catch (error) {
      console.error('Error during start monitoring:', error);
      updateAppState({ isMonitoring: false });
      updatePermissionState({
        status: 'error',
        message: 'Error starting monitoring.',
      });
      Alert.alert('Error', 'Failed to start monitoring. Please try again.');
    }
  }, [updateAppState, requestPermissions, updatePermissionState]);

  const handleStopMonitoring = useCallback(() => {
    try {
      stopMonitoring();
      updateAppState({ isMonitoring: false });
      updatePermissionState({
        status: 'granted',
        message: 'Monitoring stopped.',
      });
      Alert.alert('Monitoring Stopped', 'Call log monitoring has been paused.');
    } catch (error) {
      console.error('Error during stop monitoring:', error);
      Alert.alert('Error', 'Failed to stop monitoring. Check logs.');
    }
  }, [updateAppState, updatePermissionState]);

  // Clear history with confirmation
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
              console.error('Failed to clear call history:', error);
              Alert.alert('Error', 'Failed to clear history.');
            }
          },
        },
      ],
    );
  }, [clearCallHistory]);

  // App state change handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground
        console.log('App has come to foreground');
        // Could refresh permissions or restart monitoring if needed
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, []);

  // Initial app setup
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      loadCallHistory();
    }
  }, [loadCallHistory]);

  // Auto-start monitoring on app launch if permissions are granted
  useEffect(() => {
    const initializeApp = async () => {
      if (isInitializedRef.current && !appState.isLoadingHistory) {
        const granted = await requestPermissions();
        if (granted) {
          updateAppState({ isMonitoring: true });
          startMonitoring();
        }
      }
    };

    initializeApp();
  }, [appState.isLoadingHistory, requestPermissions, updateAppState]);

  // Cleanup on unmount
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

  // Call detection handling
  useCallLogMonitor({
    onCallDetected: useCallback(
      (event: AnalyzedCall) => {
        console.log('📞 Detected new call event:', event);
        updateAppState({
          currentCall: event,
          popupStage: 'clientCheck',
          popupVisible: true,
        });
      },
      [updateAppState],
    ),
  });

  // Popup handling
  const handlePopupYes = useCallback(() => {
    if (!appState.currentCall) {
      console.warn('handlePopupYes called but no currentCall found.');
      return;
    }

    if (appState.popupStage === 'clientCheck') {
      // User confirmed client, add to history and proceed to message prompt
      addCallToHistory(appState.currentCall);
      console.log(
        `✅ User chose YES (client check), call stored: ${appState.currentCall.number}`,
      );
      updateAppState({ popupStage: 'messagePrompt' });
    } else if (appState.popupStage === 'messagePrompt') {
      // User confirmed sending message, dismiss popup (WhatsApp handled by CallPopup)
      console.log(
        `✅ User chose YES (message prompt), dismissing popup for: ${appState.currentCall.number}`,
      );
      updateAppState({
        popupVisible: false,
        currentCall: null,
        popupStage: 'clientCheck',
      });
    }
  }, [
    appState.currentCall,
    appState.popupStage,
    addCallToHistory,
    updateAppState,
  ]);

  const handlePopupNo = useCallback(() => {
    // On NO, simply dismiss the popup and do NOT store the call
    console.log('User chose NO, call will NOT be stored.');
    updateAppState({
      popupVisible: false,
      currentCall: null,
      popupStage: 'clientCheck',
    });
  }, [updateAppState]);

  // Utility functions
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
      case 'dialed': // Added 'dialed' as it's common for outgoing
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

      {appState.currentCall && (
        <CallPopup
          visible={appState.popupVisible}
          stage={appState.popupStage}
          number={appState.currentCall.number}
          onYes={handlePopupYes}
          onNo={handlePopupNo}
          templateMessage="Hello! We recently had a call. How can I help you today?"
        />
      )}
    </SafeAreaView>
  );
}

// Styles remain the same as in original code
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
