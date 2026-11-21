import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, TextInput, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeftIcon,
  CashIcon,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DocumentIcon,
  ExternalLinkIcon,
  LocationIcon,
  PhoneIcon,
  RefreshIcon,
  StarIcon,
} from '../../src/components/ui/Icon/icons';
import { Image as ExpoImage } from 'expo-image';

import { useBookingDetails } from '../../src/hooks/useBookingDetails';
import { useBookingTrack } from '../../src/hooks/useBookingTrack';
import { useWorkerProfile } from '../../src/hooks/useWorkerProfile';
import { useCategories } from '../../src/hooks/useCategories';
import { useCartStore } from '../../src/store/cart.store';
import { useConfirmCompletion } from '../../src/hooks/useConfirmCompletion';
import { useBookingDispute } from '../../src/hooks/useBookingDispute';
import { BookingCancelModal } from '../../src/components/booking/BookingCancelModal';
import { BookingDisputeCard } from '../../src/components/booking/BookingDisputeCard';
import { BookingCountdown } from '../../src/components/booking/BookingCountdown';
import { BookingVerificationSection } from '../../src/components/booking/BookingVerificationSection';
import { DispatchedTechnicianCard } from '../../src/components/booking/DispatchedTechnicianCard';
import { WorkerProfileLink } from '../../src/components/worker/WorkerProfileLink';
import { TechnicianReassignedBanner } from '../../src/components/booking/TechnicianReassignedBanner';
import { useBookingRealtimeUpdates } from '../../src/hooks/useBookingRealtimeUpdates';
import { CustomRefreshControl } from '../../src/components/feedback/CustomRefreshControl';
import { ErrorState } from '../../src/components/feedback/ErrorState';
import { BookingStatus } from '../../src/types/booking.types';
import { BookingReviewPrompt } from '../../src/components/review';
import { formatCategoryName } from '../../src/utils/formatters';
import { CANONICAL_FALLBACK_UUIDS } from '../../src/utils/uuid';
import { isGenericWorkerName } from '../../src/services/api/booking.api';
import { PriceSummaryRows } from '../../src/components/booking/BookingPriceSummary';
import { DiscountSummaryRow } from '../../src/components/offers/DiscountSummaryRow';
import { bookingItemDiscount, buildPriceSummaryRows, getBookingSavings } from '../../src/utils/offers';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';
import { showAlert } from '../../src/components/feedback/AppAlert';
import { AppDialog } from '../../src/components/feedback/AppDialog';
const WORKER_AVATAR_SIZE = 48;

