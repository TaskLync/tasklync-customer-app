import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { BottomSheet } from '../../src/components/layout/BottomSheet';
import { useCurrentUser, useUpdateProfile, useUploadAvatar, useUpdatePreferences } from '../../src/hooks/useProfile';
import { useEditProfileForm } from '../../src/hooks/useEditProfileForm';
import { AvatarUploadRing } from '../../src/components/profile/AvatarUploadRing';
import { PreferenceToggleRow } from '../../src/components/profile/PreferenceToggleRow';
import { colors, palette, fontFamily, fontSize, radius, spacing } from '../../src/design';

/**
 * EditProfileScreen (Day 35 Edit Profile Flow)
 *
 * Implements Principal-level React Native & UX Architecture:
 * - True field-by-field dirty checking gating the Save action
 * - Real upload progress ring for avatar photo updates
 * - Unsaved changes back-navigation confirmation guard
 * - Immediate auto-persisting segmented preference toggles
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user } = useCurrentUser();
  const { updateProfile, isUpdating } = useUpdateProfile();
  const { uploadAvatar, uploadProgress, isUploading } = useUploadAvatar();
  const { updatePreferences } = useUpdatePreferences();

  const {
    name,
    setName,
    email,
    setEmail,
    isDirty,
    canSave,
  } = useEditProfileForm(user);

  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url || null);
  const [photoSheetVisible, setPhotoSheetVisible] = useState<boolean>(false);
  const [nameFocused, setNameFocused] = useState<boolean>(false);
  const [emailFocused, setEmailFocused] = useState<boolean>(false);

  // Unsaved Changes Guard
  const handleBackPress = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved edits. Are you sure you want to leave without saving?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty, router]);

  // Handle Save
  const handleSave = async () => {
    if (!canSave || isUpdating) return;

    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
      });

      router.back();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Unable to update profile. Please try again.');
    }
  };

  // Handle Photo Picker
  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    setPhotoSheetVisible(false);

    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Denied', 'Camera permission is required to take a profile photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert('Permission Denied', 'Gallery permission is required to select a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedLocalUri = result.assets[0].uri;
      setAvatarUri(selectedLocalUri);

      // Upload with real progress tracking
      const newAvatarUrl = await uploadAvatar(selectedLocalUri);
      setAvatarUri(newAvatarUrl);
    } catch (_err) {
      // Handled in hook
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flexOne}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

        {/* Navigation Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Edit Profile</Text>

          {/* Top Save Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.saveButton,
              canSave ? styles.saveButtonActive : styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!canSave || isUpdating}
            accessibilityRole="button"
            accessibilityLabel="Save Profile Changes"
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.textOnGreen} />
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  canSave ? styles.saveTextActive : styles.saveTextDisabled,
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Avatar Ring Section */}
          <View style={styles.avatarSection}>
            <AvatarUploadRing
              imageUri={avatarUri || user?.avatar_url}
              name={name || user?.name}
              progress={uploadProgress}
              size={96}
              showEditBadge={!isUploading}
              onPress={() => setPhotoSheetVisible(true)}
            />
            <Text style={styles.avatarHintText}>
              {isUploading ? 'Uploading photo...' : 'Tap photo to change'}
            </Text>
          </View>

          {/* 2. Personal Information Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Personal Information</Text>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  nameFocused && styles.textInputFocused,
                ]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
                accessibilityLabel="Full Name input"
              />
            </View>

            {/* Disabled Phone Display */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithLock}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <Lock size={12} color={colors.textMuted} />
              </View>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledInputText}>{user?.phone || '+92 300 0000000'}</Text>
              </View>
              <Text style={styles.fieldNote}>
                Verified and linked to account security.
              </Text>
            </View>

            {/* Optional Email Input */}
            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Email Address (Optional)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  emailFocused && styles.textInputFocused,
                ]}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email Address input"
              />
            </View>
          </View>

          {/* 3. Language & Regional Preferences Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Preferences</Text>

            {/* Language Toggle */}
            <PreferenceToggleRow
              label="Display Language"
              subtitle="Select your preferred app language"
              options={[
                { label: 'English', value: 'en' },
                { label: 'اردو', value: 'ur' },
              ]}
              selectedValue={user?.preferred_language || 'en'}
              onSelect={(val) => updatePreferences({ preferred_language: val as any })}
            />

            {/* Currency Toggle */}
            <PreferenceToggleRow
              label="Pricing Currency"
              subtitle="Default currency for estimates & invoices"
              options={[
                { label: 'PKR (Rs)', value: 'PKR' },
                { label: 'USD ($)', value: 'USD' },
              ]}
              selectedValue={user?.preferred_currency || 'PKR'}
              onSelect={(val) => updatePreferences({ preferred_currency: val as any })}
            />
          </View>
        </ScrollView>

        {/* Photo Selection ActionSheet */}
        <BottomSheet
          visible={photoSheetVisible}
          onClose={() => setPhotoSheetVisible(false)}
          snapPoints={['auto']}
          contentPadding={true}
        >
          <View style={styles.photoSheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Change Profile Photo</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setPhotoSheetVisible(false)}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.sheetOption}
              onPress={() => handlePickPhoto('camera')}
            >
              <View style={styles.optionIconCircle}>
                <Camera size={20} color={colors.primaryDark} />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Take New Photo</Text>
                <Text style={styles.optionSubtitle}>Open camera to capture image</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.sheetOption, { borderBottomWidth: 0 }]}
              onPress={() => handlePickPhoto('gallery')}
            >
              <View style={styles.optionIconCircle}>
                <ImageIcon size={20} color={palette.infoDark} />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Choose from Library</Text>
                <Text style={styles.optionSubtitle}>Select from your photos</Text>
              </View>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgApp,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h4 + 1,
    color: colors.textPrimary,
  },
  saveButton: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  saveButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: palette.gray100,
  },
  saveButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body2,
  },
  saveTextActive: {
    color: colors.textOnGreen,
  },
  saveTextDisabled: {
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    gap: spacing.xs + 2,
  },
  avatarHintText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.caption,
    color: colors.primaryDark,
  },
  card: {
    backgroundColor: colors.bgCard,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardHeading: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1 - 0.5,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  labelWithLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  inputLabel: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: fontSize.caption + 0.5,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textPrimary,
  },
  textInputFocused: {
    backgroundColor: colors.bgCard,
    borderColor: colors.primaryDark,
  },
  disabledInput: {
    height: 48,
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  disabledInputText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: fontSize.body2,
    color: colors.textMuted,
  },
  fieldNote: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.nano + 1,
    color: colors.textMuted,
    marginTop: 4,
  },
  photoSheetContent: {
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
