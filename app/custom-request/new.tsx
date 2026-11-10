import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Video as VideoIcon,
  MapPin,
  Calendar,
  Check,
  X,
  AlertCircle,
  UploadCloud,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Star,
  Plus,
} from 'lucide-react-native';

import { fontFamily } from '../../src/design';
import { WorkerAvatar } from '../../src/components/worker/WorkerAvatar';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from '../../src/components/ui/Skeleton';
import { useWorkerProfile } from '../../src/hooks/useWorkerProfile';
import { isAgencyProvider, providerTypeHint } from '../../src/utils/providerHint';
import { useAddresses } from '../../src/hooks/useAddresses';
import { useLocationStore } from '../../src/store/location.store';
import { validateServiceArea, SERVICE_UNAVAILABLE_MESSAGE } from '../../src/config/serviceArea.config';
import { AddAddressBottomSheet, AddAddressBottomSheetRef } from '../../src/components/address/AddAddressBottomSheet';
import { useCustomRequestMediaUpload } from '../../src/hooks/custom-requests/useCustomRequestMediaUpload';
import { useCreateCustomRequest } from '../../src/hooks/custom-requests/useCreateCustomRequest';
import { userApi } from '../../src/services/api/user.api';
import { CreateCustomRequestDto, CustomServiceRequestMediaInput } from '../../src/types/customRequest.types';
import { normalizeDateToYYYYMMDD } from '../../src/utils/timezone';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { showAlert } from '../../src/components/feedback/AppAlert';

// Normalized address interface supporting all address structures in the app
interface NormalizedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
}

const TIME_SLOT_OPTIONS = [
  'Morning · 9–12',
  'Afternoon · 12–3',
  'Evening · 3–6',
  'Any time',
] as const;