// 4 simple milestone steps like Uber / Foodpanda
const TRACK_STEPS = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'ACCEPTED', label: 'Confirmed' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function BookingDetailsScreen() {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Data fetching
  const { booking, isLoading, isRefetching, error, refetch } = useBookingDetails(id);
  const { trackData } = useBookingTrack(id, Boolean(booking));

  // Mutations
  const { confirmCompletion, isLoading: isConfirming } = useConfirmCompletion();
  const { dispute, openDispute, isSubmittingDispute } = useBookingDispute(id);

  // Scalable Dispute Resolution: Strictly real dispute record from API query or booking.dispute
  const activeDispute = dispute || booking?.dispute || null;

  // UI state
  const cartWorker = useCartStore((s) => s.worker);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const confirmInFlight = useRef(false);
  const [copied, setCopied] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [reassignedAlert, setReassignedAlert] = useState<{
    newName: string;
    reason?: string | null | undefined;
  } | null>(null);

  // Always pull the latest backend state when the screen regains focus
  // (e.g. arriving from a push notification or returning from another screen).
  useFocusEffect(
    useCallback(() => {
      // cancelRefetch: false joins a fetch already in flight (e.g. the initial load) instead of
      // cancelling and restarting it, which doubled the first load time.
      if (id) refetch({ cancelRefetch: false });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  useBookingRealtimeUpdates({
    bookingId: id,
    onReassigned: (data) => {
      setReassignedAlert({ newName: data.newWorkerName, reason: data.reason });
    },
  });

  // Scalable Worker Identity Resolution (called unconditionally before early returns)
  const effectiveWorkerId =
    booking?.worker_id ||
    trackData?.worker_id ||
    (cartWorker?.id && cartWorker.id !== CANONICAL_FALLBACK_UUIDS.WORKER_DEFAULT ? cartWorker.id : '');

  // Asynchronously query & reactively subscribe to worker public profile
  const { worker: workerProfile } = useWorkerProfile(effectiveWorkerId);

  // Category catalog (cached for an hour) maps a booking's category id to its display name.
  const { categories } = useCategories();

  // Copy Reference ID
  const handleCopyId = async () => {
    if (booking?.id) {
      await Clipboard.setStringAsync(booking.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedStatusBar />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedStatusBar />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeftIcon size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking Details</Text>
            <View style={{ width: 40 }} />
          </View>
          <ErrorState
            type="error"
            title="Booking Not Found"
            subtitle={error?.message || "Couldn't load booking details. Please try again."}
            onRetry={refetch}
            retryButtonText="Retry"
            style={{ flex: 1, justifyContent: 'center' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // booking-details is the authoritative, socket-invalidated source. The track query is
  // disabled with an infinite staleTime, so letting it win could pin a stale status
  // (e.g. IN_PROGRESS) and hide the completion CTA.
  const currentStatus: BookingStatus = booking.status || trackData?.status;
  const needsCustomerConfirmation = currentStatus === 'COMPLETED_BY_WORKER';
  const isTerminal = ['CANCELLED', 'REJECTED', 'DISPUTED'].includes(currentStatus);

  // Helper to detect generic placeholder names
  const isGeneric = (name?: string | null) => isGenericWorkerName(name);

  // Scalable worker name resolution
  const displayWorkerName =
    (workerProfile?.name && !isGeneric(workerProfile.name) ? workerProfile.name : null) ||
    (booking?.worker_name && !isGeneric(booking.worker_name) ? booking.worker_name : null) ||
    (trackData?.worker_name && !isGeneric(trackData.worker_name) ? trackData.worker_name : null) ||
    (cartWorker?.id === effectiveWorkerId && cartWorker?.name && !isGeneric(cartWorker.name) ? cartWorker.name : null) ||
    (booking?.worker_name ? booking.worker_name : null) ||
    (workerProfile?.name ? workerProfile.name : null) ||
    null;

  // Scalable avatar resolution (Cloudinary CDN or uploaded photo)
  const displayWorkerAvatar =
    workerProfile?.avatarUrl ||
    booking?.worker_avatar_url ||
    (cartWorker?.id === effectiveWorkerId ? cartWorker?.avatarUrl : null) ||
    null;

  // Scalable category resolution
  const displayCategory =
    booking?.category_name ||
    (workerProfile as any)?.category ||
    workerProfile?.categories?.[0] ||
    (cartWorker?.id === effectiveWorkerId ? cartWorker?.category : null) ||
    (booking?.category_id ? formatCategoryName(booking.category_id, 'Service', 'title') : 'Service Worker');

  // Booked service: strictly this booking's own data (stored cart snapshot, then the server-resolved
  // service name). Never the worker's catalog or profile category.
  // Always a category NAME: when the server only echoes the raw id back, use the catalog name instead.
  const bookingCategoryId = booking.category_id && booking.category_id !== 'service' ? booking.category_id : null;
  const serverCategoryName = booking.category_name?.trim() || null;
  const serverSentRawId = Boolean(
    serverCategoryName && bookingCategoryId && serverCategoryName.toLowerCase() === bookingCategoryId.toLowerCase()
  );
  const catalogCategoryName = bookingCategoryId
    ? categories.find((c) => c.id.toLowerCase() === bookingCategoryId.toLowerCase())?.name?.trim() || null
    : null;
  const bookedCategory =
    (serverCategoryName && !serverSentRawId ? serverCategoryName : null) ||
    catalogCategoryName ||
    (bookingCategoryId ? formatCategoryName(bookingCategoryId.replace(/-/g, ' '), 'Service', 'title') : null);
  const bookedSnapshotLines = (booking.items ?? []).filter((line) => line.name.trim().length > 0);
  const bookedServices: { key: string; name: string; quantity: number }[] =
    bookedSnapshotLines.length > 0
      ? bookedSnapshotLines.map((line, idx) => ({
          key: `${line.service_id}-${idx}`,
          name: line.name.trim(),
          quantity: line.quantity,
        }))
      : booking.service_name?.trim()
        ? [{ key: 'service', name: booking.service_name.trim(), quantity: 1 }]
        : [];

  // Original custom-request text from the server (custom_service_requests.description via custom_request_id).
  const customRequestDescription = booking.custom_request_id
    ? booking.custom_request_description?.trim() || null
    : null;

  const isCompanyBooking = Boolean(
    booking.is_company ||
    booking.provider_type === 'COMPANY' ||
    workerProfile?.is_company ||
    workerProfile?.provider_type === 'COMPANY'
  );

  const agencyName =
    booking.provider_name ||
    (booking as any).business_name ||
    (booking as any).businessName ||
    workerProfile?.business_name ||
    (workerProfile as any)?.businessName ||
    (isCompanyBooking ? (displayWorkerName || 'Service Agency') : null);

  // Scalable Field Technician Resolution for Company Bookings
  // In a Company Booking, the field technician MUST be the specific assignee dispatched by the company.
  // It MUST NEVER fall back to the agency manager / account owner (e.g. Muhammad Uzair).
  const candidateAssigneeName =
    booking.assigned_worker_name ||
    (booking as any).assignedWorkerName ||
    (booking as any).assignee?.name ||
    (booking as any).assignee?.full_name ||
    (booking as any).assigned_worker?.name ||
    (booking as any).assigned_worker?.full_name ||
    (booking as any).assignedWorker?.name ||
    (booking as any).assignee_name ||
    (booking as any).technician?.name ||
    (booking as any).assigned_technician?.name ||
    (reassignedAlert?.newName ? reassignedAlert.newName : null) ||
    null;

  const assignedTechnicianName =
    candidateAssigneeName && !isGeneric(candidateAssigneeName)
      ? candidateAssigneeName
      : null;

  const assignedTechnicianPhone =
    booking.assigned_worker_phone ||
    (booking as any).assignedWorkerPhone ||
    (booking as any).assignee?.phone ||
    (booking as any).assignee?.phone_number ||
    (booking as any).assigned_worker?.phone ||
    (booking as any).assigned_worker?.phone_number ||
    (booking as any).assignedWorker?.phone ||
    (booking as any).assignee_phone ||
    (booking as any).technician?.phone ||
    (booking as any).assigned_technician?.phone ||
    null;

  const assignedTechnicianPhoto =
    (booking as any).assigned_worker_avatar ||
    (booking as any).assigned_worker_avatar_url ||
    (booking as any).assignee?.avatar_url ||
    (booking as any).assignee?.avatar ||
    (booking as any).assigned_worker?.avatar_url ||
    (booking as any).assignedWorker?.avatar_url ||
    null;

  // Scalable phone resolution
  const displayPhone =
    booking?.worker_phone ||
    trackData?.worker_phone ||
    (workerProfile as any)?.phone ||
    (workerProfile as any)?.phone_number ||
    (workerProfile as any)?.phoneNumber ||
    null;

  // Rating & review count
  const displayRating =
    (typeof workerProfile?.avgRating === 'number' && workerProfile.avgRating > 0 ? workerProfile.avgRating : null) ||
    (typeof cartWorker?.avgRating === 'number' && cartWorker.avgRating > 0 ? cartWorker.avgRating : null) ||
    5.0;
  const displayReviewCount =
    (typeof workerProfile?.totalReviews === 'number' && workerProfile.totalReviews > 0 ? workerProfile.totalReviews : null) ||
    null;

  // Two-letter initials helper
  const getInitials = (name?: string | null): string => {
    if (!name || isGeneric(name)) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const hasRealWorker = Boolean(
    (displayWorkerName && !isGeneric(displayWorkerName)) ||
    displayWorkerAvatar ||
    (effectiveWorkerId && effectiveWorkerId.length > 0 && effectiveWorkerId !== CANONICAL_FALLBACK_UUIDS.WORKER_DEFAULT)
  );

  const isProfessionalAssigned =
    currentStatus !== 'PENDING'
      ? Boolean(hasRealWorker || effectiveWorkerId || displayWorkerName)
      : Boolean(hasRealWorker || (displayWorkerName && !isGeneric(displayWorkerName)));

  // Determine active step index (0 to 3)
  let activeStepIndex = 0;
  if (currentStatus === 'ACCEPTED') activeStepIndex = 1;
  else if (currentStatus === 'IN_PROGRESS') activeStepIndex = 2;
  else if (currentStatus === 'COMPLETED_BY_WORKER') activeStepIndex = 2; // awaiting customer final confirmation
  else if (currentStatus === 'COMPLETED' || currentStatus === 'AUTO_COMPLETED' || currentStatus === 'RESOLVED') {
    activeStepIndex = 3;
  }

  // Confirm completion
  const handleConfirmJob = () => {
    if (isConfirming || confirmInFlight.current) return;
    showAlert(
      'Confirm completion',
      `Did the worker finish the job? Please confirm that you paid Rs. ${booking.estimated_total.toLocaleString()} in cash.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, job done and paid',
          onPress: async () => {
            if (confirmInFlight.current) return;
            confirmInFlight.current = true;
            try {
              await confirmCompletion(booking.id);
              // Status only flips once the refetched backend state says so.
              await refetch();
              showAlert('Booking completed', 'Thanks for using Tasklync.');
            } catch (err: any) {
              const errorMessage =
                err?.message ||
                err?.response?.data?.error?.message ||
                "Couldn't confirm completion. Please try again.";
              showAlert('Completion not confirmed', errorMessage);
              refetch();
            } finally {
              confirmInFlight.current = false;
            }
          },
        },
      ]
    );
  };

  // Dispute submission
  const handleOpenDispute = async () => {
    if (disputeReason.trim().length < 10) {
      showAlert('Add a few more details', 'Please describe the issue in at least 10 characters.');
      return;
    }
    try {
      const urls = evidenceUrl.trim() ? [evidenceUrl.trim()] : undefined;
      await openDispute({ id: booking.id, reason: disputeReason, evidenceUrls: urls });
      setDisputeModalVisible(false);
      setDisputeReason('');
      setEvidenceUrl('');
      showAlert('Report received', 'Our support team will contact you soon.');
      refetch();
    } catch (err: any) {
      showAlert("Couldn't submit report", err?.message || 'Please try again.');
    }
  };

  // Call worker
  const handleCall = () => {
    const phone = displayPhone || trackData?.worker_phone || booking?.worker_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        showAlert("Couldn't start the call", "This device can't open the phone dialer.");
      });
    } else {
      router.push({
        pathname: `/booking/${booking.id}/chat`,
        params: {
          workerName: displayWorkerName || booking?.worker_name || 'Service Worker',
          workerAvatar: displayWorkerAvatar || booking?.worker_avatar_url,
          workerPhone: phone,
          categoryName: displayCategory,
          workerId: effectiveWorkerId || booking?.worker_id,
        },
      } as any);
    }
  };

  // Open Maps
  const handleOpenMaps = () => {
    if (!booking.job_site_location) return;
    const { lat, lng } = booking.job_site_location;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {});
  };

  // Dynamic semantic badge configuration
  
  const hasBottomActions =
    currentStatus === 'COMPLETED_BY_WORKER' ||
    currentStatus === 'PENDING' ||
    currentStatus === 'ACCEPTED' ||
    currentStatus === 'COMPLETED' ||
    currentStatus === 'AUTO_COMPLETED' ||
    currentStatus === 'RESOLVED' ||
    currentStatus === 'DISPUTED';

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'PENDING':
        return {
          label: isCompanyBooking ? 'Pending Confirmation' : 'Pending',
          bg: colors.warningLight,
          text: colors.warningMedium,
          dot: colors.warning,
        };
      case 'ACCEPTED':
        return {
          label: isCompanyBooking ? 'Agency Confirmed' : 'Confirmed',
          bg: colors.primaryBorderSubtle,
          text: colors.textGreen,
          dot: colors.primaryDark,
        };
      case 'IN_PROGRESS':
        return {
          label: 'Service in progress',
          bg: colors.infoLight,
          text: colors.textInfo,
          dot: colors.info,
        };
      case 'COMPLETED_BY_WORKER':
        return {
          label: 'Action required',
          bg: colors.warningLight,
          text: colors.textWarningMedium,
          dot: colors.warning,
        };
      case 'COMPLETED':
      case 'AUTO_COMPLETED':
      case 'RESOLVED':
        return {
          label: 'Completed',
          bg: colors.primaryBorderSubtle,
          text: colors.textGreen,
          dot: colors.primaryDark,
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bg: colors.dangerLight,
          text: colors.dangerMedium,
          dot: colors.danger,
        };
      case 'REJECTED':
        return {
          label: 'Declined',
          bg: colors.dangerLight,
          text: colors.dangerMedium,
          dot: colors.danger,
        };
      case 'DISPUTED':
        return {
          label: 'Under review',
          bg: colors.dangerLight,
          text: palette.red700,
          dot: colors.dangerMedium,
        };
      default:
        return {
          label: 'Status updated',
          bg: colors.borderLight,
          text: colors.textSecondary,
          dot: palette.gray500,
        };
    }
  };

  // Headline & Subtitle based on status
  const getStatusText = () => {
    switch (currentStatus) {
      case 'PENDING':
        return {
          title: isCompanyBooking ? 'Waiting for the agency' : 'Finding your worker',
          subtitle: isCompanyBooking
            ? `${agencyName || 'The agency'} is checking your booking.`
            : 'We are finding a verified worker near you.',
        };
      case 'ACCEPTED':
        return {
          title: isCompanyBooking ? 'Agency accepted your booking' : 'Worker assigned',
          subtitle: isCompanyBooking
            ? `You will see the worker's details once ${agencyName || 'the agency'} sends someone.`
            : `${displayWorkerName || 'Worker'} confirmed your booking.`,
        };
      case 'IN_PROGRESS':
        return {
          title: 'Job in progress',
          subtitle: isCompanyBooking
            ? `The worker from ${agencyName || 'the agency'} is at your place.`
            : 'The worker is working on your job now.',
        };
      case 'COMPLETED_BY_WORKER':
        return {
          title: 'Work Marked Complete',
          subtitle: 'Please inspect the completed work and confirm to pay cash.',
        };
      case 'COMPLETED':
      case 'AUTO_COMPLETED':
      case 'RESOLVED':
        return {
          title: 'Booking Completed',
          subtitle: 'Thank you for choosing TaskLync.',
        };
      case 'CANCELLED':
        return {
          title: 'Booking Cancelled',
          subtitle: booking.cancellation_reason || 'This booking has been cancelled.',
        };
      case 'REJECTED':
        return {
          title: 'Booking Declined',
          subtitle: booking.cancellation_reason || 'The service agency was unable to accept this booking.',
        };
      case 'DISPUTED':
        return {
          title: 'Issue Reported',
          subtitle: 'Our customer support team is actively reviewing your case.',
        };
      default:
        return {
          title: 'Booking Status Updated',
          subtitle: 'Live details below.',
        };
    }
  };

  const statusBadge = getStatusBadge();
  const statusInfo = getStatusText();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedStatusBar />

      {/* 1. Top Lightweight Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <TouchableOpacity
            style={[styles.idButton, copied && styles.idButtonCopied]}
            onPress={handleCopyId}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Copy booking reference ID"
          >
            {copied ? (
              <View style={styles.copiedRow}>
                <CheckIcon size={10} color={colors.textGreen} strokeWidth={3} />
                <Text style={styles.idTextCopied}>Copied</Text>
              </View>
            ) : (
              <View style={styles.idRow}>
                <Text style={styles.idText}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
                <CopyIcon size={10} color={colors.textSecondary} style={{ marginLeft: 3 }} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => refetch()}
          disabled={isRefetching}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Refresh booking details"
        >
          {isRefetching ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <RefreshIcon size={18} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: hasBottomActions ? 32 : Math.max(insets.bottom, 16) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <CustomRefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {/* Live Technician Reassignment Slide-down Alert */}
          {reassignedAlert && (
            <TechnicianReassignedBanner
              newTechnicianName={reassignedAlert.newName}
              reason={reassignedAlert.reason}
              onDismiss={() => setReassignedAlert(null)}
            />
          )}

          {/* 2. Booking Status & Progress: one card, status first, tracker beneath */}
          <View style={styles.statusCard}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusBadge.dot }]} />
              <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
            <Text style={styles.statusTitle}>{statusInfo.title}</Text>
            <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>

            {/* Countdown timer if pending with expiration */}
            {currentStatus === 'PENDING' && booking.expires_at && (
              <BookingCountdown expiresAt={booking.expires_at} status={currentStatus} />
            )}

          {/* 3. Milestone Progress Stepper */}
          {!isTerminal && (
            <View style={styles.stepperWrap}>
              <View style={styles.stepperRow}>
                {TRACK_STEPS.map((step, idx) => {
                  const isCompletedStatus =
                    currentStatus === 'COMPLETED' ||
                    currentStatus === 'AUTO_COMPLETED' ||
                    currentStatus === 'RESOLVED';
                  const isDone = activeStepIndex > idx || isCompletedStatus;
                  const isCurrent = activeStepIndex === idx && !isDone;
                  const isLast = idx === TRACK_STEPS.length - 1;

                  return (
                    <View key={step.key} style={styles.stepColumn}>
                      <View style={styles.stepVisualContainer}>
                        {idx > 0 && (
                          <View
                            style={[
                              styles.connectorHalf,
                              styles.connectorLeft,
                              (activeStepIndex >= idx || isCompletedStatus) && styles.connectorActive,
                            ]}
                          />
                        )}
                        {!isLast && (
                          <View
                            style={[
                              styles.connectorHalf,
                              styles.connectorRight,
                              (activeStepIndex > idx || isCompletedStatus) && styles.connectorActive,
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.nodeCircle,
                            isDone && styles.nodeCircleDone,
                            isCurrent && styles.nodeCircleCurrent,
                          ]}
                        >
                          {isDone ? (
                            <CheckIcon size={11} color={colors.pureWhite} strokeWidth={3} />
                          ) : isCurrent ? (
                            <View style={styles.nodeCurrentInner} />
                          ) : (
                            <View style={styles.nodeUpcomingInner} />
                          )}
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.stepLabel,
                          isDone && styles.stepLabelDone,
                          isCurrent && styles.stepLabelCurrent,
                        ]}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          </View>

          {/* Post-Booking Review Prompt (if finished & eligible) */}
          <BookingReviewPrompt bookingId={booking.id} workerId={booking.worker_id} />

          {/* Contextual Job Start Verification: OTP & QR Code (Active when ACCEPTED) */}
          <BookingVerificationSection
            bookingId={booking.id}
            status={currentStatus}
          />

          {/* Booked Service: category is the supporting eyebrow, the service itself is the headline.
              Custom-request bookings also carry the customer's own words, kept apart from the worker's quote. */}
          {(bookedCategory || bookedServices.length > 0 || customRequestDescription) && (
            <View style={styles.card}>
              <Text style={styles.sectionHeading} numberOfLines={1}>
                {bookedCategory || (bookedServices.length > 1 ? 'Booked Services' : 'Booked Service')}
              </Text>

              {bookedServices.map((svc, idx) => (
                <View key={svc.key} style={[styles.serviceRow, idx > 0 && styles.serviceRowSpaced]}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {svc.name}
                  </Text>
                  {svc.quantity > 1 ? (
                    <View style={styles.serviceQtyPill}>
                      <Text style={styles.serviceQtyText}>×{svc.quantity}</Text>
                    </View>
                  ) : null}
                </View>
              ))}

              {customRequestDescription ? (
                <View style={[styles.customRequestBlock, bookedServices.length === 0 && styles.customRequestBlockFirst]}>
                  <Text style={styles.customRequestLabel}>Custom Service Request</Text>
                  <Text style={styles.customRequestText} selectable>
                    {customRequestDescription}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* 4. Company Dispatched Technician Card OR Individual Assigned Worker */}
          {isCompanyBooking ? (
            <DispatchedTechnicianCard
              companyName={agencyName}
              technicianName={assignedTechnicianName}
              technicianPhone={assignedTechnicianPhone}
              technicianPhoto={assignedTechnicianPhoto}
              bookingId={booking.id}
              onContactSupportOffice={() =>
                router.push({
                  pathname: `/booking/${booking.id}/chat`,
                  params: {
                    workerName: agencyName || 'Agency Support',
                    companyName: agencyName || undefined,
                    workerAvatar: booking.provider_avatar_url || displayWorkerAvatar,
                    workerPhone: displayPhone,
                    categoryName: displayCategory,
                    workerId: effectiveWorkerId,
                    isCompany: 'true',
                  },
                } as any)
              }
            />
          ) : (
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Assigned Worker</Text>
              </View>

              {isProfessionalAssigned ? (
                <View style={styles.workerRow}>
                  <WorkerProfileLink
                    workerId={effectiveWorkerId}
                    workerName={displayWorkerName}
                    size={WORKER_AVATAR_SIZE}
                  >
                    {displayWorkerAvatar && !avatarError ? (
                      <ExpoImage
                        source={{ uri: displayWorkerAvatar }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>
                          {getInitials(displayWorkerName)}
                        </Text>
                      </View>
                    )}
                  </WorkerProfileLink>

                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName} numberOfLines={1}>
                      {displayWorkerName || 'Service Worker'}
                    </Text>
                    <View style={styles.workerMetaRow}>
                      <Text style={styles.workerCategory} numberOfLines={1}>
                        {displayCategory}
                      </Text>
                      <View style={styles.metaDot} />
                      <StarIcon size={11} color={colors.starFilled} fill={colors.starFilled} />
                      <Text style={styles.workerRatingText}>{displayRating.toFixed(1)}</Text>
                      {typeof displayReviewCount === 'number' && displayReviewCount > 0 ? (
                        <Text style={styles.workerReviewCount}>({displayReviewCount})</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Direct Action Icons: Chat & Call (neutral surfaces; icon colour carries the meaning) */}
                  <View style={styles.workerActions}>
                    <Pressable
                      style={({ pressed }) => [styles.iconActionBtn, pressed && styles.iconActionBtnPressed]}
                      onPress={() =>
                        router.push({
                          pathname: `/booking/${booking.id}/chat`,
                          params: {
                            workerName: displayWorkerName || 'Service Worker',
                            workerAvatar: displayWorkerAvatar,
                            workerPhone: displayPhone,
                            categoryName: displayCategory,
                            workerId: effectiveWorkerId,
                          },
                        } as any)
                      }
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel="Chat with worker"
                    >
                      <ChatIcon size={18} color={colors.textPrimary} strokeWidth={1.9} />
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.iconActionBtn, pressed && styles.iconActionBtnPressed]}
                      onPress={handleCall}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel="Call worker"
                    >
                      <PhoneIcon size={18} color={colors.primaryDark} strokeWidth={1.9} />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.unassignedBox}>
                  <ClockIcon size={16} color={colors.textSecondary} />
                  <Text style={styles.unassignedText}>
                    Matching a verified worker nearby...
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 5. Service Location Section */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Service Location</Text>
              {booking.job_site_location && (
                <Pressable
                  style={({ pressed }) => [styles.mapLink, pressed && styles.mapLinkPressed]}
                  onPress={handleOpenMaps}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="View location on Google Maps"
                >
                  <Text style={styles.mapLinkText}>View on map</Text>
                  <ExternalLinkIcon size={12} color={colors.textSecondary} strokeWidth={2} />
                </Pressable>
              )}
            </View>

            <View style={styles.locationRow}>
              <View style={styles.locationIconWrap}>
                <LocationIcon size={16} color={colors.textSecondary} strokeWidth={1.9} />
              </View>
              <Text style={styles.addressText} numberOfLines={4}>
                {booking.address_text || 'Address on record'}
              </Text>
            </View>
          </View>

          {/* 6. Payment & Bill Summary */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Payment Summary</Text>

            {getBookingSavings(booking).hasDiscount ? (
              <>
                {/* Discounted booking: figures come from the booking's own snapshot (estimated_total is already discounted). */}
                <DiscountSummaryRow booking={booking} variant="source" />
                {/* Original price, the exact coupon / offer, its value and amount, fee: all from the stored snapshot. */}
                <PriceSummaryRows
                  compact
                  rows={buildPriceSummaryRows({
                    originalAmount: booking.subtotal_before_discount ?? booking.base_price,
                    baseAmount: booking.base_price,
                    platformFee: booking.platform_fee,
                    platformFeePercent: booking.customer_fee_percent,
                    taxAmount: booking.tax_amount,
                    taxLabel: booking.tax_label,
                    taxPercent: booking.tax_percent,
                    discount: {
                      name: getBookingSavings(booking).rowLabel,
                      valueLabel: getBookingSavings(booking).valueLabel,
                      amount: bookingItemDiscount(booking) || getBookingSavings(booking).amount,
                    },
                  })}
                />
              </>
            ) : (
              /* Service amount = stored total - stored fee - stored tax: the booking's own snapshot, never repriced. */
              <PriceSummaryRows
                compact
                rows={buildPriceSummaryRows({
                  originalAmount:
                    Math.round((booking.estimated_total - booking.platform_fee - (booking.tax_amount ?? 0)) * 100) / 100,
                  baseAmount: booking.base_price,
                  platformFee: booking.platform_fee,
                  platformFeePercent: booking.customer_fee_percent,
                  taxAmount: booking.tax_amount,
                  taxLabel: booking.tax_label,
                  taxPercent: booking.tax_percent,
                })}
              />
            )}

            <View style={styles.billDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total payable</Text>
              <Text style={styles.totalValue}>
                Rs. {booking.estimated_total.toLocaleString()}
              </Text>
            </View>

            <View style={styles.codRow}>
              <View style={styles.codIconWrap}>
                <CashIcon size={17} color={colors.textSecondary} strokeWidth={1.9} />
              </View>
              <View style={styles.codTextCol}>
                <Text style={styles.codTitle}>Cash on Delivery</Text>
                <Text style={styles.codNote}>
                  Pay directly to your worker after the job is completed.
                </Text>
              </View>
            </View>
          </View>

          {/* 7. Dispute State Card (rendered strictly ONLY when genuine dispute record exists) */}
          <BookingDisputeCard
            dispute={activeDispute}
            bookingId={booking.id}
            onContactSupport={() => router.push('/profile/support' as any)}
          />
        </ScrollView>

        {/* 8. Bottom Action Footer (Clean & Full-Width, respects safe areas) */}
        {hasBottomActions && (
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
            ]}
          >
            {/* Completed by worker -> Confirm or Dispute */}
            {needsCustomerConfirmation && (
              <View style={styles.actionColumn}>
                <Text style={styles.confirmHint}>
                  Please inspect the completed work before confirming. Once confirmed, your
                  booking will be marked as completed.
                </Text>
                {/* Note: no flex:1 here — in a column container it collapses the button to 0 height. */}
                <TouchableOpacity
                  style={[styles.confirmBtn, isConfirming && styles.confirmBtnDisabled]}
                  onPress={handleConfirmJob}
                  disabled={isConfirming}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm Completion"
                  accessibilityState={{ disabled: isConfirming, busy: isConfirming }}
                >
                  {isConfirming ? (
                    <ActivityIndicator size="small" color={colors.pureWhite} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Confirm completion</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.textActionBtn}
                  onPress={() => router.push(`/booking/${booking.id}/dispute` as any)}
                  disabled={isConfirming}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Report an Issue"
                >
                  <Text style={styles.textActionBtnText}>Report an issue</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pending or Accepted -> Subtle Cancel Action */}
            {(currentStatus === 'PENDING' || currentStatus === 'ACCEPTED') && (
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                onPress={() => setCancelModalVisible(true)}
                disabled={cancelModalVisible}
                accessibilityRole="button"
                accessibilityLabel="Cancel Booking"
                accessibilityState={{ disabled: cancelModalVisible }}
              >
                <Text style={styles.secondaryBtnText}>Cancel booking</Text>
              </Pressable>
            )}

            {/* Completed -> Invoice & Review actions */}
            {(currentStatus === 'COMPLETED' ||
              currentStatus === 'AUTO_COMPLETED' ||
              currentStatus === 'RESOLVED') && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => router.push(`/booking/${booking.id}/invoice` as any)}
                  accessibilityRole="button"
                  accessibilityLabel="View Receipt"
                >
                  <DocumentIcon size={16} color={colors.pureWhite} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>View receipt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => router.push(`/booking/${booking.id}/review` as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Rate Service"
                >
                  <StarIcon size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.outlineBtnText}>Rate service</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Disputed -> Contact Support */}
            {currentStatus === 'DISPUTED' && (
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                onPress={() => router.push('/profile/support' as any)}
                accessibilityRole="button"
                accessibilityLabel="Contact Support"
              >
                <Text style={styles.secondaryBtnText}>Contact support</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Cancellation Modal */}
        <BookingCancelModal
          visible={cancelModalVisible}
          booking={booking}
          onClose={() => setCancelModalVisible(false)}
          onCancelled={() => {
            setCancelModalVisible(false);
            refetch();
          }}
        />

        {/* Dispute Modal */}
        <AppDialog
          visible={disputeModalVisible}
          tone="warning"
          title="Report a problem"
          message="Tell us what went wrong with your booking."
          onRequestClose={() => setDisputeModalVisible(false)}
          actions={[
            { label: 'Cancel', onPress: () => setDisputeModalVisible(false), variant: 'secondary', disabled: isSubmittingDispute },
            { label: 'Submit', onPress: handleOpenDispute, variant: 'primary', loading: isSubmittingDispute },
          ]}
        >
          <TextInput
            style={styles.modalInput}
            placeholder="What happened? (at least 10 characters)"
            placeholderTextColor={colors.placeholder}
            value={disputeReason}
            onChangeText={setDisputeReason}
            multiline
            numberOfLines={3}
          />
        </AppDialog>
      </View>
    </SafeAreaView>
  );
}

/**
 * Booking Details design language
 *   Page   colors.bgApp (soft neutral)        Cards  colors.cardRaised, radius 16, padding 16, no border/shadow
 *   Insets colors.bgHover, radius 12           Text   textPrimary / textSecondary / textMuted
 *   Green is reserved for progress, the payable amount and the single primary CTA.
 * Every colour is a theme token, so Dark mode gets its own layered charcoal surfaces automatically.
 */
const CARD_RADIUS = 16;
const INSET_RADIUS = 12;

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },

  // 1. Navigation header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgApp,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  idButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.bgHover,
  },
  idButtonCopied: {
    backgroundColor: colors.primaryTint,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.textSecondary,
  },
  copiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  idTextCopied: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: colors.textGreen,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Shared card + section headings
  card: {
    backgroundColor: colors.cardRaised,
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },

  // 2. Status & progress
  statusCard: {
    backgroundColor: colors.cardRaised,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
    gap: 6,
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.1,
  },
  statusTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  statusSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 3,
  },
  stepperWrap: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  stepVisualContainer: {
    width: '100%',
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  connectorHalf: {
    position: 'absolute',
    top: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.bgHover,
  },
  connectorLeft: {
    left: 0,
    right: '50%',
  },
  connectorRight: {
    left: '50%',
    right: 0,
  },
  connectorActive: {
    backgroundColor: colors.primaryDark,
  },
  nodeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.cardRaised,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeCircleDone: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  nodeCircleCurrent: {
    borderColor: colors.primaryDark,
    borderWidth: 2,
  },
  nodeCurrentInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryDark,
  },
  nodeUpcomingInner: {
    width: 0,
    height: 0,
  },
  stepLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepLabelDone: {
    color: colors.textSecondary,
  },
  stepLabelCurrent: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.textPrimary,
  },

  // 4. Booked service
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 10,
  },
  serviceRowSpaced: {
    marginTop: 10,
  },
  serviceName: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  serviceQtyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.bgHover,
  },
  serviceQtyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },
  customRequestBlock: {
    marginTop: 14,
    padding: 12,
    borderRadius: INSET_RADIUS,
    backgroundColor: colors.bgHover,
  },
  customRequestBlockFirst: {
    marginTop: 10,
  },
  customRequestLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  customRequestText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },

  // 5. Assigned professional
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: WORKER_AVATAR_SIZE,
    height: WORKER_AVATAR_SIZE,
    borderRadius: WORKER_AVATAR_SIZE / 2,
    backgroundColor: colors.bgHover,
  },
  avatarFallback: {
    width: WORKER_AVATAR_SIZE,
    height: WORKER_AVATAR_SIZE,
    borderRadius: WORKER_AVATAR_SIZE / 2,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: colors.textSecondary,
  },
  workerInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },
  workerName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  workerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  workerCategory: {
    flexShrink: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: 3,
  },
  workerRatingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.textPrimary,
  },
  workerReviewCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  workerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionBtnPressed: {
    backgroundColor: colors.buttonSecondaryPressed,
  },
  unassignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: INSET_RADIUS,
    backgroundColor: colors.bgHover,
    gap: 8,
  },
  unassignedText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textSecondary,
  },

  // 6. Service location
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: -4,
    marginRight: -8,
    borderRadius: 8,
  },
  mapLinkPressed: {
    backgroundColor: colors.bgHover,
  },
  mapLinkText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addressText: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },

  // 7. Payment summary
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 5,
  },
  billLabel: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13.5,
    color: colors.textSecondary,
  },
  billValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 13.5,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  billDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: 10,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  totalLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  codRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: INSET_RADIUS,
    backgroundColor: colors.bgHover,
  },
  codIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  codTextCol: {
    flex: 1,
    minWidth: 0,
  },
  codTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  codNote: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // 8. Bottom actions
  bottomBar: {
    backgroundColor: colors.cardRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionColumn: {
    gap: 8,
  },
  confirmHint: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  confirmBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    minHeight: 52,
    borderRadius: 14,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimary,
    height: 48,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.pureWhite,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    borderRadius: 12,
  },
  outlineBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    borderRadius: 12,
  },
  secondaryBtnPressed: {
    backgroundColor: colors.bgHover,
  },
  secondaryBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  textActionBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  textActionBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12.5,
    color: colors.dangerMedium,
  },

  // Dispute modal
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.modalBackground,
    borderRadius: CARD_RADIUS,
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  modalInput: {
    fontFamily: 'PlusJakartaSans-Regular',
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
  },
  modalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCancelText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalSubmit: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: colors.pureWhite,
  },

  // Loading
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
  },
});
