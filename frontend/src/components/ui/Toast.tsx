import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const toastConfig: ToastConfig = {
  success: (props) => (
    <View style={[styles.container, styles.success]}>
      <View style={[styles.iconWrapper, styles.successIcon]}>
        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props) => (
    <View style={[styles.container, styles.error]}>
      <View style={[styles.iconWrapper, styles.errorIcon]}>
        <Ionicons name="close-circle" size={24} color="#ef4444" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
      </View>
    </View>
  ),
  info: (props) => (
    <View style={[styles.container, styles.info]}>
      <View style={[styles.iconWrapper, styles.infoIcon]}>
        <Ionicons name="information-circle" size={24} color="#6366f1" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
      </View>
    </View>
  ),
  warning: (props) => (
    <View style={[styles.container, styles.warning]}>
      <View style={[styles.iconWrapper, styles.warningIcon]}>
        <Ionicons name="warning" size={24} color="#f59e0b" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
      </View>
    </View>
  ),
};

export const ToastProvider = () => (
  <Toast config={toastConfig} position="top" topOffset={60} visibilityTime={3000} />
);

// Helper functions
export const showToast = {
  success: (title: string, message?: string) => {
    Toast.show({ type: 'success', text1: title, text2: message });
  },
  error: (title: string, message?: string) => {
    Toast.show({ type: 'error', text1: title, text2: message });
  },
  info: (title: string, message?: string) => {
    Toast.show({ type: 'info', text1: title, text2: message });
  },
  warning: (title: string, message?: string) => {
    Toast.show({ type: 'warning', text1: title, text2: message });
  },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  success: { borderColor: 'rgba(16, 185, 129, 0.3)' },
  error: { borderColor: 'rgba(239, 68, 68, 0.3)' },
  info: { borderColor: 'rgba(99, 102, 241, 0.3)' },
  warning: { borderColor: 'rgba(245, 158, 11, 0.3)' },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successIcon: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  errorIcon: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  infoIcon: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  warningIcon: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  content: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  message: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
});

export default Toast;