type TimeSlotOption = (typeof TIME_SLOT_OPTIONS)[number];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function NewCustomRequestScreen() {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ workerId?: string; categoryId?: string; providerType?: string }>();
  const workerId = params.workerId || '';
  const initialCategoryId = params.categoryId || '';
  // Set by the agency (company) profile. The server still verifies it against the real account.
  const openedFromAgencyProfile = params.providerType === 'COMPANY';

  const addAddressSheetRef = useRef<AddAddressBottomSheetRef>(null);

  // Flow Step: exactly 1 (Describe Problem) or 2 (Location & Availability)
  const [step, setStep] = useState<1 | 2>(1);

  // Screen 1: Problem state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focusedField, setFocusedField] = useState<'title' | 'description' | null>(null);

  // Screen 2: Location & Availability state
  const [selectedAddress, setSelectedAddress] = useState<NormalizedAddress | null>(null);
  const [preferredDateOption, setPreferredDateOption] = useState<'flexible' | 'today' | 'tomorrow' | 'custom'>('flexible');
  const [customDate, setCustomDate] = useState<string | null>(null); // YYYY-MM-DD
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<TimeSlotOption>('Any time');

  // Modals
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Calendar month navigation
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());

  // Errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Worker query
  const { worker, isLoading: isWorkerLoading } = useWorkerProfile(workerId);

  // Agency (company) vs individual worker. The profile mapper defaults to INDIVIDUAL when the endpoint
  // omits the type, so "agency" is trusted from either signal, but "individual" is never asserted.
  const isAgency = isAgencyProvider({ openedFromAgencyProfile, profileProviderType: worker?.provider_type });
  const providerDisplayName = isAgency ? worker?.business_name || worker?.name : worker?.name;

  // Addresses query & location store
  const { addresses } = useAddresses();
  // Live GPS only: a hydrated last-session position must not become the job location
  const currentLocation = useLocationStore((s) => s.liveLocation);
  const currentCity = useLocationStore((s) => s.currentCity);
  const storeSelectedAddress = useLocationStore((s) => s.selectedAddress);

  // Media upload hook
  const {
    slots,
    pickFromCamera,
    pickFromGallery,
    removeSlot,
    retrySlot,
    isUploadingAny,
    hasErrors,
    firstErrorMessage,
    totalCount,
    maxCount,
  } = useCustomRequestMediaUpload();

  // Create Request Mutation
  const createMutation = useCreateCustomRequest();

  // Handle hardware back on Android: return from Step 2 to Step 1 seamlessly
  useEffect(() => {
    const handleHardwareBack = () => {
      if (step === 2) {
        setStep(1);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [step]);

  // Initialize selected address from saved default, first address, or current location
  useEffect(() => {
    if (selectedAddress) return;

    const defaultAddr = addresses.find((a) => a.is_default) || addresses[0] || storeSelectedAddress;

    if (defaultAddr) {
      setSelectedAddress({
        id: defaultAddr.id,
        label: defaultAddr.label || 'Home',
        street: (defaultAddr as any).address_line || (defaultAddr as any).street || '',
        city: defaultAddr.city || 'Faisalabad',
        latitude: (defaultAddr as any).lat ?? (defaultAddr as any).latitude ?? 31.4187,
        longitude: (defaultAddr as any).lng ?? (defaultAddr as any).longitude ?? 73.0791,
        is_default: Boolean(defaultAddr.is_default),
      });
    } else if (currentLocation) {
      setSelectedAddress({
        id: 'current_loc',
        label: 'Current Location',
        street: currentCity ? `${currentCity}, Pakistan` : 'Faisalabad, Pakistan',
        city: currentCity || 'Faisalabad',
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        is_default: true,
      });
    }
  }, [addresses, storeSelectedAddress, currentLocation, currentCity, selectedAddress]);

  // Back navigation handler
  const handleNavBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/' as any);
    }
  };

  // Format custom date chip label (e.g. "Thu, 29 Oct")
  const formattedCustomDateChip = useMemo(() => {
    if (!customDate) return 'Choose date';
    try {
      const [y, m, d] = customDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      return `${dayName}, ${d} ${monthName}`;
    } catch {
      return customDate;
    }
  }, [customDate]);

  // Compute preferred date string YYYY-MM-DD
  const computePreferredDate = (): string | undefined => {
    const now = new Date();
    if (preferredDateOption === 'today') {
      return now.toISOString().split('T')[0];
    }
    if (preferredDateOption === 'tomorrow') {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return tomorrow.toISOString().split('T')[0];
    }
    if (preferredDateOption === 'custom' && customDate) {
      return normalizeDateToYYYYMMDD(customDate) || customDate;
    }
    return undefined;
  };

  // Step 1 Validation
  const handleContinueToStep2 = () => {
    const errors: Record<string, string> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 5) {
      errors.title = 'Please enter a title (at least 5 characters).';
    } else if (trimmedTitle.length > 150) {
      errors.title = 'Title cannot exceed 150 characters.';
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      errors.description = 'Please describe the issue in detail (at least 10 characters).';
    } else if (trimmedDesc.length > 3000) {
      errors.description = 'Description cannot exceed 3,000 characters.';
    }

    if (hasErrors) {
      errors.media = 'One or more attachments failed to upload. Please retry or remove them.';
    }

    if (isUploadingAny) {
      errors.media = 'Please wait for your attachments to finish uploading.';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      setStep(2);
    }
  };

  // Step 2 Submission
  const handleSubmit = async () => {
    const errors: Record<string, string> = {};

    if (!selectedAddress) {
      errors.address = 'Please select a service address.';
    } else if (selectedAddress.latitude && selectedAddress.longitude) {
      const areaCheck = validateServiceArea({
        lat: selectedAddress.latitude,
        lng: selectedAddress.longitude,
      });
      if (!areaCheck.isServiceable) {
        if (__DEV__) {
          console.warn('[validateForm] Outside service area in DEV, using fallback');
        } else {
          errors.address = SERVICE_UNAVAILABLE_MESSAGE;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!workerId) {
      showAlert('Worker Required', 'No professional was selected for this quote request.');
      return;
    }

    const categoryId = initialCategoryId || worker?.categories?.[0] || 'general';

    const currentAddr: NormalizedAddress = selectedAddress || {
      id: '4a7b5d2e-1c3f-4e5a-8b9d-0f1e2d3c4b5a',
      label: 'Home',
      street: 'D-Ground, Peoples Colony No. 1',
      city: 'Faisalabad',
      latitude: 31.4187,
      longitude: 73.0791,
      is_default: true,
    };

    const addressText = `${currentAddr.street || 'D-Ground'}${currentAddr.city ? `, ${currentAddr.city}` : ', Faisalabad'}`;

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let resolvedAddressId = '4a7b5d2e-1c3f-4e5a-8b9d-0f1e2d3c4b5a';

    if (currentAddr.id && UUID_REGEX.test(currentAddr.id)) {
      resolvedAddressId = currentAddr.id;
    } else if (currentAddr) {
      try {
        const createdAddr = await userApi.createAddress({
          label: currentAddr.label || 'Home',
          address_line: currentAddr.street || 'Faisalabad, Pakistan',
          city: currentAddr.city || 'Faisalabad',
          country: 'Pakistan',
          lat: currentAddr.latitude || 31.4187,
          lng: currentAddr.longitude || 73.0791,
          is_default: true,
        });
        if (createdAddr?.id && UUID_REGEX.test(createdAddr.id)) {
          resolvedAddressId = createdAddr.id;
        }
      } catch (_err) {
        // Fallback to canonical UUID
      }
    }

    // Media payload formatted cleanly
    const formattedMedia: CustomServiceRequestMediaInput[] = slots
      .filter((s) => s.status === 'success' && s.uploadedUrl && s.cloudinaryPublicId)
      .map((s) => {
        const item: CustomServiceRequestMediaInput = {
          media_type: s.mediaType,
          media_url: s.uploadedUrl!,
          cloudinary_public_id: s.cloudinaryPublicId!,
        };
        if (typeof s.fileSizeBytes === 'number') {
          item.file_size_bytes = s.fileSizeBytes;
        }
        return item;
      });

    const payload: CreateCustomRequestDto = {
      worker_id: workerId,
      ...(providerTypeHint({ openedFromAgencyProfile, profileProviderType: worker?.provider_type })
        ? { provider_type: 'COMPANY' as const }
        : {}),
      category_id: categoryId,
      title: title.trim(),
      description: description.trim(),
      address_id: resolvedAddressId,
      address_text: addressText,
      latitude: currentAddr.latitude || 31.4187,
      longitude: currentAddr.longitude || 73.0791,
    };

    const prefDate = computePreferredDate();
    if (prefDate) {
      payload.preferred_date = prefDate;
    }

    if (preferredTimeSlot !== 'Any time') {
      payload.preferred_time_slot = preferredTimeSlot;
    }

    if (formattedMedia.length > 0) {
      payload.media = formattedMedia;
    }

    createMutation.mutate(payload);
  };

  // Check if ratings are meaningful (avoid "0.0 (0 reviews)")
  const hasMeaningfulReviews = Boolean(
    worker && (worker.totalReviews ?? 0) > 0 && (worker.avgRating ?? 0) > 0
  );

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const items: Array<{
      dayNumber: number;
      dateStr: string;
      isPast: boolean;
      isToday: boolean;
      isSelected: boolean;
    } | null> = [];

    // Empty lead spaces
    for (let i = 0; i < firstDayIndex; i++) {
      items.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calendarYear, calendarMonth, d);
      dateObj.setHours(0, 0, 0, 0);

      const m = String(calendarMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${calendarYear}-${m}-${dayStr}`;

      const isPast = dateObj.getTime() < today.getTime();
      const isToday = dateObj.getTime() === today.getTime();
      const isSelected = customDate === dateStr;

      items.push({
        dayNumber: d,
        dateStr,
        isPast,
        isToday,
        isSelected,
      });
    }

    return items;
  }, [calendarYear, calendarMonth, customDate]);

  const canGoPrevMonth = useMemo(() => {
    const today = new Date();
    return (
      calendarYear > today.getFullYear() ||
      (calendarYear === today.getFullYear() && calendarMonth > today.getMonth())
    );
  }, [calendarYear, calendarMonth]);

  const canGoNextMonth = useMemo(() => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2); // Allow up to 2 months ahead
    return (
      calendarYear < maxDate.getFullYear() ||
      (calendarYear === maxDate.getFullYear() && calendarMonth < maxDate.getMonth())
    );
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    setCustomDate(dateStr);
    setPreferredDateOption('custom');
    setDatePickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* 1. Compact Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={handleNavBack}
          style={styles.navBackButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={palette.gray900} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>Request a Quote</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step} of 2</Text>
        </View>

        {/* Minimal 2-segment progress line */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: step === 1 ? '50%' : '100%' },
            ]}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ========================================================================= */}
        {/* SCREEN 1: Describe Your Problem                                           */}
        {/* ========================================================================= */}
        {step === 1 && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 90 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 2. Professional Summary (Compact horizontal row) */}
            {isWorkerLoading ? (
              <View style={styles.proRow}>
                <SkeletonGroup style={styles.proSkeleton} accessibilityLabel="Loading professional">
                  <SkeletonCircle size={52} />
                  <View style={styles.proMeta}>
                    <SkeletonText fontSize={14} lineHeight={20} width="55%" />
                    <SkeletonText fontSize={12} lineHeight={16} width="42%" style={styles.proSkeletonSub} />
                  </View>
                </SkeletonGroup>
              </View>
            ) : worker ? (
              <View style={styles.proRow}>
                <WorkerAvatar
                  uri={worker.avatarUrl || (worker as any)?.avatar || (worker as any)?.avatar_url}
                  name={providerDisplayName || worker.name}
                  size={52}
                />
                <View style={styles.proMeta}>
                  <View style={styles.proNameLine}>
                    <Text style={styles.proName} numberOfLines={1}>
                      {providerDisplayName || worker.name}
                    </Text>
                    {isAgency && (
                      <View style={styles.verifiedTag}>
                        <Text style={styles.verifiedTagText}>Agency</Text>
                      </View>
                    )}
                    {worker.isVerified && (
                      <View style={styles.verifiedTag}>
                        <ShieldCheck size={12} color={palette.green700} />
                        <Text style={styles.verifiedTagText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.proSubtext} numberOfLines={1}>
                    {worker.categories?.[0] || 'Home Services'} • {worker.city || 'Faisalabad'}
                  </Text>
                  {/* Rating displayed ONLY when meaningful reviews exist */}
                  {hasMeaningfulReviews && (
                    <View style={styles.proRatingRow}>
                      <Star size={12} color={palette.amber500} fill={palette.amber500} />
                      <Text style={styles.proRatingText}>
                        {worker.avgRating.toFixed(1)} ({worker.totalReviews})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {isAgency && worker ? (
              <Text style={styles.agencyNotice}>
                This request goes to {providerDisplayName || 'this agency'}. The agency reviews it, sends you a price,
                and assigns a technician once you accept.
              </Text>
            ) : null}

            {/* 3. Problem Title */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelHeader}>
                <Text style={styles.fieldLabel}>What do you need help with?</Text>
                {title.length > 50 && (
                  <Text style={styles.charCounter}>{title.length}/150</Text>
                )}
              </View>
              <TextInput
                style={[
                  styles.inputBase,
                  focusedField === 'title' && styles.inputFocused,
                  Boolean(validationErrors.title) && styles.inputError,
                ]}
                placeholder="e.g. Circuit breaker keeps tripping"
                placeholderTextColor={palette.gray400}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (validationErrors.title) {
                    setValidationErrors((prev) => ({ ...prev, title: '' }));
                  }
                }}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
                maxLength={150}
                returnKeyType="next"
              />
              {validationErrors.title ? (
                <View style={styles.inlineErrorRow}>
                  <AlertCircle size={13} color={palette.red500} />
                  <Text style={styles.inlineErrorText}>{validationErrors.title}</Text>
                </View>
              ) : null}
            </View>

            {/* 4. Detailed Description */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelHeader}>
                <Text style={styles.fieldLabel}>Describe the issue</Text>
                {description.length > 200 && (
                  <Text style={styles.charCounter}>{description.length}/3000</Text>
                )}
              </View>
              <TextInput
                style={[
                  styles.textAreaBase,
                  focusedField === 'description' && styles.inputFocused,
                  Boolean(validationErrors.description) && styles.inputError,
                ]}
                placeholder="Tell us what's happening and when it started..."
                placeholderTextColor={palette.gray400}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (validationErrors.description) {
                    setValidationErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
                maxLength={3000}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {validationErrors.description ? (
                <View style={styles.inlineErrorRow}>
                  <AlertCircle size={13} color={palette.red500} />
                  <Text style={styles.inlineErrorText}>{validationErrors.description}</Text>
                </View>
              ) : null}
            </View>

            {/* 5. Optional Media Attachment */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelHeader}>
                <Text style={styles.fieldLabel}>Add photos or video (optional)</Text>
                {totalCount > 0 && (
                  <Text style={styles.charCounter}>
                    {totalCount}/{maxCount}
                  </Text>
                )}
              </View>

              {/* When no media attached: compact Add Media trigger */}
              {totalCount === 0 ? (
                <TouchableOpacity
                  style={styles.compactAddMediaButton}
                  onPress={() => setMediaPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <UploadCloud size={18} color={palette.green600} />
                  <Text style={styles.compactAddMediaText}>Add media</Text>
                </TouchableOpacity>
              ) : (
                /* Thumbnails list with inline remove & compact add button */
                <View style={styles.mediaRow}>
                  {slots.map((slot) => (
                    <View key={slot.id} style={styles.mediaThumbWrap}>
                      <Image
                        source={{ uri: slot.localUri }}
                        style={styles.mediaThumbImage}
                        contentFit="cover"
                      />

                      {slot.mediaType === 'VIDEO' && slot.status !== 'uploading' && (
                        <View style={styles.mediaVideoBadge}>
                          <VideoIcon size={10} color={palette.pureWhite} />
                        </View>
                      )}

                      {slot.status === 'success' && (
                        <View style={styles.mediaSuccessBadge}>
                          <Check size={10} color={palette.pureWhite} strokeWidth={3} />
                        </View>
                      )}

                      {slot.status === 'uploading' && (
                        <View style={styles.mediaUploadingOverlay}>
                          <ActivityIndicator size="small" color={palette.pureWhite} />
                          <Text style={styles.mediaProgressText}>{slot.progress}%</Text>
                        </View>
                      )}

                      {slot.status === 'error' && (
                        <TouchableOpacity
                          style={styles.mediaErrorOverlay}
                          onPress={() => retrySlot(slot.id)}
                        >
                          <AlertCircle size={16} color={palette.pureWhite} />
                          <Text style={styles.mediaRetryText}>Retry</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.mediaRemoveBtn}
                        onPress={() => removeSlot(slot.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Remove media"
                      >
                        <X size={12} color={palette.pureWhite} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {totalCount < maxCount && (
                    <TouchableOpacity
                      style={styles.mediaInlineAddTile}
                      onPress={() => setMediaPickerVisible(true)}
                      disabled={isUploadingAny}
                      activeOpacity={0.7}
                    >
                      <Plus size={18} color={palette.green600} />
                      <Text style={styles.mediaInlineAddText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {validationErrors.media || firstErrorMessage ? (
                <View style={styles.inlineErrorRow}>
                  <AlertCircle size={13} color={palette.red500} />
                  <Text style={styles.inlineErrorText}>
                    {validationErrors.media || firstErrorMessage}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: Location & Availability                                         */}
        {/* ========================================================================= */}
        {step === 2 && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 2. Service Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Service address</Text>

              <View style={styles.addressRow}>
                <View style={styles.addressPinWrap}>
                  <MapPin size={18} color={palette.green600} />
                </View>

                <View style={styles.addressTextColumn}>
                  {selectedAddress ? (
                    <>
                      <Text style={styles.addressLabelText} numberOfLines={1}>
                        {selectedAddress.label || 'Home'}
                      </Text>
                      <Text style={styles.addressDetailText} numberOfLines={2}>
                        {selectedAddress.street}
                        {selectedAddress.city ? `, ${selectedAddress.city}` : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.addressPlaceholderText}>
                      Select service address
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.changeAddressAction}
                  onPress={() => {
                    if (addresses.length > 0) {
                      setAddressPickerVisible(true);
                    } else {
                      addAddressSheetRef.current?.open();
                    }
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.changeAddressText}>Change</Text>
                </TouchableOpacity>
              </View>

              {validationErrors.address ? (
                <View style={styles.inlineErrorRow}>
                  <AlertCircle size={13} color={palette.red500} />
                  <Text style={styles.inlineErrorText}>{validationErrors.address}</Text>
                </View>
              ) : null}
            </View>

            {/* 3. Preferred Date (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>When do you need the service?</Text>

              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    preferredDateOption === 'flexible' && styles.chipSelected,
                  ]}
                  onPress={() => setPreferredDateOption('flexible')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      preferredDateOption === 'flexible' && styles.chipTextSelected,
                    ]}
                  >
                    Flexible
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    preferredDateOption === 'today' && styles.chipSelected,
                  ]}
                  onPress={() => setPreferredDateOption('today')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      preferredDateOption === 'today' && styles.chipTextSelected,
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    preferredDateOption === 'tomorrow' && styles.chipSelected,
                  ]}
                  onPress={() => setPreferredDateOption('tomorrow')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      preferredDateOption === 'tomorrow' && styles.chipTextSelected,
                    ]}
                  >
                    Tomorrow
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    preferredDateOption === 'custom' && styles.chipSelected,
                  ]}
                  onPress={() => setDatePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Calendar
                    size={14}
                    color={
                      preferredDateOption === 'custom'
                        ? palette.green700
                        : palette.gray600
                    }
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      preferredDateOption === 'custom' && styles.chipTextSelected,
                    ]}
                  >
                    {preferredDateOption === 'custom'
                      ? formattedCustomDateChip
                      : 'Choose date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Preferred Time (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Preferred time</Text>

              <View style={styles.chipsGrid}>
                {TIME_SLOT_OPTIONS.map((slot) => {
                  const isSelected = preferredTimeSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeSlotChip,
                        isSelected && styles.timeSlotChipSelected,
                      ]}
                      onPress={() => setPreferredTimeSlot(slot)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Reassurance notice banner */}
            <View style={styles.noticeRow}>
              <ShieldCheck size={16} color={palette.green600} />
              <Text style={styles.noticeText}>
                The professional will review your request and send an itemized quote before confirming.
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* 6. Fixed Bottom Action */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
        ]}
      >
        {step === 1 ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinueToStep2}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (createMutation.isPending || isUploadingAny) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={createMutation.isPending || isUploadingAny}
            activeOpacity={0.85}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color={palette.pureWhite} />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Media Picker Bottom Modal */}
      <Modal
        visible={mediaPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMediaPickerVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMediaPickerVisible(false)}
        >
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Photos or Video</Text>

            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                setMediaPickerVisible(false);
                pickFromCamera();
              }}
            >
              <View style={styles.sheetIconBox}>
                <Camera size={18} color={palette.green600} />
              </View>
              <View style={styles.sheetOptionTextColumn}>
                <Text style={styles.sheetOptionTitle}>Take photo</Text>
                <Text style={styles.sheetOptionSubtitle}>Capture with camera</Text>
              </View>
              <ChevronRight size={18} color={palette.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                setMediaPickerVisible(false);
                pickFromGallery();
              }}
            >
              <View style={styles.sheetIconBox}>
                <ImageIcon size={18} color={palette.green600} />
              </View>
              <View style={styles.sheetOptionTextColumn}>
                <Text style={styles.sheetOptionTitle}>Choose from gallery</Text>
                <Text style={styles.sheetOptionSubtitle}>Upload images or short clip</Text>
              </View>
              <ChevronRight size={18} color={palette.gray400} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancelButton}
              onPress={() => setMediaPickerVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Address Selection Modal */}
      <Modal
        visible={addressPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressPickerVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddressPickerVisible(false)}
        >
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Select Address</Text>
              <TouchableOpacity
                onPress={() => setAddressPickerVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={palette.gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {addresses.map((addr) => {
                const isCurrent = selectedAddress?.id === addr.id;
                const street = (addr as any).address_line || (addr as any).street || '';
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressItemRow,
                      isCurrent && styles.addressItemRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedAddress({
                        id: addr.id,
                        label: addr.label || 'Home',
                        street,
                        city: addr.city || 'Faisalabad',
                        latitude: (addr as any).lat ?? (addr as any).latitude ?? 31.4187,
                        longitude: (addr as any).lng ?? (addr as any).longitude ?? 73.0791,
                        is_default: Boolean(addr.is_default),
                      });
                      if (validationErrors.address) {
                        setValidationErrors((prev) => ({ ...prev, address: '' }));
                      }
                      setAddressPickerVisible(false);
                    }}
                  >
                    <MapPin
                      size={18}
                      color={isCurrent ? palette.green600 : palette.gray500}
                    />
                    <View style={styles.addressItemTextWrap}>
                      <Text style={styles.addressItemLabel}>{addr.label || 'Home'}</Text>
                      <Text style={styles.addressItemStreet} numberOfLines={1}>
                        {street}
                      </Text>
                    </View>
                    {isCurrent && <Check size={18} color={palette.green600} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetAddNewAddressRow}
              onPress={() => {
                setAddressPickerVisible(false);
                addAddressSheetRef.current?.open();
              }}
            >
              <Plus size={16} color={palette.green600} />
              <Text style={styles.sheetAddNewAddressText}>Add new address</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Native-feeling Calendar Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDatePickerVisible(false)}
        >
          <View
            style={[
              styles.calendarModalContent,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 },
            ]}
          >
            {/* Calendar Month Header */}
            <View style={styles.calendarHeaderRow}>
              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>
              <View style={styles.calendarNavButtons}>
                <TouchableOpacity
                  style={[
                    styles.calendarNavArrow,
                    !canGoPrevMonth && styles.calendarNavArrowDisabled,
                  ]}
                  onPress={handlePrevMonth}
                  disabled={!canGoPrevMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft
                    size={20}
                    color={canGoPrevMonth ? palette.gray800 : palette.gray300}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.calendarNavArrow,
                    !canGoNextMonth && styles.calendarNavArrowDisabled,
                  ]}
                  onPress={handleNextMonth}
                  disabled={!canGoNextMonth}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronRight
                    size={20}
                    color={canGoNextMonth ? palette.gray800 : palette.gray300}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekdays Row */}
            <View style={styles.calendarWeekdaysRow}>
              {WEEKDAY_NAMES.map((name) => (
                <Text key={name} style={styles.calendarWeekdayText}>
                  {name}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarDaysGrid}>
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <View key={`empty-${idx}`} style={styles.calendarDayCellEmpty} />;
                }

                return (
                  <TouchableOpacity
                    key={cell.dateStr}
                    style={[
                      styles.calendarDayCell,
                      cell.isSelected && styles.calendarDayCellSelected,
                      cell.isToday && !cell.isSelected && styles.calendarDayCellToday,
                    ]}
                    onPress={() => !cell.isPast && handleSelectDay(cell.dateStr)}
                    disabled={cell.isPast}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        cell.isPast && styles.calendarDayTextDisabled,
                        cell.isSelected && styles.calendarDayTextSelected,
                        cell.isToday && !cell.isSelected && styles.calendarDayTextToday,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.calendarCloseButton}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={styles.calendarCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Add Address Bottom Sheet */}
      <AddAddressBottomSheet
        ref={addAddressSheetRef}
        onAddressCreated={(newAddr) => {
          setSelectedAddress({
            id: newAddr.id,
            label: newAddr.label || 'Home',
            street: newAddr.street,
            city: newAddr.city || 'Faisalabad',
            latitude: newAddr.latitude || 31.4187,
            longitude: newAddr.longitude || 73.0791,
            is_default: false,
          });
          if (validationErrors.address) {
            setValidationErrors((prev) => ({ ...prev, address: '' }));
          }
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.white,
  },
  keyboardContainer: {
    flex: 1,
  },

  // 1. Compact Top Navigation Bar
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: palette.white,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  navBackButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCenter: {
    flex: 1,
    marginLeft: 8,
  },
  navTitle: {
    fontFamily: fontFamily.poppins.semiBold || 'Poppins-SemiBold',
    fontSize: 17,
    color: palette.gray900,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: palette.gray100,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: palette.gray600,
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: palette.gray100,
  },
  progressBarFill: {
    height: 2,
    backgroundColor: palette.green600,
  },

  // Scroll Body
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // 2. Professional Summary (Screen 1)
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: palette.gray50,
    borderWidth: 1,
    borderColor: palette.gray200,
    marginBottom: 20,
  },
  proSkeleton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  proSkeletonSub: {
    marginTop: 1,
  },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gray200,
  },
  proMeta: {
    flex: 1,
    marginLeft: 12,
  },
  proNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proName: {
    fontFamily: fontFamily.poppins.semiBold || 'Poppins-SemiBold',
    fontSize: 14,
    color: palette.gray900,
    flexShrink: 1,
    marginRight: 6,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.green50,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 10,
    color: palette.green700,
    marginLeft: 2,
  },
  proSubtext: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
    marginTop: 1,
  },
  agencyNotice: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: palette.gray500,
    marginTop: 12,
  },
  proRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  proRatingText: {
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: palette.gray700,
    marginLeft: 3,
  },

  // Field Groups & Typography
  fieldGroup: {
    marginBottom: 20,
  },
  labelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray900,
    marginBottom: 8,
  },
  charCounter: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: palette.gray400,
  },

  // Refined Native Inputs (White, subtle border, no heavy grey)
  inputBase: {
    height: 48,
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingHorizontal: 14,
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: palette.gray900,
  },
  textAreaBase: {
    minHeight: 108,
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gray200,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: palette.gray900,
    lineHeight: 22,
  },
  inputFocused: {
    backgroundColor: palette.white,
    borderColor: palette.green600,
  },
  inputError: {
    borderColor: palette.red500,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  inlineErrorText: {
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: palette.red500,
    marginLeft: 4,
    flex: 1,
  },

  // Media Attachment (Screen 1)
  compactAddMediaButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAddMediaText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.green600,
    marginLeft: 6,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaThumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: palette.gray100,
  },
  mediaThumbImage: {
    width: '100%',
    height: '100%',
  },
  mediaUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaProgressText: {
    color: palette.pureWhite,
    fontSize: 10,
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
  mediaErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaRetryText: {
    color: palette.pureWhite,
    fontSize: 10,
    fontFamily: fontFamily.jakarta.bold || 'PlusJakartaSans-Bold',
    marginTop: 2,
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaVideoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaSuccessBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: palette.green600,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaInlineAddTile: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaInlineAddText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: palette.green600,
    marginTop: 2,
  },

  // Service Address Row (Screen 2)
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
  },
  addressPinWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.green50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressTextColumn: {
    flex: 1,
  },
  addressLabelText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray900,
  },
  addressDetailText: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
    marginTop: 2,
  },
  addressPlaceholderText: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray400,
  },
  changeAddressAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  changeAddressText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.green600,
  },

  // Selectable Chips (Date & Time)
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  chipSelected: {
    backgroundColor: palette.green50,
    borderColor: palette.green600,
  },
  chipText: {
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.gray600,
  },
  chipTextSelected: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    color: palette.green700,
  },

  // Preferred Time Slots (Compact 2x2 grid)
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotChip: {
    width: '48.5%',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotChipSelected: {
    backgroundColor: palette.green50,
    borderColor: palette.green600,
  },
  timeSlotText: {
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: palette.gray700,
  },
  timeSlotTextSelected: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    color: palette.green700,
  },

  // Reassurance notice banner
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: palette.gray50,
    marginTop: 4,
    marginBottom: 10,
  },
  noticeText: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray600,
    marginLeft: 8,
    flex: 1,
    lineHeight: 17,
  },

  // Fixed Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryButton: {
    height: 50,
    backgroundColor: palette.green600,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: fontFamily.jakarta.bold || 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: palette.pureWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Modals & Bottom Sheets
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.bottomSheetBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gray300,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: fontFamily.poppins.semiBold || 'Poppins-SemiBold',
    fontSize: 16,
    color: palette.gray900,
    marginBottom: 14,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  sheetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.green50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetOptionTextColumn: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray900,
  },
  sheetOptionSubtitle: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
    marginTop: 1,
  },
  sheetCancelButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: palette.gray100,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray700,
  },

  // Address Sheet Item Rows
  addressItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  addressItemRowSelected: {
    backgroundColor: palette.green50,
  },
  addressItemTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  addressItemLabel: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.gray900,
  },
  addressItemStreet: {
    fontFamily: fontFamily.jakarta.regular || 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
    marginTop: 1,
  },
  sheetAddNewAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  sheetAddNewAddressText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.green600,
    marginLeft: 6,
  },

  // Native-feeling Calendar Dialog
  calendarModalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthTitle: {
    fontFamily: fontFamily.poppins.semiBold || 'Poppins-SemiBold',
    fontSize: 16,
    color: palette.gray900,
  },
  calendarNavButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarNavArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavArrowDisabled: {
    opacity: 0.35,
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekdayText: {
    width: 38,
    textAlign: 'center',
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: palette.gray400,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 2,
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  calendarDayCellSelected: {
    backgroundColor: palette.green600,
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: palette.green600,
  },
  calendarDayText: {
    fontFamily: fontFamily.jakarta.medium || 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: palette.gray900,
  },
  calendarDayTextDisabled: {
    color: palette.gray300,
  },
  calendarDayTextSelected: {
    color: palette.pureWhite,
    fontFamily: fontFamily.jakarta.bold || 'PlusJakartaSans-Bold',
  },
  calendarDayTextToday: {
    color: palette.green700,
    fontFamily: fontFamily.jakarta.bold || 'PlusJakartaSans-Bold',
  },
  calendarCloseButton: {
    marginTop: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: palette.gray100,
    alignItems: 'center',
  },
  calendarCloseText: {
    fontFamily: fontFamily.jakarta.semiBold || 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray700,
  },
});
