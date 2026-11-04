import { colors } from '../../design';
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Phone } from 'lucide-react-native';
import { WorkerAvatar } from '../worker/WorkerAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  workerName: string;
  workerAvatarUrl?: string | undefined;
  categoryName?: string | undefined;
  isOnline?: boolean | undefined;
  workerPhone?: string | undefined;
  isCompany?: boolean | undefined;
  onCallPress?: () => void;
}

/**
 * Lightweight chat header: back · avatar (with presence dot) · name over "category · status" · call.
 * Name carries the hierarchy; category and presence are small and muted.
 */
export const ChatHeader = React.memo(function ChatHeader({
  workerName,
  workerAvatarUrl,
  categoryName,
  isOnline = false,
  workerPhone,
  isCompany = false,
  onCallPress,
}: ChatHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const trimmedName = workerName ? workerName.trim() : '';
  const displayName = trimmedName || (isCompany ? 'Agency Support' : 'Assigned Professional');
  const secondary = isCompany ? 'Support office' : categoryName?.trim() || '';
  const statusLabel = isOnline ? 'Online' : 'Offline';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'ios' ? 44 : 12 },
      ]}
    >
      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft size={26} color={colors.textPrimary} strokeWidth={2} />
        </Pressable>

        <View
          style={styles.profileSection}
          accessible
          accessibilityLabel={`${displayName}${secondary ? `, ${secondary}` : ''}, ${statusLabel}`}
        >
          <View style={styles.avatarWrap}>
            <WorkerAvatar uri={workerAvatarUrl} name={workerName} size={38} isCompany={isCompany} />
            <View style={[styles.presenceDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          </View>

          <View style={styles.textDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {isCompany && (
                <View style={styles.agencyBadge}>
                  <Text style={styles.agencyBadgeText}>Agency</Text>
                </View>
              )}
            </View>
            <Text style={styles.subline} numberOfLines={1}>
              {secondary ? `${secondary} · ` : ''}
              <Text style={isOnline ? styles.statusOnline : undefined}>{statusLabel}</Text>
            </Text>
          </View>
        </View>

        {workerPhone ? (
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            onPress={onCallPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Call worker"
            accessibilityRole="button"
          >
            <Phone size={19} color={colors.primaryDark} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  content: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
    marginRight: 8,
  },
  avatarWrap: {
    width: 38,
    height: 38,
  },
  presenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: colors.bgCard,
  },
  dotOnline: {
    backgroundColor: colors.primary,
  },
  dotOffline: {
    backgroundColor: colors.textMuted,
  },
  textDetails: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  subline: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  statusOnline: {
    color: colors.primaryDark,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    marginRight: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  agencyBadge: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  agencyBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 9.5,
    color: colors.textInfo,
  },
});
