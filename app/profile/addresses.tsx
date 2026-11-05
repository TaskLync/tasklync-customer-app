import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';

import { BottomSheet } from '../../src/components/layout/BottomSheet';
import { useAddresses } from '../../src/hooks/useAddresses';
import { AddressCard } from '../../src/components/address/AddressCard';
import { AddressSwipeActions } from '../../src/components/address/AddressSwipeActions';
import { AddressCardSkeleton } from '../../src/components/address/AddressCardSkeleton';
import { SkeletonGroup } from '../../src/components/ui/Skeleton';
import { AddressEmptyState } from '../../src/components/address/AddressEmptyState';
import { Address } from '../../src/types/address.types';
import { colors, palette, fontFamily, fontSize, radius, shadows } from '../../src/design';

/**
 * Screen 1 — Saved Addresses List (`addresses.tsx`)
 *
 * Implements Principal RN / UX Architecture:
 * - Serial Position Effect: Default address pinned to position #0
 * - Fitts's Law: Full-width sticky "+ Add New Address" footer reachable one-handed
 * - Doherty Threshold: 300ms delayed skeleton to avoid flash of loading on cache hits
 * - WCAG Motor Fallback: Long-press action sheet providing a non-gesture route to Edit/Delete/Default
 * - Optimistic CRUD updates with seamless rollback on network failure
 */
