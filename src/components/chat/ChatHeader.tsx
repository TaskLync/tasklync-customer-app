import { colors, palette } from '../../design';
import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
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

export const ChatHeader = React.memo(function ChatHeader({
  workerName,
  workerAvatarUrl,
  categoryName,
  isOnline = true,
  workerPhone,
  isCompany = false,
  onCallPress,
}: ChatHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const trimmedName = workerName ? workerName.trim() : '';
  const avatarInitial = trimmedName.length > 0 ? trimmedName.charAt(0).toUpperCase() : (isCompany ? 'A' : 'W');

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'ios' ? 44 : 12 }]}>
      <View style={styles.content}>
        {/* Back Button */}
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <WorkerAvatar
            uri={workerAvatarUrl}
            name={workerName}
            size={36}
            isCompany={isCompany}
          />

          <View style={styles.textDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {trimmedName || (isCompany ? 'Agency Support' : 'Assigned Professional')}
              </Text>
              {isCompany && (
                <View style={styles.agencyBadge}>
                  <Text style={styles.agencyBadgeText}>Agency</Text>
                </View>
              )}
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
              <Text style={styles.statusText} numberOfLines={1}>
                {isCompany
                  ? `Support Office • ${isOnline ? 'Online' : 'Active'}`
                  : categoryName
                  ? `${categoryName} • ${isOnline ? 'Online' : 'Offline'}`
                  : isOnline
                  ? 'Online'
                  : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {workerPhone && (
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
              onPress={onCallPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Call worker"
              accessibilityRole="button"
            >
              <Phone size={20} color={colors.primaryDark} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
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
    marginLeft: 4,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: colors.primaryDark,
  },
  textDetails: {
    marginLeft: 10,
    flex: 1,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  dotOnline: {
    backgroundColor: colors.primaryDark,
  },
  dotOffline: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.primaryTint,
    marginLeft: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agencyBadge: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderInfoLight,
  },
  agencyBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 9.5,
    color: colors.textInfo,
  },
});
