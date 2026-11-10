import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Plus, X, RotateCw } from 'lucide-react-native';
import { EvidenceSlotState } from '../../types/booking.types';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface DisputeEvidenceSlotProps {
  slot: EvidenceSlotState;
  index: number;
  onPressSlot: (index: number) => void;
  onRemoveSlot: (index: number) => void;
  onRetrySlot: (index: number) => void;
  disabled?: boolean;
}

/**
 * DisputeEvidenceSlot Component
 *
 * Implements Hard Problem #3:
 * - Independent slot state machine (empty, uploading, success, error)
 * - Retries directly using cached local compressed URI
 * - Visual feedback with progress percentage
 */
export const DisputeEvidenceSlot: React.FC<DisputeEvidenceSlotProps> = ({
  slot,
  index,
  onPressSlot,
  onRemoveSlot,
  onRetrySlot,
  disabled = false,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isSuccess = slot.status === 'success';
  const isUploading = slot.status === 'uploading';
  const isError = slot.status === 'error';
  const isEmpty = slot.status === 'idle' || (!slot.localUri && !slot.uploadedUrl);

  const displayImageUri = slot.localUri || slot.uploadedUrl;

  return (
    <View style={styles.container}>
      {/* 1. Empty / Idle State */}
      {isEmpty && (
        <Pressable
          style={({ pressed }) => [
            styles.slotBox,
            styles.emptySlot,
            pressed && !disabled && styles.slotPressed,
            disabled && styles.slotDisabled,
          ]}
          onPress={() => onPressSlot(index)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Add photo evidence slot ${index + 1}`}
        >
          <View style={styles.plusCircle}>
            <Plus size={20} color={colors.primaryDark} strokeWidth={2.4} />
          </View>
          <Text style={styles.addText}>Add Photo</Text>
        </Pressable>
      )}

      {/* 2. Uploading State */}
      {isUploading && (
        <View style={[styles.slotBox, styles.uploadingSlot]}>
          {displayImageUri ? (
            <Image
              source={{ uri: displayImageUri }}
              style={styles.backgroundImage}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="small" color={colors.textOnGreen} />
            <Text style={styles.uploadProgressText}>
              {Math.round(slot.progress || 0)}%
            </Text>
          </View>
        </View>
      )}

      {/* 3. Error / Retry State */}
      {isError && (
        <View style={[styles.slotBox, styles.errorSlot]}>
          {displayImageUri ? (
            <Image
              source={{ uri: displayImageUri }}
              style={styles.backgroundImage}
              contentFit="cover"
            />
          ) : null}
          <Pressable
            style={styles.errorOverlay}
            onPress={() => onRetrySlot(index)}
            accessibilityRole="button"
            accessibilityLabel={`Retry uploading photo ${index + 1}`}
          >
            <RotateCw size={20} color={palette.pureWhite} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>

          {/* Remove option even in error */}
          <Pressable
            style={styles.removeBtn}
            onPress={() => onRemoveSlot(index)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Remove failed photo"
          >
            <X size={14} color={palette.pureWhite} />
          </Pressable>
        </View>
      )}

      {/* 4. Success State */}
      {isSuccess && displayImageUri && (
        <View style={[styles.slotBox, styles.successSlot]}>
          <Image
            source={{ uri: displayImageUri }}
            style={styles.previewImage}
            contentFit="cover"
            transition={150}
          />

          {/* Remove Button */}
          <Pressable
            style={styles.removeBtn}
            onPress={() => onRemoveSlot(index)}
            disabled={disabled}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}
          >
            <X size={14} color={palette.pureWhite} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 105,
  },
  slotBox: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  emptySlot: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  slotPressed: {
    backgroundColor: palette.gray100,
    transform: [{ scale: 0.98 }],
  },
  slotDisabled: {
    opacity: 0.5,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  addText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.dataXS - 0.5,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  uploadingSlot: {
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadProgressText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: fontSize.dataXS,
    color: palette.pureWhite,
  },
  errorSlot: {
    backgroundColor: palette.dangerDark,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  retryText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: fontSize.nano + 1,
    color: palette.pureWhite,
  },
  successSlot: {
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
