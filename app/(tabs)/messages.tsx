import { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  MessagesHeader,
  ConversationTabs,
  ConversationRow,
  ConversationSearchBar,
  SkeletonConversationRow,
  ConversationEmptyState,
} from '../../src/components/chat';
import { CONVERSATION_ROW } from '../../src/components/chat/ConversationRow';
import { SkeletonGroup } from '../../src/components/ui/Skeleton';
import { useConversations } from '../../src/hooks/useConversations';
import { ConversationItem } from '../../src/types/chat.types';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

const SKELETON_ROWS = [
  { nameWidth: 132, previewWidth: '82%' },
  { nameWidth: 104, previewWidth: '68%' },
  { nameWidth: 148, previewWidth: '76%' },
  { nameWidth: 118, previewWidth: '58%' },
  { nameWidth: 126, previewWidth: '72%' },
] as const;

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

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

  // Filter switch: a short cross-fade of the list instead of a hard content swap.
  const listOpacity = useSharedValue(1);
  const isFirstTab = useRef(true);
  useEffect(() => {
    if (isFirstTab.current) {
      isFirstTab.current = false;
      return;
    }
    listOpacity.value = 0.25;
    listOpacity.value = withTiming(1, { duration: 200 });
  }, [activeTab, listOpacity]);
  const listFade = useAnimatedStyle(() => ({ opacity: listOpacity.value }));

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
    ({ item }: { item: ConversationItem }) => <ConversationRow item={item} onPress={handleConversationPress} />,
    [handleConversationPress]
  );

  const keyExtractor = useCallback((item: ConversationItem) => item.id, []);

  const renderSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);

  const clearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);
  const resetTab = useCallback(() => setActiveTab('all'), [setActiveTab]);

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <SkeletonGroup accessibilityLabel="Loading conversations">
          {SKELETON_ROWS.map((r, i) => (
            <SkeletonConversationRow key={i} nameWidth={r.nameWidth} previewWidth={r.previewWidth} />
          ))}
        </SkeletonGroup>
      );
    }

    return (
      <ConversationEmptyState
        searchQuery={searchQuery}
        activeTab={activeTab}
        onClearSearch={clearSearch}
        onResetTab={resetTab}
      />
    );
  };

  const isEmpty = !isLoading && conversations.length === 0;

  return (
    <View style={styles.container}>
      <ThemedStatusBar />

      <MessagesHeader />

      <View style={styles.searchWrap}>
        <ConversationSearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={clearSearch} />
      </View>

      <ConversationTabs activeTab={activeTab} onTabChange={setActiveTab} unreadCount={totalUnreadCount} />

      <Animated.View style={[styles.listWrap, listFade]}>
        <FlatList
          data={isLoading ? [] : conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.listContentEmpty,
            styles.listBottom,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={10}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={colors.neutralInkSecondary}
              colors={[colors.neutralInk]}
              progressBackgroundColor={colors.neutralBg}
            />
          }
        />
      </Animated.View>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.neutralBg,
    },
    searchWrap: {
      paddingHorizontal: 20,
    },
    listWrap: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingTop: 4,
    },
    listBottom: {
      paddingBottom: 24,
    },
    listContentEmpty: {
      justifyContent: 'center',
    },
    separator: {
      height: 1,
      marginLeft: CONVERSATION_ROW.textInset,
      backgroundColor: colors.neutralDivider,
    },
  });
