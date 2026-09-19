import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  MapPin,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Trash2,
  Check,
} from 'lucide-react-native';
import { AddressLabelChips } from './AddressLabelChips';
import { AddressNotesInput } from './AddressNotesInput';
import { Address, ReverseGeocodeResult } from '../../types/address.types';
import { findNearbySavedAddress, formatAddressLine } from '../../utils/address';
import { colors, palette, fontFamily, radius, fontSize, shadows } from '../../design';
import {
  validateServiceArea,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../../config/serviceArea.config';

export interface AddressConfirmSheetProps {
  reverseGeocodeResult: ReverseGeocodeResult | null;
  isGeocoding: boolean;
  geocodingError?: string | null | undefined;
  savedAddresses?: Address[] | undefined;
  currentAddressId?: string | null | undefined;
  isEditMode?: boolean | undefined;
  initialLabel?: string | undefined;
  initialCustomLabel?: string | undefined;
  initialNotes?: string | undefined;
  isSaving?: boolean | undefined;
  onSaveAddress: (data: {
    label: string;
    custom_label?: string | undefined;
    notes?: string | undefined;
    address_line: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
  }) => void;
  onDeleteAddress?: (() => void) | undefined;
}

export const AddressConfirmSheet: React.FC<AddressConfirmSheetProps> = ({
  reverseGeocodeResult,
  isGeocoding,
  geocodingError,
  savedAddresses = [],
  currentAddressId,
  isEditMode = false,
  initialLabel = 'Home',
  initialCustomLabel = '',
  initialNotes = '',
  isSaving = false,
  onSaveAddress,
  onDeleteAddress,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isEditMode);
  const [selectedLabel, setSelectedLabel] = useState<string>(initialLabel);
  const [customLabel, setCustomLabel] = useState<string>(initialCustomLabel);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [dismissDuplicateWarning, setDismissDuplicateWarning] = useState<boolean>(false);
  const [isSuccessFeedback, setIsSuccessFeedback] = useState<boolean>(false);

  // Cross-fade opacity for reverse-geocoded address preview
  const textFadeOpacity = useSharedValue(1);

  // Inactivity auto-expand timer
  const stillnessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEditMode) {
      setIsExpanded(true);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (initialLabel) setSelectedLabel(initialLabel);
    if (initialCustomLabel) setCustomLabel(initialCustomLabel);
    if (initialNotes) setNotes(initialNotes);
  }, [initialLabel, initialCustomLabel, initialNotes]);

  // Smooth cross-fade on address updates
  useEffect(() => {
    textFadeOpacity.value = withSequence(
      withTiming(0.4, { duration: 60 }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) })
    );
  }, [reverseGeocodeResult?.address_line, textFadeOpacity]);

  // Auto-expand after 1.5s of map being still (unless user manually collapsed)
  useEffect(() => {
    if (!isExpanded && !isGeocoding && reverseGeocodeResult) {
      stillnessTimerRef.current = setTimeout(() => {
        setIsExpanded(true);
      }, 1500);
    }
    return () => {
      if (stillnessTimerRef.current) {
        clearTimeout(stillnessTimerRef.current);
      }
    };
  }, [isExpanded, isGeocoding, reverseGeocodeResult]);

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  // Duplicate address detection (~15m radius)
  const nearbyAddress =
    reverseGeocodeResult && !dismissDuplicateWarning
      ? findNearbySavedAddress(
          { lat: reverseGeocodeResult.lat, lng: reverseGeocodeResult.lng },
          savedAddresses.filter((a) => a.id !== currentAddressId),
          15
        )
      : null;

  const currentAddressText = reverseGeocodeResult
    ? formatAddressLine(reverseGeocodeResult)
    : isGeocoding
    ? 'Locating pinpoint address...'
    : geocodingError || 'Select a point on the map';

  const isServiceable = reverseGeocodeResult
    ? validateServiceArea({ lat: reverseGeocodeResult.lat, lng: reverseGeocodeResult.lng }).isServiceable
    : true;

  const isFormValid =
    Boolean(reverseGeocodeResult) &&
    (selectedLabel === 'Home' ||
      selectedLabel === 'Office' ||
      (selectedLabel === 'Other' && customLabel.trim().length > 0) ||
      Boolean(selectedLabel && selectedLabel.trim().length > 0));

  const handleSave = () => {
    if (!isFormValid || !reverseGeocodeResult || !isServiceable || isSaving) return;

    setIsSuccessFeedback(true);

    const finalLabel =
      selectedLabel === 'Other' ? customLabel.trim() || 'Other' : selectedLabel;

    onSaveAddress({
      label: finalLabel,
      custom_label: selectedLabel === 'Other' ? customLabel.trim() : undefined,
      notes: notes.trim() || undefined,
      address_line: reverseGeocodeResult.address_line || currentAddressText,
      city: reverseGeocodeResult.city || 'Faisalabad',
      country: reverseGeocodeResult.country || 'Pakistan',
      lat: reverseGeocodeResult.lat,
      lng: reverseGeocodeResult.lng,
    });
  };

  const handleDelete = () => {
    if (!onDeleteAddress) return;

    Alert.alert(
      'Delete Address',
      'Are you sure you want to remove this saved address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteAddress();
          },
        },
      ]
    );
  };

  const animatedAddressStyle = useAnimatedStyle(() => ({
    opacity: textFadeOpacity.value,
  }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={styles.keyboardContainer}
    >
      <View style={[styles.sheetContainer, isExpanded ? styles.sheetExpanded : styles.sheetCollapsed]}>
        {/* Drag Handle Bar */}
        <Pressable
          onPress={toggleExpand}
          style={styles.handleContainer}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Collapse address details' : 'Expand address details'}
        >
          <View style={styles.handle} />
        </Pressable>

        {/* Address Header Preview */}
        <Pressable onPress={toggleExpand} style={styles.headerRow}>
          <View style={styles.pinIconWrap}>
            <MapPin size={20} color={colors.primaryDark} strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerSectionTitle} maxFontSizeMultiplier={1.3}>
              Location
            </Text>
            <Animated.Text
              style={[styles.addressPreviewText, animatedAddressStyle]}
              numberOfLines={isExpanded ? 2 : 1}
              maxFontSizeMultiplier={1.3}
            >
              {currentAddressText}
            </Animated.Text>
          </View>
          <View style={styles.expandChevronWrap}>
            {isExpanded ? (
              <ChevronDown size={20} color={palette.gray500} />
            ) : (
              <ChevronUp size={20} color={palette.gray500} />
            )}
          </View>
        </Pressable>

        {/* Expanded Form Content */}
        {isExpanded && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.expandedScrollContent}
          >
            {/* Duplicate Address Soft Warning (Non-blocking) */}
            {Boolean(nearbyAddress) && (
              <View style={styles.duplicateWarning}>
                <AlertTriangle size={16} color={palette.warningDark} strokeWidth={2.2} />
                <Text style={styles.duplicateWarningText} maxFontSizeMultiplier={1.3}>
                  This looks similar to your saved &quot;{nearbyAddress?.label}&quot; address.
                </Text>
                <Pressable
                  onPress={() => setDismissDuplicateWarning(true)}
                  style={styles.duplicateDismissBtn}
                  accessibilityLabel="Dismiss warning"
                >
                  <Text style={styles.duplicateDismissText}>Dismiss</Text>
                </Pressable>
              </View>
            )}

            {/* Label Chips (Home / Office / Other) */}
            <AddressLabelChips
              selectedLabel={selectedLabel}
              customLabel={customLabel}
              onSelectLabel={setSelectedLabel}
              onChangeCustomLabel={setCustomLabel}
            />

            {/* Optional Delivery & Entry Notes */}
            <AddressNotesInput value={notes} onChangeText={setNotes} />

            {/* In Edit Mode: Destructive Delete Link */}
            {isEditMode && onDeleteAddress && (
              <Pressable
                onPress={handleDelete}
                style={styles.deleteLinkContainer}
                accessibilityRole="button"
                accessibilityLabel="Delete this address"
              >
                <Trash2 size={15} color={palette.danger} strokeWidth={2.2} />
                <Text style={styles.deleteLinkText} maxFontSizeMultiplier={1.3}>
                  Delete this address
                </Text>
              </Pressable>
            )}
          </ScrollView>
        )}

        {/* Out-of-service restriction banner */}
        {!isServiceable && Boolean(reverseGeocodeResult) && (
          <View style={styles.restrictionBanner}>
            <AlertTriangle size={16} color={palette.danger} strokeWidth={2.2} />
            <Text style={styles.restrictionBannerText} maxFontSizeMultiplier={1.3}>
              {SERVICE_UNAVAILABLE_MESSAGE}
            </Text>
          </View>
        )}

        {/* Sticky Action Button (52px, Radius-Pill) */}
        <View style={styles.ctaContainer}>
          <Pressable
            onPress={handleSave}
            disabled={!isFormValid || !isServiceable || isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              (!isFormValid || !isServiceable) && styles.saveButtonDisabled,
              isSuccessFeedback && styles.saveButtonSuccess,
              pressed && isFormValid && isServiceable && styles.saveButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Update Address' : 'Save Address'}
            accessibilityState={{ disabled: !isFormValid || !isServiceable || isSaving }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : isSuccessFeedback ? (
              <View style={styles.successRow}>
                <Check size={18} color={palette.white} strokeWidth={3} />
                <Text style={styles.saveButtonText} maxFontSizeMultiplier={1.3}>
                  {isEditMode ? 'Updated!' : 'Saved!'}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  (!isFormValid || !isServiceable) && styles.saveButtonTextDisabled,
                ]}
                maxFontSizeMultiplier={1.3}
              >
                {!isServiceable && Boolean(reverseGeocodeResult)
                  ? 'Outside Service Area'
                  : isEditMode
                  ? 'Update Address'
                  : 'Save Address'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  sheetContainer: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: palette.gray200,
    ...shadows.xl,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  sheetCollapsed: {
    maxHeight: 190,
  },
  sheetExpanded: {
    maxHeight: 480,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray300,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  pinIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.green50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerSectionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressPreviewText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    marginTop: 2,
  },
  expandChevronWrap: {
    padding: 6,
  },
  expandedScrollContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.warningLight,
    borderWidth: 1,
    borderColor: palette.warning,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
    gap: 8,
  },
  restrictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.dangerLight,
    borderWidth: 1,
    borderColor: palette.danger,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  restrictionBannerText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: palette.danger,
  },
  duplicateWarningText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    lineHeight: 16,
    color: palette.warningDark,
  },
  duplicateDismissBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  duplicateDismissText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11,
    color: palette.warningDark,
    textDecorationLine: 'underline',
  },
  deleteLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteLinkText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: palette.danger,
  },
  ctaContainer: {
    paddingTop: 10,
  },
  saveButton: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.green600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.green600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonPressed: {
    backgroundColor: palette.green700,
    transform: [{ scale: 0.98 }],
  },
  saveButtonDisabled: {
    backgroundColor: palette.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonSuccess: {
    backgroundColor: palette.green500,
  },
  saveButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.body1,
    lineHeight: 22,
    color: palette.white,
  },
  saveButtonTextDisabled: {
    color: palette.gray400,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
