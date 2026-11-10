import { useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessagesHeader,
  ConversationTabs,
  ConversationRow,
  SkeletonConversationRow,
  ConversationEmptyState,
} from '../../src/components/chat';
import { SkeletonGroup } from '../../src/components/ui/Skeleton';
import { SearchInput } from '../../src/components/ui/Input/SearchInput';
import { useConversations } from '../../src/hooks/useConversations';
import { ConversationItem } from '../../src/types/chat.types';
import { radius } from '../../src/design/radius';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    conversations,
    isLoading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    totalUnreadCount,
    refetch,
    markAsRead,
  } = useConversations();

  const lastRefetchTime = useRef<number>(0);

  // Refresh conversation list when tab is focused (throttled to avoid layout jitter)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRefetchTime.current > 30000) {
        lastRefetchTime.current = now;
        refetch();
      }
    }, [refetch])
  );

  const handleConversationPress = useCallback(
    (item: ConversationItem) => {
      markAsRead(item);
      router.push({
        pathname: '/booking/[id]/chat' as any,
        params: {
          id: item.bookingId,
          workerName: item.workerName,
          workerAvatar: item.workerAvatarUrl,
          categoryName: item.categoryName,
          workerPhone: item.workerPhone,
          workerId: item.workerId,
        },
      });
    },
    [markAsRead, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationItem }) => (
      <ConversationRow item={item} onPress={handleConversationPress} />
    ),
    [handleConversationPress]
  );

  const keyExtractor = useCallback((item: ConversationItem) => item.id, []);

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <SkeletonGroup accessibilityLabel="Loading conversations">
          <SkeletonConversationRow />
          <SkeletonConversationRow />
          <SkeletonConversationRow />
          <SkeletonConversationRow />
        </SkeletonGroup>
      );
    }

    return (
      <ConversationEmptyState
        searchQuery={searchQuery}
        activeTab={activeTab}
        onClearSearch={() => setSearchQuery('')}
        onResetTab={() => setActiveTab('all')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ThemedStatusBar />

      {/* Screen Header */}
      <MessagesHeader totalUnreadCount={totalUnreadCount} />

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search conversations or workers..."
          autoFocus={false}
          height={56}
          style={styles.searchInput}
        />
      </View>

      {/* Category / Status Filter Tabs */}
      <ConversationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={totalUnreadCount}
      />

      {/* Conversations List */}
      <FlatList
        data={isLoading ? [] : conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && !isLoading && styles.listContentEmpty,
          { paddingBottom: Math.max(insets.bottom, 16) + 96 },
        ]}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchInput: {
    height: 56,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.bgApp,
    borderColor: colors.border,
    borderWidth: 1.2,
  },
  listContent: {
    paddingTop: 12,
    flexGrow: 1,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 0,
  },
});