export default function SavedAddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    addresses,
    isLoading,
    isError,
    refetch,
    deleteAddress,
    setDefaultAddress,
  } = useAddresses();

  // Selected address for long-press Action Sheet modal (WCAG accessibility fallback)
  const [actionSheetAddress, setActionSheetAddress] = useState<Address | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleAddNew = () => {
    router.push({
      pathname: '/profile/addresses/add',
      params: { mode: 'add' },
    });
  };

  const handleEditAddress = (address: Address) => {
    setActionSheetAddress(null);
    router.push({
      pathname: '/profile/addresses/add',
      params: { mode: 'edit', addressId: address.id },
    });
  };

  const handleDeleteAddress = (address: Address) => {
    setActionSheetAddress(null);
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${address.label || 'this address'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(address.id);
            } catch (_err) {
              Alert.alert('Error', "Couldn't delete address. Tap retry.");
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (address: Address) => {
    setActionSheetAddress(null);
    if (address.is_default) return;
    try {
      await setDefaultAddress(address.id);
    } catch (_err) {
      Alert.alert('Error', 'Failed to update default address.');
    }
  };

  const handleLongPressCard = (address: Address) => {
    setActionSheetAddress(address);
  };

  const renderItem = useCallback(
    ({ item }: { item: Address }) => (
      <AddressSwipeActions
        address={item}
        onEdit={handleEditAddress}
        onDelete={handleDeleteAddress}
      >
        <AddressCard
          address={item}
          onPress={handleEditAddress}
          onLongPress={handleLongPressCard}
        />
      </AddressSwipeActions>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.zenWhite} />

      <View style={styles.container}>
        {/* Header (Back arrow + Screen title "Saved Addresses") */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.4} />
          </Pressable>

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            Saved Addresses
          </Text>
          <View style={styles.headerRightSpacer} />
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Error Banner */}
          {isError && (
            <View style={styles.errorCard}>
              <AlertCircle size={20} color={palette.danger} />
              <View style={styles.errorTextWrap}>
                <Text style={styles.errorTitle}>Couldn&apos;t load addresses</Text>
                <Text style={styles.errorSubtitle}>Please check your connection</Text>
              </View>
              <Pressable
                onPress={() => refetch()}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading addresses"
              >
                <RefreshCw size={14} color={colors.primaryDark} />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Loading skeleton (SkeletonGroup applies the shared anti-flash delay) */}
          {isLoading && !isError && (
            <SkeletonGroup style={styles.skeletonContainer} accessibilityLabel="Loading addresses">
              <AddressCardSkeleton />
              <AddressCardSkeleton />
              <AddressCardSkeleton />
            </SkeletonGroup>
          )}

          {/* Empty State */}
          {!isLoading && !isError && addresses.length === 0 && (
            <AddressEmptyState onAddPress={handleAddNew} />
          )}

          {/* FlashList of Addresses */}
          {!isLoading && addresses.length > 0 && (
            <FlashList
              data={addresses}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              estimatedItemSize={76}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Sticky Footer: "+ Add New Address" */}
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 14 : 20 },
          ]}
        >
          <Pressable
            onPress={handleAddNew}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add New Address"
          >
            <Plus size={20} color={colors.primaryDark} strokeWidth={2.4} />
            <Text style={styles.addButtonText} maxFontSizeMultiplier={1.3}>
              Add New Address
            </Text>
          </Pressable>
        </View>

        {/* Accessibility Long-Press Action Sheet Modal */}
        <BottomSheet
          visible={Boolean(actionSheetAddress)}
          onClose={() => setActionSheetAddress(null)}
          snapPoints={['auto']}
          contentPadding={true}
        >
          <View style={styles.actionSheetContent}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle} maxFontSizeMultiplier={1.3}>
                {actionSheetAddress?.label || 'Address Options'}
              </Text>
              <Pressable
                onPress={() => setActionSheetAddress(null)}
                style={styles.actionSheetClose}
              >
                <X size={20} color={palette.gray500} />
              </Pressable>
            </View>

            {/* Set as Default Option */}
            {!actionSheetAddress?.is_default && (
              <Pressable
                onPress={() => actionSheetAddress && handleSetDefault(actionSheetAddress)}
                style={styles.actionSheetRow}
                accessibilityRole="button"
              >
                <CheckCircle2 size={20} color={colors.primaryDark} strokeWidth={2.2} />
                <Text style={styles.actionSheetRowText} maxFontSizeMultiplier={1.3}>
                  Set as Default Address
                </Text>
              </Pressable>
            )}

            {/* Edit Option */}
            <Pressable
              onPress={() => actionSheetAddress && handleEditAddress(actionSheetAddress)}
              style={styles.actionSheetRow}
              accessibilityRole="button"
            >
              <Pencil size={20} color={palette.info} strokeWidth={2.2} />
              <Text style={styles.actionSheetRowText} maxFontSizeMultiplier={1.3}>
                Edit Address Details
              </Text>
            </Pressable>

            {/* Delete Option */}
            <Pressable
              onPress={() => actionSheetAddress && handleDeleteAddress(actionSheetAddress)}
              style={[styles.actionSheetRow, styles.actionSheetRowDanger]}
              accessibilityRole="button"
            >
              <Trash2 size={20} color={palette.danger} strokeWidth={2.2} />
              <Text style={[styles.actionSheetRowText, styles.dangerText]} maxFontSizeMultiplier={1.3}>
                Delete Address
              </Text>
            </Pressable>
          </View>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.zenWhite,
  },
  container: {
    flex: 1,
    backgroundColor: palette.zenWhite,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: palette.zenWhite,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: palette.gray100,
  },
  headerTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: fontSize.h2,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  headerRightSpacer: {
    width: 40,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  skeletonContainer: {
    marginTop: 4,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.dangerLight,
    borderWidth: 1,
    borderColor: palette.danger,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: palette.dangerDark,
  },
  errorSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: palette.dangerDark,
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.green200,
  },
  retryText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: palette.zenWhite,
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
  },
  addButton: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.green50,
    borderWidth: 1.5,
    borderColor: palette.green300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.sm,
  },
  addButtonPressed: {
    backgroundColor: palette.green100,
    borderColor: palette.green400,
    transform: [{ scale: 0.99 }],
  },
  addButtonText: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.primaryDark,
  },
  actionSheetContent: {
    paddingBottom: 16,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
    marginBottom: 8,
  },
  actionSheetTitle: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  actionSheetClose: {
    padding: 6,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  actionSheetRowDanger: {
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
    marginTop: 4,
  },
  actionSheetRowText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dangerText: {
    color: palette.danger,
  },
});
