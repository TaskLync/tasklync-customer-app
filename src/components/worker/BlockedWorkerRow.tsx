import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { BlockedWorker } from '../../types/moderation.types';
import { UnblockConfirmPopover } from './UnblockConfirmPopover';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface BlockedWorkerRowProps {
  worker: BlockedWorker;
  onUnblock: (workerId: string) => Promise<void>;
  isUnblocking?: boolean;
}

const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

export const BlockedWorkerRow: React.FC<BlockedWorkerRowProps> = ({
  worker,
  onUnblock,
  isUnblocking = false,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [popoverVisible, setPopoverVisible] = useState<boolean>(false);

  const formattedBlockedDate = formatDate(worker.blocked_at);

  const handleUnblockPress = () => {
    setPopoverVisible(true);
  };

  const handleConfirmUnblock = async () => {
    setPopoverVisible(false);
    await onUnblock(worker.worker_id || worker.id);
  };

  return (
    <View style={styles.container}>
      {/* Left Desaturated Avatar */}
      <View style={styles.avatarContainer}>
        {worker.avatar_url ? (
          <Image
            source={{ uri: worker.avatar_url }}
            style={styles.avatarImage}
            accessibilityLabel={`${worker.name}'s photo`}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <User size={20} color={palette.gray500} />
          </View>
        )}
      </View>

      {/* Middle Text Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.nameText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {worker.name}
        </Text>
        <Text style={styles.dateText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          Blocked on {formattedBlockedDate}
        </Text>
      </View>

      {/* Right Unblock Button (Fitts's Law: 36px+ height, explicit label) */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleUnblockPress}
        style={styles.unblockButton}
        accessibilityRole="button"
        accessibilityLabel={`Unblock ${worker.name}`}
        accessibilityHint="Opens confirmation to remove this worker from your blocked list"
      >
        <Text style={styles.unblockButtonText} maxFontSizeMultiplier={1.2}>
          Unblock
        </Text>
      </TouchableOpacity>

      {/* Anchored Confirmation Popover */}
      <UnblockConfirmPopover
        visible={popoverVisible}
        workerName={worker.name}
        onConfirm={handleConfirmUnblock}
        onCancel={() => setPopoverVisible(false)}
        isLoading={isUnblocking}
      />
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: palette.gray200,
    opacity: 0.85, // Subtle desaturation / muted treatment
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  nameText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  dateText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 1,
  },
  unblockButton: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.gray300,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockButtonText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: palette.gray700,
  },
});
