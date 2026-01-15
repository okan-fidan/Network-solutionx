import React, { useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

export { BottomSheetModalProvider };

interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  snapPoints?: (string | number)[];
  onClose?: () => void;
}

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
}

export const AppBottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, title, snapPoints: customSnapPoints, onClose }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => customSnapPoints || ['50%', '80%'], [customSnapPoints]);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.present(),
      close: () => bottomSheetRef.current?.dismiss(),
    }));

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.dismiss();
      onClose?.();
    }, [onClose]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
        />
      ),
      []
    );

    const renderHandle = useCallback(
      () => (
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ),
      [title, handleClose]
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleComponent={renderHandle}
        backgroundStyle={styles.background}
        enablePanDownToClose
        onDismiss={onClose}
      >
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      </BottomSheetModal>
    );
  }
);

// Basit Bottom Sheet Options
interface OptionItem {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  danger?: boolean;
  onPress: () => void;
}

interface BottomSheetOptionsProps {
  options: OptionItem[];
}

export const BottomSheetOptions = forwardRef<BottomSheetRef, BottomSheetOptionsProps>(
  ({ options }, ref) => {
    const sheetRef = useRef<BottomSheetRef>(null);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.open(),
      close: () => sheetRef.current?.close(),
    }));

    const handleOptionPress = (option: OptionItem) => {
      sheetRef.current?.close();
      setTimeout(() => option.onPress(), 200);
    };

    return (
      <AppBottomSheet ref={sheetRef} snapPoints={['40%']}>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={() => handleOptionPress(option)}
            >
              {option.icon && (
                <View
                  style={[
                    styles.optionIcon,
                    option.danger && styles.optionIconDanger,
                    option.color && { backgroundColor: `${option.color}15` },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={option.danger ? '#ef4444' : option.color || '#6366f1'}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.optionLabel,
                  option.danger && styles.optionLabelDanger,
                ]}
              >
                {option.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          ))}
        </View>
      </AppBottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#4b5563',
    borderRadius: 2,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  optionsContainer: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  optionLabelDanger: {
    color: '#ef4444',
  },
});
