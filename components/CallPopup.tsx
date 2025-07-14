import React, { useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Dimensions,
  StatusBar,
  Linking,
} from 'react-native';

export type Stage = 'clientCheck' | 'messagePrompt';

interface CallPopupProps {
  visible: boolean;
  stage: Stage;
  number: string;
  onYes: () => void;
  onNo: () => void;
  templateMessage: string;
}

const { width } = Dimensions.get('window');

export const CallPopup = ({
  visible,
  stage,
  number,
  onYes,
  onNo,
  templateMessage,
}: CallPopupProps) => {
  const sendWhatsAppMessage = useCallback(async () => {
    const url = `whatsapp://send?phone=${number}&text=${encodeURIComponent(
      templateMessage,
    )}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log('WhatsApp is not installed on this device.');
        await Linking.openURL(
          `https://wa.me/${number}?text=${encodeURIComponent(templateMessage)}`,
        );
      }
    } catch (error) {
      console.error('An error occurred while trying to open WhatsApp:', error);
    }
  }, [number, templateMessage]);

  const handleYes = useCallback(() => {
    if (stage === 'messagePrompt') {
      sendWhatsAppMessage();
    }
    onYes();
  }, [stage, sendWhatsAppMessage, onYes]);

  const backHandler = useCallback(() => {
    // Block hardware back button when popup is visible
    return visible;
  }, [visible]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', backHandler);
    return () => sub.remove();
  }, [backHandler]);

  const getPromptText = () => {
    switch (stage) {
      case 'clientCheck':
        return `Was the person at ${number} a client?`;
      case 'messagePrompt':
        return `Do you want to send a message to ${number}?`;
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (stage) {
      case 'clientCheck':
        return '👤';
      case 'messagePrompt':
        return '💬';
      default:
        return '📞';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.7)" barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.popup}>
          {/* Header with icon */}
          <View style={styles.header}>
            <Text style={styles.icon}>{getIcon()}</Text>
            <Text style={styles.title}>
              {stage === 'clientCheck' ? 'Client Check' : 'Send Message'}
            </Text>
          </View>

          {/* Phone number display */}
          <View style={styles.numberContainer}>
            <Text style={styles.numberLabel}>Phone Number</Text>
            <Text style={styles.number}>{number}</Text>
          </View>

          {/* Main prompt */}
          <Text style={styles.prompt}>{getPromptText()}</Text>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.noButton]}
              onPress={onNo}
              activeOpacity={0.8}
            >
              <Text style={styles.noButtonText}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.yesButton]}
              onPress={handleYes}
              activeOpacity={0.8}
            >
              <Text style={styles.yesButtonText}>Yes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popup: {
    width: Math.min(width * 0.9, 350),
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 0,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  numberContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  numberLabel: {
    fontSize: 12,
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  number: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    fontFamily: 'monospace',
  },
  prompt: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 30,
    color: '#495057',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  yesButton: {
    backgroundColor: '#27ae60',
  },
  noButtonText: {
    color: '#e74c3c',
    fontWeight: '600',
    fontSize: 16,
  },
  yesButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
