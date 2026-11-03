import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  Star,
  Phone,
  Maximize2,
} from 'lucide-react-native';

import { colors, palette, typography } from '../../../src/design';
import { WorkerAvatar } from '../../../src/components/worker/WorkerAvatar';
import { useCustomRequestDetail } from '../../../src/hooks/custom-requests/useCustomRequestDetail';
import { useWorkerProfile } from '../../../src/hooks/useWorkerProfile';
import { CustomRequestStatus } from '../../../src/types/customRequest.types';
import { ImageViewer } from '../../../src/components/common/ImageViewer';
import { chatApi } from '../../../src/services/api/chat.api';

export default function CustomRequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    request,
    media,
    activeQuote,
    isLoading,
    isError,
    refetch,
    isRefetching,
    cancelRequest,
    isCancelling,
  } = useCustomRequestDetail(id || '');

  // Fetch full worker profile to guarantee real avatar and name are always available
  const { worker: workerProfile } = useWorkerProfile(request?.worker_id);
  const resolvedWorkerName =
    request?.worker_name ||
    workerProfile?.name ||
    'Assigned Professional';
  const resolvedWorkerAvatar =
    request?.worker_avatar ||
    workerProfile?.avatarUrl ||
    (workerProfile as any)?.avatar ||
    null;
  const resolvedWorkerPhone =
    request?.worker_phone ||
    (workerProfile as any)?.phone ||
    (workerProfile as any)?.phone_number ||
    undefined;

  // ImageViewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Cancellation Modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Chat loading state
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/bookings' as any);
    }
  };

  const handleOpenChat = async () => {
    if (!id) return;
    setIsOpeningChat(true);
    const navParams = {
      requestId: id,
      workerName: resolvedWorkerName,
      workerAvatar: resolvedWorkerAvatar || undefined,
      workerPhone: resolvedWorkerPhone,
      categoryName: request?.category_name || request?.category_id || undefined,
    };
    try {
      await chatApi.createRequestRoom(id);
      router.push({
        pathname: `/chat/request/${id}` as any,
        params: navParams,
      });
    } catch (err: any) {
      // Still navigate so customer can retry or see room
      router.push({
        pathname: `/chat/request/${id}` as any,
        params: navParams,
      });
    } finally {
      setIsOpeningChat(false);
    }
  };

  const handleConfirmCancel = () => {
    setCancelModalVisible(false);
    cancelRequest(cancelReason);
  };

  if (isLoading && !request) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={palette.green600} />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !request) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <AlertTriangle size={48} color={palette.red500} />
        <Text style={styles.errorTitle}>Request Not Found</Text>
        <Text style={styles.errorSubtitle}>
          Unable to find this service request or access was denied.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={handleBack}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isCancellable =
    request.status === CustomRequestStatus.SUBMITTED ||
    request.status === CustomRequestStatus.UNDER_REVIEW ||
    request.status === CustomRequestStatus.CLARIFICATION_REQUESTED ||
    request.status === CustomRequestStatus.QUOTE_SENT;

  const isQuoteReady = request.status === CustomRequestStatus.QUOTE_SENT;
  const isAccepted = request.status === CustomRequestStatus.ACCEPTED;
  const isConverted = request.status === CustomRequestStatus.CONVERTED;

  const formattedDate = request.created_at
    ? new Date(request.created_at).toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const portfolioImages = media.map((m, idx) => ({
    id: m.id || String(idx),
    url: m.media_url,
    caption: m.media_type === 'VIDEO' ? 'Video Attachment' : `Photo ${idx + 1}`,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={22} color={palette.gray900} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Custom Request</Text>
          <Text style={styles.headerSubtitle}>#{request.id.slice(0, 8)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            request.status === CustomRequestStatus.QUOTE_SENT && styles.statusBadgeGreen,
            request.status === CustomRequestStatus.DECLINED && styles.statusBadgeRed,
            request.status === CustomRequestStatus.CANCELLED && styles.statusBadgeGray,
            request.status === CustomRequestStatus.ACCEPTED && styles.statusBadgeGreen,
            request.status === CustomRequestStatus.CONVERTED && styles.statusBadgeGreen,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              (request.status === CustomRequestStatus.QUOTE_SENT ||
                request.status === CustomRequestStatus.ACCEPTED ||
                request.status === CustomRequestStatus.CONVERTED) &&
                styles.statusBadgeTextGreen,
              request.status === CustomRequestStatus.DECLINED && styles.statusBadgeTextRed,
              request.status === CustomRequestStatus.CANCELLED && styles.statusBadgeTextGray,
            ]}
          >
            {request.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[palette.green600]}
            tintColor={palette.green600}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Callout Banner */}
        {request.status === CustomRequestStatus.SUBMITTED && (
          <View style={[styles.banner, styles.bannerAmber]}>
            <Clock size={18} color={colors.warningMedium} />
            <Text style={[styles.bannerText, styles.bannerTextAmber]}>
              Request Sent — Professional will review your requirements and respond with a formal quote shortly.
            </Text>
          </View>
        )}

        {request.status === CustomRequestStatus.UNDER_REVIEW && (
          <View style={[styles.banner, styles.bannerBlue]}>
            <Clock size={18} color={colors.textInfo} />
            <Text style={[styles.bannerText, styles.bannerTextBlue]}>
              Under Review — Professional is currently evaluating your problem details and photos.
            </Text>
          </View>
        )}

        {request.status === CustomRequestStatus.CLARIFICATION_REQUESTED && (
          <View style={[styles.banner, styles.bannerPurple]}>
            <MessageSquare size={18} color={palette.purple600} />
            <Text style={[styles.bannerText, styles.bannerTextPurple]}>
              Clarification Needed — Professional has sent you a message to clarify details before quoting.
            </Text>
          </View>
        )}

        {request.status === CustomRequestStatus.QUOTE_SENT && (
          <TouchableOpacity
            style={[styles.banner, styles.bannerGreenHighlight]}
            onPress={() => router.push(`/custom-request/${request.id}/quote` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.bannerHighlightLeft}>
              <CheckCircle2 size={22} color={colors.textGreen} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.bannerHighlightTitle}>Quote Ready for Review!</Text>
                <Text style={styles.bannerHighlightSubtitle}>
                  {activeQuote ? `PKR ${activeQuote.total_price.toLocaleString()}` : 'Tap to inspect price & scope'}
                </Text>
              </View>
            </View>
            <View style={styles.bannerHighlightCta}>
              <Text style={styles.bannerHighlightCtaText}>Review</Text>
              <ChevronRight size={16} color={colors.textGreen} />
            </View>
          </TouchableOpacity>
        )}

        {request.status === CustomRequestStatus.ACCEPTED && (
          <TouchableOpacity
            style={[styles.banner, styles.bannerGreenHighlight]}
            onPress={() => router.push(`/custom-request/${request.id}/checkout` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.bannerHighlightLeft}>
              <CheckCircle2 size={22} color={colors.textGreen} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.bannerHighlightTitle}>Quote Accepted</Text>
                <Text style={styles.bannerHighlightSubtitle}>
                  Please proceed to checkout to confirm arrival time & address.
                </Text>
              </View>
            </View>
            <View style={styles.bannerHighlightCta}>
              <Text style={styles.bannerHighlightCtaText}>Checkout</Text>
              <ChevronRight size={16} color={colors.textGreen} />
            </View>
          </TouchableOpacity>
        )}

        {request.status === CustomRequestStatus.CONVERTED && (
          <TouchableOpacity
            style={[styles.banner, styles.bannerGreen]}
            onPress={() => {
              if (request.booking_id) {
                router.push(`/booking/${request.booking_id}` as any);
              } else {
                router.push('/(tabs)/bookings' as any);
              }
            }}
          >
            <CheckCircle2 size={18} color={colors.textGreen} />
            <Text style={[styles.bannerText, styles.bannerTextGreen]}>
              Booking Confirmed — Tap to view your scheduled service appointment.
            </Text>
          </TouchableOpacity>
        )}

        {request.status === CustomRequestStatus.DECLINED && (
          <View style={[styles.banner, styles.bannerRed]}>
            <XCircle size={18} color={colors.dangerMedium} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={[styles.bannerText, styles.bannerTextRed]}>
                Request Declined by Professional
              </Text>
              {request.decline_reason ? (
                <Text style={styles.declineReasonText}>Reason: {request.decline_reason}</Text>
              ) : null}
            </View>
          </View>
        )}

        {request.status === CustomRequestStatus.CANCELLED && (
          <View style={[styles.banner, styles.bannerGray]}>
            <XCircle size={18} color={colors.textSecondary} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={[styles.bannerText, styles.bannerTextGray]}>Request Cancelled</Text>
              {request.cancellation_reason ? (
                <Text style={styles.declineReasonText}>Reason: {request.cancellation_reason}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Assigned Professional Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Assigned Professional</Text>
          <View style={styles.workerRow}>
            <WorkerAvatar
              uri={resolvedWorkerAvatar}
              name={resolvedWorkerName}
              size={52}
            />
            <View style={styles.workerInfo}>
              <View style={styles.workerNameRow}>
                <Text style={styles.workerName}>{resolvedWorkerName}</Text>
                <View style={styles.verifiedPill}>
                  <ShieldCheck size={11} color={colors.textGreen} />
                  <Text style={styles.verifiedPillText}>Verified</Text>
                </View>
              </View>
              <Text style={styles.workerCategoryText}>
                {request.category_name || request.category_id || 'Home Specialist'}
              </Text>
            </View>
          </View>

          <View style={styles.workerActionsRow}>
            <TouchableOpacity
              style={styles.workerActionBtn}
              onPress={handleOpenChat}
              disabled={isOpeningChat}
            >
              {isOpeningChat ? (
                <ActivityIndicator size="small" color={palette.green600} />
              ) : (
                <>
                  <MessageSquare size={16} color={palette.green600} />
                  <Text style={styles.workerActionBtnText}>Message</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.workerActionBtnSecondary}
              onPress={() => router.push(`/worker/${request.worker_id}` as any)}
            >
              <Text style={styles.workerActionBtnSecondaryText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Problem Title & Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Problem Details</Text>
          <Text style={styles.problemTitle}>{request.title}</Text>
          <Text style={styles.problemTimestamp}>Submitted on {formattedDate}</Text>
          <Text style={styles.problemDescription}>{request.description}</Text>
        </View>

        {/* Attached Photos / Videos */}
        {media.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderTitle}>Attached Media ({media.length})</Text>
              <Text style={styles.cardHeaderSub}>Tap to expand</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              {media.map((item, index) => (
                <TouchableOpacity
                  key={item.id || index}
                  style={styles.mediaItemContainer}
                  onPress={() => {
                    setViewerIndex(index);
                    setViewerVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.media_url }} style={styles.mediaThumb} contentFit="cover" />
                  <View style={styles.expandOverlay}>
                    <Maximize2 size={12} color={colors.white} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Service Address */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Service Location</Text>
          <View style={styles.addressRow}>
            <View style={styles.addressIconWrap}>
              <MapPin size={20} color={palette.green600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressText}>{request.address_text}</Text>
            </View>
          </View>
        </View>

        {/* Preferred Schedule Window */}
        {(request.preferred_date || request.preferred_time_slot) && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardHeaderTitle}>Preferred Timing (Hints)</Text>
            <View style={styles.scheduleRow}>
              {request.preferred_date && (
                <View style={styles.schedulePill}>
                  <Calendar size={14} color={palette.gray600} />
                  <Text style={styles.schedulePillText}>{request.preferred_date}</Text>
                </View>
              )}
              {request.preferred_time_slot && (
                <View style={styles.schedulePill}>
                  <Clock size={14} color={palette.gray600} />
                  <Text style={styles.schedulePillText}>{request.preferred_time_slot}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Cancellation Section */}
        {isCancellable && (
          <TouchableOpacity
            style={styles.cancelLinkButton}
            onPress={() => setCancelModalVisible(true)}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={palette.red500} />
            ) : (
              <Text style={styles.cancelLinkText}>Cancel Service Request</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      {isQuoteReady && (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
          ]}
        >
          <TouchableOpacity
            style={styles.reviewQuoteCta}
            onPress={() => router.push(`/custom-request/${request.id}/quote` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.reviewQuoteCtaText}>
              Review Formal Quote {activeQuote ? `• PKR ${activeQuote.total_price.toLocaleString()}` : ''} →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isAccepted && (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
          ]}
        >
          <TouchableOpacity
            style={styles.reviewQuoteCta}
            onPress={() => router.push(`/custom-request/${request.id}/checkout` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.reviewQuoteCtaText}>Complete Appointment Checkout →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Image Viewer Fullscreen Modal */}
      <ImageViewer
        images={portfolioImages}
        initialIndex={viewerIndex}
        isVisible={viewerVisible}
        onClose={() => setViewerVisible(false)}
      />

      {/* Cancel Request Confirmation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCancelModalVisible(false)}>
          <View style={styles.cancelSheet}>
            <Text style={styles.cancelSheetTitle}>Cancel Service Request?</Text>
            <Text style={styles.cancelSheetSubtitle}>
              Are you sure you want to cancel this request? The technician will be notified.
            </Text>

            <TextInput
              style={styles.cancelReasonInput}
              placeholder="Reason for cancellation (optional)"
              placeholderTextColor={palette.gray400}
              value={cancelReason}
              onChangeText={setCancelReason}
              maxLength={500}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalDismissBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalDismissBtnText}>Keep Request</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCancel}
              >
                <Text style={styles.modalConfirmBtnText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvasGray,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: palette.canvasGray,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: palette.gray600,
  },
  errorTitle: {
    marginTop: 16,
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: palette.gray900,
  },
  errorSubtitle: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray500,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: palette.green600,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
  },
  backLink: {
    marginTop: 12,
    padding: 8,
  },
  backLinkText: {
    color: palette.gray600,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: palette.gray900,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: palette.gray500,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.warningLight,
  },
  statusBadgeGreen: {
    backgroundColor: colors.primaryBorderSubtle,
  },
  statusBadgeRed: {
    backgroundColor: colors.borderErrorLight,
  },
  statusBadgeGray: {
    backgroundColor: colors.bgHover,
  },
  statusBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: colors.warningMedium,
    textTransform: 'uppercase',
  },
  statusBadgeTextGreen: {
    color: colors.textGreen,
  },
  statusBadgeTextRed: {
    color: colors.dangerMedium,
  },
  statusBadgeTextGray: {
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerAmber: {
    backgroundColor: palette.amber50,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  bannerBlue: {
    backgroundColor: colors.infoLight,
    borderWidth: 1,
    borderColor: colors.borderInfoLight,
  },
  bannerPurple: {
    backgroundColor: palette.purple50,
    borderWidth: 1,
    borderColor: palette.purple200,
  },
  bannerGreen: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  bannerGreenHighlight: {
    backgroundColor: colors.primaryBorderSubtle,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    justifyContent: 'space-between',
  },
  bannerRed: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.borderErrorLight,
  },
  bannerGray: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  bannerTextAmber: { color: colors.textWarningMedium },
  bannerTextBlue: { color: palette.blue700 },
  bannerTextPurple: { color: palette.purple700 },
  bannerTextGreen: { color: colors.textGreen },
  bannerTextRed: { color: palette.red700 },
  bannerTextGray: { color: colors.textSecondary },
  bannerHighlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerHighlightTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: colors.textGreen,
  },
  bannerHighlightSubtitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: colors.textGreenDark,
    marginTop: 1,
  },
  bannerHighlightCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  bannerHighlightCtaText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    color: colors.textGreen,
    marginRight: 2,
  },
  declineReasonText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: colors.bgCard,
    paddingVertical: 16,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: palette.gray900,
    marginBottom: 10,
  },
  cardHeaderSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray400,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gray100,
  },
  workerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: palette.gray900,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBorderSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  verifiedPillText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 10,
    color: colors.textGreen,
    marginLeft: 2,
  },
  workerCategoryText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: palette.gray500,
    marginTop: 2,
  },
  workerActionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  workerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.primaryTint,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  workerActionBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: palette.green600,
    marginLeft: 6,
  },
  workerActionBtnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.bgHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerActionBtnSecondaryText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: palette.gray700,
  },
  problemTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: palette.gray900,
  },
  problemTimestamp: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: palette.gray400,
    marginTop: 2,
    marginBottom: 8,
  },
  problemDescription: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: palette.gray700,
    lineHeight: 20,
  },
  mediaScroll: {
    marginTop: 4,
  },
  mediaItemContainer: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative',
    backgroundColor: palette.gray100,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBorderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: palette.gray800,
    lineHeight: 20,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgHover,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  schedulePillText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: palette.gray700,
    marginLeft: 6,
  },
  cancelLinkButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelLinkText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.red500,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  reviewQuoteCta: {
    backgroundColor: palette.green600,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewQuoteCtaText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  cancelSheet: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
  },
  cancelSheetTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: palette.gray900,
    marginBottom: 6,
  },
  cancelSheetSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: palette.gray600,
    lineHeight: 18,
    marginBottom: 14,
  },
  cancelReasonInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: palette.gray900,
    backgroundColor: colors.bgSubtle,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalDismissBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.bgHover,
    alignItems: 'center',
  },
  modalDismissBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: palette.gray700,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: palette.red500,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.white,
  },
});
