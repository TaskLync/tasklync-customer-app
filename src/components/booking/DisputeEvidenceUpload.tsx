import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { BottomSheet } from '../layout/BottomSheet';
import { EvidenceSlotState } from '../../types/booking.types';
import { DisputeEvidenceSlot } from './DisputeEvidenceSlot';
import { fontFamily, fontSize, radius, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface DisputeEvidenceUploadProps {
  slots: EvidenceSlotState[];
  onPickImage: (slotIndex: number, source: 'camera' | 'gallery') => void;
  onRemoveSlot: (slotIndex: number) => void;
  onRetrySlot: (slotIndex: number) => void;
  disabled?: boolean;
}

/**
 * DisputeEvidenceUpload Component
 *
 * Implements Jakob's Law:
 * - 3-slot photo grid visually aligned with platform conventions
 * - Camera / Photo Library ActionSheet picker
 */
export const DisputeEvidenceUpload: React.FC<DisputeEvidenceUploadProps> = ({
  slots,
  onPickImage,
  onRemoveSlot,
  onRetrySlot,
  disabled = false,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  const handleOpenPicker = (slotIndex: number) => {
    if (disabled) return;
    setActiveSlotIndex(slotIndex);
  };

  const handleSelectSource = (source: 'camera' | 'gallery') => {
    if (activeSlotIndex !== null) {
      onPickImage(activeSlotIndex, source);
      setActiveSlotIndex(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Supporting Evidence (Optional)</Text>
        <Text style={styles.counterText}>
          {slots.filter((s) => s.status === 'success').length} / {slots.length}
        </Text>
      </View>
      <Text style={styles.subheading}>
        Attach up to 3 photos of incomplete tasks, damages, or receipts
      </Text>

      {/* 3-Slot Grid */}
      <View style={styles.gridRow}>
        {slots.map((slot, index) => (
          <DisputeEvidenceSlot
            key={slot.id || `slot-${index}`}
            slot={slot}
            index={index}
            onPressSlot={handleOpenPicker}
            onRemoveSlot={onRemoveSlot}
            onRetrySlot={onRetrySlot}
            disabled={disabled}
          />
        ))}
      </View>

      {/* Image Picker BottomSheet */}
      <BottomSheet
        visible={activeSlotIndex !== null}
        onClose={() => setActiveSlotIndex(null)}
        snapPoints={['auto']}
        contentPadding={true}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Attach Photo Evidence</Text>
            <Pressable
              style={styles.sheetCloseBtn}
              onPress={() => setActiveSlotIndex(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Camera Option */}
          <Pressable
            style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}
            onPress={() => handleSelectSource('camera')}
          >
            <View style={styles.optionIconCircle}>
              <Camera size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={styles.optionTitle}>Take Photo</Text>
              <Text style={styles.optionSubtitle}>Use camera to capture current evidence</Text>
            </View>
          </Pressable>

          {/* Gallery Option */}
          <Pressable
            style={({ pressed }) => [
              styles.sheetOption,
              { borderBottomWidth: 0 },
              pressed && styles.sheetOptionPressed,
            ]}
            onPress={() => handleSelectSource('gallery')}
          >
            <View style={styles.optionIconCircle}>
              <ImageIcon size={20} color={palette.infoDark} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={styles.optionTitle}>Choose from Library</Text>
              <Text style={styles.optionSubtitle}>Select photos from your device album</Text>
            </View>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  heading: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.label + 1,
    color: colors.textPrimary,
  },
  counterText: {
    fontFamily: fontFamily.inter.medium,
    fontSize: fontSize.dataXS + 0.5,
    color: colors.textMuted,
  },
  subheading: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm + 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  sheetContent: {
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4,
    color: colors.textPrimary,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  sheetOptionPressed: {
    backgroundColor: palette.gray50,
    borderRadius: radius.md,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body1 - 1,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
