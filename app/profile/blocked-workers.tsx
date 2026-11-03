import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';

import { useBlockedWorkers } from '../../src/hooks/useBlockedWorkers';
import { BlockedWorkerRow } from '../../src/components/worker/BlockedWorkerRow';
import { ToastUndo } from '../../src/components/ui/ToastUndo';
import { BlockedWorker } from '../../src/types/moderation.types';
import { EmptyState } from '../../src/components/feedback/EmptyState';
import { colors, palette, fontFamily, fontSize, spacing } from '../../src/design';

export default function BlockedWorkersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    blockedWorkers,
    isLoading,
    unblockWorker,
    isUnblocking,
    toastUndoVisible,
    lastUnblockedWorker,
    undoUnblock,
    dismissToast,
  } = useBlockedWorkers();

  const handleBack = () => {
    router.back();
  };

  const renderItem = useCallback(
    ({ item }: { item: BlockedWorker }) => (
      <BlockedWorkerRow
        worker={item}
        onUnblock={unblockWorker}
        isUnblocking={isUnblocking}
      />
    ),
    [unblockWorker, isUnblocking]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgApp} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
          Blocked Service Providers
        </Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {/* Privacy Notice Banner */}
      <View style={styles.infoStrip}>
        <ShieldCheck size={16} color={palette.gray600} style={styles.infoIcon} />
        <Text style={styles.infoStripText} maxFontSizeMultiplier={1.3}>
          Blocked professionals cannot view your profile, contact you, or receive your booking requests.
        </Text>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color={colors.primaryDark} />
          </View>
        ) : blockedWorkers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              type="no-data"
              title="You haven't blocked anyone"
              description="When you block a service provider from their profile, they will appear here."
            />
          </View>
        ) : (
          <FlatList
            data={blockedWorkers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id || item.worker_id}
            contentContainerStyle={{
              paddingBottom: insets.bottom + 80,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Toast Undo for Reversible Unblocking (4s window) */}
      <ToastUndo
        visible={toastUndoVisible}
        message={`${lastUnblockedWorker?.name || 'Worker'} unblocked`}
        onUndo={undoUnblock}
        onDismiss={dismissToast}
        bottomOffset={Math.max(insets.bottom, 24)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgApp,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.iceGray,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h3,
    color: colors.textPrimary,
  },
  headerRightSpacer: {
    width: 40,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.iceGray,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  infoStripText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
