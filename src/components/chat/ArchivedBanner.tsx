import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ArchivedBannerProps {
  status?: string | undefined;
  message?: string | undefined;
}

/**
 * ArchivedBanner Component
 *
 * Implements Day 29 Archived State Handling:
 * - Replaces ChatInput at the exact same fixed footer position when booking is COMPLETED, CANCELLED, or DISPUTED
 * - Prevents layout shifts and keeps user orientation intact
 * - Clean, reassuring muted typography (Jakarta Regular 12, #64748B)
 * - Zero interactive input when conversation is closed
 */
export const ArchivedBanner = React.memo(function ArchivedBanner({
  status,
  message,
}: ArchivedBannerProps) {
  const insets = useSafeAreaInsets();

  const getNotice = () => {
    if (message) return message;
    const normalized = (status || '').toUpperCase();
    if (normalized === 'COMPLETED') {
      return 'This booking is completed. Conversation is now archived.';
    }
    if (normalized === 'CANCELLED') {
      return 'This booking was cancelled. Conversation is now archived.';
    }
    if (normalized === 'DISPUTED') {
      return 'This booking is under review. Messaging is currently closed.';
    }
    return 'This conversation is now archived.';
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.content}>
        <Lock size={15} color="#94A3B8" strokeWidth={2} style={styles.icon} />
        <Text style={styles.text}>{getNotice()}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
});
