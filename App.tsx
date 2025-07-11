import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallLogMonitor, AnalyzedCall } from './hooks/useCallLogMonitor';
import { requestAllPermissions } from './utils/Permissions';
import { startMonitoring, stopMonitoring } from './CallLogModule';

const CALL_HISTORY_STORAGE_KEY = '@CallDetectorApp:callHistory';

export default function App() {
  const [callHistory, setCallHistory] = useState<AnalyzedCall[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<string>(
    'Checking permissions...',
  );
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  ``;
  // --- AsyncStorage Operations ---

  // Load call history from AsyncStorage on component mount
  useEffect(() => {
    const loadCallHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(
          CALL_HISTORY_STORAGE_KEY,
        );
        if (storedHistory) {
          setCallHistory(JSON.parse(storedHistory));
        }
      } catch (error) {
        console.error('Failed to load call history from AsyncStorage', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadCallHistory();
  }, []);

  // Save call history to AsyncStorage whenever it changes
  useEffect(() => {
    const saveCallHistory = async () => {
      try {
        await AsyncStorage.setItem(
          CALL_HISTORY_STORAGE_KEY,
          JSON.stringify(callHistory),
        );
      } catch (error) {
        console.error('Failed to save call history to AsyncStorage', error);
      }
    };
    if (!isLoadingHistory) {
      // Only save once initial load is complete
      saveCallHistory();
    }
  }, [callHistory, isLoadingHistory]);

  // --- Permission and Monitoring Logic ---

  // Request permissions and start monitoring
  const handleStartMonitoring = useCallback(async () => {
    setIsMonitoring(true);
    try {
      const granted = await requestAllPermissions();
      if (granted) {
        setPermissionStatus('Permissions granted. Monitoring calls...');
        console.log(
          'All required permissions granted. Starting native monitoring...',
        );
        startMonitoring();
        Alert.alert('Monitoring Started', 'Call log monitoring has begun.');
      } else {
        setPermissionStatus('Permission denied. App needs call log access.');
        console.warn(
          'Permission denied',
          'App needs call log access to function.',
        );
        Alert.alert(
          'Permission Denied',
          'Cannot start monitoring without necessary permissions.',
        );
        setIsMonitoring(false);
      }
    } catch (error) {
      console.error('Error during start monitoring:', error);
      setPermissionStatus('Error starting monitoring.');
      Alert.alert('Error', 'Failed to start monitoring. Check logs.');
      setIsMonitoring(false);
    }
  }, []);

  // Stop monitoring
  const handleStopMonitoring = useCallback(() => {
    try {
      stopMonitoring();
      setIsMonitoring(false);
      setPermissionStatus('Monitoring stopped.');
      Alert.alert('Monitoring Stopped', 'Call log monitoring has been paused.');
    } catch (error) {
      console.error('Error during stop monitoring:', error);
      Alert.alert('Error', 'Failed to stop monitoring. Check logs.');
    }
  }, []);

  // Clear call history
  const handleClearHistory = useCallback(async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all call history?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              setCallHistory([]);
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
      { cancelable: true },
    );
  }, []);

  // Initialize monitoring on app start (if permissions are already granted)
  useEffect(() => {
    // Check permissions on mount and potentially start monitoring if already allowed
    const checkAndStartInitialMonitoring = async () => {
      const granted = await requestAllPermissions();
      if (granted) {
        setPermissionStatus('Permissions granted. Monitoring calls...');
        setIsMonitoring(true);
        startMonitoring();
      } else {
        setPermissionStatus('Permission denied. App needs call log access.');
      }
    };
    checkAndStartInitialMonitoring();
  }, []);

  useCallLogMonitor({
    onCallDetected: event => {
      console.log('📞 Detected new call event:', event);
      setCallHistory(prevHistory => [event, ...prevHistory]);
    },
  });

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>📱 Call Monitor</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Status: {permissionStatus}</Text>
          <Text style={styles.statusText}>
            Monitoring: {isMonitoring ? 'Active' : 'Inactive'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {!isMonitoring ? (
            <TouchableOpacity
              style={styles.button}
              onPress={handleStartMonitoring}
            >
              <Text style={styles.buttonText}>Start Monitoring</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStopMonitoring}
            >
              <Text style={styles.buttonText}>Stop Monitoring</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClearHistory}
          >
            <Text style={styles.buttonText}>Clear History</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Detected Call History:</Text>
        {isLoadingHistory ? (
          <ActivityIndicator
            size="large"
            color="#00796b"
            style={styles.loadingIndicator}
          />
        ) : (
          <ScrollView style={styles.historyScrollView}>
            {callHistory.length > 0 ? (
              callHistory.map((call, index) => (
                <View
                  key={call.timestamp.toString() + index}
                  style={styles.callCard}
                >
                  <Text style={styles.callDetail}>
                    <Text style={styles.callLabel}>Type:</Text>{' '}
                    {call.type.toUpperCase()}
                  </Text>
                  <Text style={styles.callDetail}>
                    <Text style={styles.callLabel}>Number:</Text> {call.number}
                  </Text>
                  <Text style={styles.callDetail}>
                    <Text style={styles.callLabel}>Duration:</Text>{' '}
                    {call.duration}s
                  </Text>
                  <Text style={styles.callDetail}>
                    <Text style={styles.callLabel}>Time:</Text>{' '}
                    {formatTimestamp(call.timestamp)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noCallText}>
                No call history yet. Start monitoring to see calls!
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#e0f7fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b2ebf2',
  },
  statusText: {
    fontSize: 16,
    color: '#00796b',
    textAlign: 'center',
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  clearButton: {
    backgroundColor: '#f39c12',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 10,
  },
  historyScrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  callCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  callDetail: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 3,
  },
  callLabel: {
    fontWeight: 'bold',
    color: '#34495e',
  },
  noCallText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingIndicator: {
    paddingVertical: 20,
  },
});
