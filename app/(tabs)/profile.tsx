import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';

import { useCurrentUser } from '../../src/hooks/useProfile';
import { useLogout } from '../../src/hooks/useLogout';
import { useDeleteAccount } from '../../src/hooks/useDeleteAccount';
import { PROFILE_MENU_SECTIONS } from '../../src/config/profileMenu.config';
import { ProfileMenuItemConfig } from '../../src/types/user.types';
import { ProfileHeader } from '../../src/components/profile/ProfileHeader';
import { ProfileStatsRow } from '../../src/components/profile/ProfileStatsRow';
import { ProfileMenuSection } from '../../src/components/profile/ProfileMenuSection';
import { LogoutConfirmSheet, showNativeLogoutActionSheet } from '../../src/components/feedback/LogoutConfirmSheet';
import { DeleteAccountSheet } from '../../src/components/feedback/DeleteAccountSheet';
import { DeleteAccountReason } from '../../src/types/moderation.types';
import { colors, fontFamily } from '../../src/design';

/**
 * ProfileScreen (Day 35, 37 & 38 Profile & Account Control Hub)
 *
 * Implements Principal-level React Native & UX Architecture:
 * - Instant cached loads (5-min staleTime) with background refetch
 * - Data-driven menu sections (Serial Position & Hick's Law)
 * - Standalone routine Log Out row with calm 2-option sheet
 * - High-Friction 2-Step Delete Account flow with Peak-End goodbye screen
 */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user, isRefetching, refetch } = useCurrentUser();
  const { logout, isLoggingOut } = useLogout();
  const { deleteAccount, isDeleting } = useDeleteAccount();

  const [logoutModalVisible, setLogoutModalVisible] = useState<boolean>(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState<boolean>(false);

  const handleTriggerLogout = () => {
    const handledByNativeIOS = showNativeLogoutActionSheet(() => logout());
    if (!handledByNativeIOS) {
      setLogoutModalVisible(true);
    }
  };

  // Handle menu item interactions
  const handleMenuItemPress = useCallback(
    async (item: ProfileMenuItemConfig) => {
      if (item.route) {
        router.push(item.route as any);
        return;
      }

      if (item.action === 'logout') {
        handleTriggerLogout();
        return;
      }

      if (item.action === 'delete_account') {
        setDeleteSheetVisible(true);
        return;
      }

      if (item.action === 'contact_support') {
        router.push('/profile/support' as any);
        return;
      }

      if (item.action === 'rate_app') {
        const iosStoreUrl = 'https://apps.apple.com/app/id6440000000?action=write-review';
        const androidStoreUrl = 'market://details?id=pk.tasklync.customer';
        try {
          const url = Platform.OS === 'ios' ? iosStoreUrl : androidStoreUrl;
          await Linking.openURL(url);
        } catch {}
        return;
      }

      if (item.action === 'open_link' && item.externalUrl) {
        try {
          await Linking.openURL(item.externalUrl);
        } catch {}
      }
    },
    [router]
  );

  const handleConfirmDelete = async (reason?: DeleteAccountReason) => {
    await deleteAccount(reason);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Screen Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Header Anchor */}
        <ProfileHeader
          user={user}
          onEditPress={() => router.push('/profile/edit' as any)}
        />

        {/* 2. Stats Summary Row */}
        <ProfileStatsRow stats={user?.stats} />

        {/* 3. Data-Driven Menu Sections */}
        {PROFILE_MENU_SECTIONS.map((section) => (
          <ProfileMenuSection
            key={section.id}
            section={section}
            onPressItem={handleMenuItemPress}
          />
        ))}

        {/* 4. Standalone Log Out Card (Cohesive with menu cards, distinct danger tone) */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.logoutCard}
          onPress={handleTriggerLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out of Tasklync"
        >
          <View style={styles.logoutIconContainer}>
            <LogOut size={18} color={colors.textDanger} strokeWidth={2.2} />
          </View>
          <Text style={styles.logoutCardText}>Log Out</Text>
        </TouchableOpacity>

        {/* 5. Version & Security Footer */}
        <View style={styles.footerNote}>
          <Text style={styles.versionText}>Tasklync v1.0.0 (Build 38)</Text>
          <Text style={styles.copyText}>Escrow-Protected Home Services Platform</Text>
        </View>
      </ScrollView>

      {/* Confirmation Dialogs */}
      <LogoutConfirmSheet
        visible={logoutModalVisible}
        onConfirm={async () => {
          setLogoutModalVisible(false);
          await logout();
        }}
        onCancel={() => setLogoutModalVisible(false)}
        isLoading={isLoggingOut}
      />

      <DeleteAccountSheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
        onDeleteAccount={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 24,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCardText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14.5,
    color: colors.textDanger,
    letterSpacing: -0.2,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  versionText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: '#94A3B8',
  },
  copyText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 11,
    color: '#CBD5E1',
  },
});
