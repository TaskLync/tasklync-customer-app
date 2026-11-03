import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Camera, Image as ImageIcon, Plus, X } from 'lucide-react-native';
import { colors, palette, fontFamily, fontSize, radius, spacing } from '../../design';
import { ReviewImageModal } from './ReviewImageModal';

export interface ReviewPhotoUploadProps {
  photos: string[];
  maxPhotos?: number;
  isUploading: boolean;
  onPickPhoto: (source: 'camera' | 'gallery') => void;
  onRemovePhoto: (index: number) => void;
  disabled?: boolean;
}

export const ReviewPhotoUpload: React.FC<ReviewPhotoUploadProps> = ({
  photos,
  maxPhotos = 5,
  isUploading,
  onPickPhoto,
  onRemovePhoto,
  disabled = false,
}) => {
  const [pickerModalVisible, setPickerModalVisible] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const handleSelectSource = useCallback(
    (source: 'camera' | 'gallery') => {
      setPickerModalVisible(false);
      onPickPhoto(source);
    },
    [onPickPhoto]
  );

  const canAddMore = photos.length < maxPhotos && !disabled && !isUploading;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Add Photos</Text>
          <Text style={styles.counter}>
            {photos.length} / {maxPhotos}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          Show the quality of work. Max 5 photos, up to 8 MB each.
        </Text>
      </View>

      <View style={styles.grid}>
        {/* Uploaded Photos */}
        {photos.map((photoUrl, index) => (
          <View key={`${photoUrl}-${index}`} style={styles.thumbnailWrapper}>
            <Pressable
              onPress={() => setPreviewImageUrl(photoUrl)}
              style={styles.thumbnailTouch}
              accessibilityRole="button"
              accessibilityLabel={`View full photo ${index + 1}`}
            >
              <Image source={{ uri: photoUrl }} style={styles.thumbnailImage} contentFit="cover" />
            </Pressable>

            {!disabled && (
              <Pressable
                onPress={() => onRemovePhoto(index)}
                style={styles.removeBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <X size={12} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            )}
          </View>
        ))}

        {/* Uploading Progress Slot */}
        {isUploading && (
          <View style={[styles.thumbnailWrapper, styles.uploadingSlot]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}

        {/* Add Photo Button Slot */}
        {canAddMore && (
          <Pressable
            onPress={() => setPickerModalVisible(true)}
            style={({ pressed }) => [styles.addPhotoBtn, pressed && styles.addPhotoPressed]}
            accessibilityRole="button"
            accessibilityLabel="Add review photo"
          >
            <View style={styles.addIconCircle}>
              <Plus size={18} color={colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </Pressable>
        )}
      </View>

      {/* Image Preview Modal */}
      <ReviewImageModal
        visible={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      {/* Source Picker Bottom Sheet Modal */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerModalVisible(false)}
            accessibilityLabel="Dismiss options"
          />

          <View style={styles.pickerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Attach Photo</Text>
            <Text style={styles.sheetSubtitle}>Choose how you'd like to add a photo</Text>

            <View style={styles.optionsList}>
              <Pressable
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
                onPress={() => handleSelectSource('camera')}
                accessibilityRole="button"
                accessibilityLabel="Take a photo with camera"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: palette.green50 }]}>
                  <Camera size={20} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionLabel}>Take Photo</Text>
                  <Text style={styles.optionDescription}>Capture photo with your device camera</Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
                onPress={() => handleSelectSource('gallery')}
                accessibilityRole="button"
                accessibilityLabel="Choose from photo library"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: palette.gray100 }]}>
                  <ImageIcon size={20} color={colors.textPrimary} strokeWidth={2.2} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionLabel}>Photo Library</Text>
                  <Text style={styles.optionDescription}>Select from your existing gallery</Text>
                </View>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelPressed]}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 1,
    color: colors.textPrimary,
  },
  counter: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  thumbnailWrapper: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailTouch: {
    width: '100%',
    height: '100%',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  uploadingSlot: {
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  uploadingText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 4,
  },
  addPhotoBtn: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPressed: {
    opacity: 0.7,
  },
  addIconCircle: {
    marginBottom: 2,
  },
  addPhotoText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 10,
    color: colors.primaryDark,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray300,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4,
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bgApp,
  },
  optionPressed: {
    backgroundColor: palette.gray100,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: fontFamily.poppins.medium,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  optionDescription: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.dataSM,
    color: colors.textSecondary,
    marginTop: 1,
  },
  cancelBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPressed: {
    opacity: 0.7,
  },
  cancelBtnText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
  },
});
