import { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessagesHeader,
  ConversationTabs,
  ConversationRow,
  SkeletonConversationRow,
  ConversationEmptyState,
} from '../../src/components/chat';
import { SearchInput } from '../../src/components/ui/Input/SearchInput';
import { useConversations } from '../../src/hooks/useConversations';
import { ConversationItem } from '../../src/types/chat.types';
import { colors } from '../../src/design/colors';
import { radius } from '../../src/design/radius';

export default function MessagesScreen() {
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
      markAsRead(item.bookingId);
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
        <View style={styles.skeletonContainer}>
          <SkeletonConversationRow />
          <SkeletonConversationRow />
          <SkeletonConversationRow />
          <SkeletonConversationRow />
        </View>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInput: {
    height: 56,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1.2,
  },
  listContent: {
    paddingTop: 12,
    flexGrow: 1,
  },
  skeletonContainer: {
    paddingTop: 6,
  },
});
