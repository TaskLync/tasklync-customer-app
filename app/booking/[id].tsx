import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Linking, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Check,
  Phone,
  MessageSquare,
  FileText,
  Copy,
  Clock,
  RefreshCw,
  ExternalLink,
  Star,
} from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';

import { useBookingDetails } from '../../src/hooks/useBookingDetails';
import { useBookingTrack } from '../../src/hooks/useBookingTrack';
import { useWorkerProfile } from '../../src/hooks/useWorkerProfile';
import { useCartStore } from '../../src/store/cart.store';
import { useConfirmCompletion } from '../../src/hooks/useConfirmCompletion';
import { useBookingDispute } from '../../src/hooks/useBookingDispute';
import { BookingCancelModal } from '../../src/components/booking/BookingCancelModal';
import { BookingDisputeCard } from '../../src/components/booking/BookingDisputeCard';
import { BookingCountdown } from '../../src/components/booking/BookingCountdown';
import { BookingVerificationSection } from '../../src/components/booking/BookingVerificationSection';
import { DispatchedTechnicianCard } from '../../src/components/booking/DispatchedTechnicianCard';
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

// 4 simple milestone steps like Uber / Foodpanda
const TRACK_STEPS = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'ACCEPTED', label: 'Confirmed' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
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
      if (id) refetch();
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
              <ArrowLeft size={20} color={colors.textPrimary} />
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
    (booking?.category_id ? formatCategoryName(booking.category_id, 'Service', 'title') : 'Service Professional');

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
      'Confirm Completion',
      `Did the professional finish the job? Please confirm that you paid Rs. ${booking.estimated_total.toLocaleString()} in cash.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, Confirm & Paid',
          onPress: async () => {
            if (confirmInFlight.current) return;
            confirmInFlight.current = true;
            try {
              await confirmCompletion(booking.id);
              // Status only flips once the refetched backend state says so.
              await refetch();
              showAlert('Success', 'Booking completed. Thank you!');
            } catch (err: any) {
              const errorMessage =
                err?.message ||
                err?.response?.data?.error?.message ||
                'Unable to confirm completion right now. Please try again.';
              showAlert('Confirmation Error', errorMessage);
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
      showAlert('Required', 'Please describe the issue (minimum 10 characters).');
      return;
    }
    try {
      const urls = evidenceUrl.trim() ? [evidenceUrl.trim()] : undefined;
      await openDispute({ id: booking.id, reason: disputeReason, evidenceUrls: urls });
      setDisputeModalVisible(false);
      setDisputeReason('');
      setEvidenceUrl('');
      showAlert('Report Received', 'Our support team will contact you shortly.');
      refetch();
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to submit report.');
    }
  };

  // Call worker
  const handleCall = () => {
    const phone = displayPhone || trackData?.worker_phone || booking?.worker_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        showAlert('Error', 'Unable to place call.');
      });
    } else {
      router.push({
        pathname: `/booking/${booking.id}/chat`,
        params: {
          workerName: displayWorkerName || booking?.worker_name || 'Service Professional',
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
          label: 'Service in Progress',
          bg: colors.infoLight,
          text: colors.textInfo,
          dot: colors.info,
        };
      case 'COMPLETED_BY_WORKER':
        return {
          label: 'Action Required',
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
          label: 'Under Review',
          bg: colors.dangerLight,
          text: palette.red700,
          dot: colors.dangerMedium,
        };
      default:
        return {
          label: 'Status Updated',
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
          title: isCompanyBooking ? 'Awaiting Agency Confirmation' : 'Finding your professional',
          subtitle: isCompanyBooking
            ? `${agencyName || 'The service agency'} is reviewing your booking request.`
            : 'Connecting you with a verified specialist nearby.',
        };
      case 'ACCEPTED':
        return {
          title: isCompanyBooking ? 'Agency Confirmed Booking' : 'Professional is assigned',
          subtitle: isCompanyBooking
            ? `Technician details will appear once dispatched by ${agencyName || 'the agency'}.`
            : `${displayWorkerName || 'Professional'} confirmed your booking.`,
        };
      case 'IN_PROGRESS':
        return {
          title: 'Service in Progress',
          subtitle: isCompanyBooking
            ? `Dispatched technician from ${agencyName || 'the agency'} is on-site.`
            : 'The professional is currently working on your service.',
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
          <ArrowLeft size={20} color={colors.textPrimary} />
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
                <Check size={10} color={colors.textGreen} strokeWidth={3} />
                <Text style={styles.idTextCopied}>Copied</Text>
              </View>
            ) : (
              <View style={styles.idRow}>
                <Text style={styles.idText}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
                <Copy size={10} color={colors.textSecondary} style={{ marginLeft: 3 }} />
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
            <RefreshCw size={18} color={colors.textSecondary} />
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

          {/* 2. Primary Booking Status Hero Section */}
          <View style={styles.statusSection}>
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
          </View>

          {/* Post-Booking Review Prompt (if finished & eligible) */}
          <BookingReviewPrompt bookingId={booking.id} workerId={booking.worker_id} />

          {/* 3. Milestone Progress Stepper */}
          {!isTerminal && (
            <View style={styles.stepperCard}>
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
                            <Check size={11} color={colors.pureWhite} strokeWidth={3} />
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

          {/* Contextual Job Start Verification: OTP & QR Code (Active when ACCEPTED) */}
          <BookingVerificationSection
            bookingId={booking.id}
            status={currentStatus}
          />

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
                <Text style={styles.sectionHeading}>Assigned Professional</Text>
              </View>

              {isProfessionalAssigned ? (
                <View style={styles.workerRow}>
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

                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName} numberOfLines={1}>
                      {displayWorkerName || 'Service Professional'}
                    </Text>
                    <Text style={styles.workerCategory} numberOfLines={1}>
                      {displayCategory}
                    </Text>
                    <View style={styles.workerRatingRow}>
                      <Star size={12} color={colors.starFilled} fill={colors.starFilled} />
                      <Text style={styles.workerRatingText}>{displayRating.toFixed(1)}</Text>
                      {typeof displayReviewCount === 'number' && displayReviewCount > 0 ? (
                        <Text style={styles.workerReviewCount}>({displayReviewCount})</Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Direct Action Icons: Chat & Call */}
                  <View style={styles.workerActions}>
                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() =>
                        router.push({
                          pathname: `/booking/${booking.id}/chat`,
                          params: {
                            workerName: displayWorkerName || 'Service Professional',
                            workerAvatar: displayWorkerAvatar,
                            workerPhone: displayPhone,
                            categoryName: displayCategory,
                            workerId: effectiveWorkerId,
                          },
                        } as any)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Chat with professional"
                    >
                      <MessageSquare size={17} color={colors.primaryDark} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.iconActionBtn, styles.callBtn]}
                      onPress={handleCall}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Call professional"
                    >
                      <Phone size={17} color={colors.pureWhite} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.unassignedBox}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.unassignedText}>
                    Matching a verified professional nearby...
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
                <TouchableOpacity
                  style={styles.mapsLinkPill}
                  onPress={handleOpenMaps}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="View location on Google Maps"
                >
                  <Text style={styles.mapsLinkText}>View on map</Text>
                  <ExternalLink size={12} color={colors.primaryDark} style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.locationRow}>
              <Text style={styles.addressText} numberOfLines={3}>
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
                    discount: {
                      name: getBookingSavings(booking).rowLabel,
                      valueLabel: getBookingSavings(booking).valueLabel,
                      amount: bookingItemDiscount(booking) || getBookingSavings(booking).amount,
                    },
                  })}
                />
              </>
            ) : (
              <>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Base Service Rate</Text>
                  <Text style={styles.billValue}>Rs. {booking.base_price.toLocaleString()}</Text>
                </View>

                {booking.urgency_multiplier > 1.0 && (
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>
                      Urgency Surge ({booking.urgency_multiplier}x)
                    </Text>
                    <Text style={[styles.billValue, { color: colors.warningMedium }]}>
                      +Rs. {(booking.base_price * (booking.urgency_multiplier - 1)).toLocaleString()}
                    </Text>
                  </View>
                )}

                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Platform Fee</Text>
                  <Text style={styles.billValue}>Rs. {booking.platform_fee.toLocaleString()}</Text>
                </View>
              </>
            )}

            <View style={styles.billDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalValue}>
                Rs. {booking.estimated_total.toLocaleString()}
              </Text>
            </View>

            <View style={styles.codBadgeRow}>
              <View style={styles.codDot} />
              <Text style={styles.codNote}>
                Cash on Delivery • Pay directly to professional after job is completed
              </Text>
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
                    <Text style={styles.primaryBtnText}>Confirm Completion</Text>
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
                  <Text style={styles.textActionBtnText}>Report an Issue</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pending or Accepted -> Subtle Cancel Action */}
            {(currentStatus === 'PENDING' || currentStatus === 'ACCEPTED') && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setCancelModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Cancel Booking"
              >
                <Text style={styles.secondaryBtnText}>Cancel Booking</Text>
              </TouchableOpacity>
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
                  <FileText size={16} color={colors.pureWhite} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>View Receipt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => router.push(`/booking/${booking.id}/review` as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Rate Service"
                >
                  <Star size={16} color={colors.primaryDark} style={{ marginRight: 6 }} />
                  <Text style={styles.outlineBtnText}>Rate Service</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Disputed -> Contact Support */}
            {currentStatus === 'DISPUTED' && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/profile/support' as any)}
                accessibilityRole="button"
                accessibilityLabel="Contact Support"
              >
                <Text style={styles.secondaryBtnText}>Contact Support</Text>
              </TouchableOpacity>
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
        <Modal
          visible={disputeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDisputeModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Report an Issue</Text>
                <Text style={styles.modalSub}>
                  Let us know what went wrong with your booking.
                </Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Reason (at least 10 characters)..."
                  placeholderTextColor={colors.placeholder}
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setDisputeModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSubmit}
                    onPress={handleOpenDispute}
                    disabled={isSubmittingDispute}
                  >
                    {isSubmittingDispute ? (
                      <ActivityIndicator size="small" color={colors.pureWhite} />
                    ) : (
                      <Text style={styles.modalSubmitText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, palette, companyTokens }: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },

  // 1. Top Navigation Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.bgApp,
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
    color: colors.textPrimary,
  },
  idButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: colors.bgHover,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: colors.textSecondary,
  },
  copiedHint: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10.5,
    color: colors.primaryDark,
    marginLeft: 5,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },

  // ID Button
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  idButtonCopied: {
    backgroundColor: colors.primaryBorderSubtle,
  },
  idTextCopied: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10.5,
    color: colors.textGreen,
  },

  // 2. Status Hero Section
  statusSection: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  statusTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // 3. Milestone Stepper Card
  stepperCard: {
    backgroundColor: colors.bgSection,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
  },
  stepVisualContainer: {
    width: '100%',
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  connectorHalf: {
    position: 'absolute',
    top: 10,
    height: 2,
    backgroundColor: colors.border,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bgApp,
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
    backgroundColor: colors.primaryBorderSubtle,
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
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  stepLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepLabelDone: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: colors.textGreen,
  },
  stepLabelCurrent: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: colors.textPrimary,
  },

  // Base Card
  card: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeading: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBorderSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: colors.textGreen,
  },

  // Worker Row (Non-agency fallback)
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.bgHover,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: companyTokens.colors.verifiedBlue,
  },
  workerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workerName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  workerCategory: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  workerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  workerRatingText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11.5,
    color: colors.textPrimary,
  },
  workerReviewCount: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: colors.textSecondary,
  },
  workerBadgeLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: colors.textGreen,
    marginLeft: 2,
  },
  workerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  unassignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  unassignedText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
  },

  // Service Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addressText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.gray800,
    lineHeight: 18,
  },
  mapsLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mapsLinkText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11.5,
    color: colors.primaryDark,
  },

  // Bill Details
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  billLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  billValue: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.bgHover,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: colors.primaryDark,
  },
  codBadgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 6,
  },
  codDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primaryDark,
    marginTop: 5,
    flexShrink: 0,
  },
  codNote: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11.5,
    color: colors.textSecondary,
  },

  // Dispute Card
  disputeCard: {
    borderColor: colors.borderErrorLight,
    backgroundColor: colors.dangerLight,
  },
  disputeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  disputeTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13.5,
    color: colors.dangerMedium,
  },
  disputeReason: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12.5,
    color: palette.red900,
    marginBottom: 4,
  },
  disputeWorkerReply: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textDangerDark,
    fontStyle: 'italic',
    marginTop: 2,
  },
  disputeHelpText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: palette.red700,
    marginTop: 4,
  },

  // Bottom Action Bar
  bottomBar: {
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
    backgroundColor: colors.primaryDark,
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
    backgroundColor: colors.primaryDark,
    height: 44,
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
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    height: 44,
    borderRadius: 12,
  },
  outlineBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.primaryDark,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    borderRadius: 10,
  },
  secondaryBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.modalBackground,
    borderRadius: 16,
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
    backgroundColor: colors.primaryDark,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: colors.pureWhite,
  },

  // Center / Loading
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
