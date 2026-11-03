import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../feedback/EmptyState';
import { ConversationFilterTab } from '../../types/chat.types';

interface ConversationEmptyStateProps {
  searchQuery: string;
  activeTab: ConversationFilterTab;
  onClearSearch: () => void;
  onResetTab: () => void;
}

export const ConversationEmptyState: React.FC<ConversationEmptyStateProps> = ({
  searchQuery,
  activeTab,
  onClearSearch,
  onResetTab,
}) => {
  const router = useRouter();

  if (searchQuery.trim().length > 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          type="no-data"
          title="No results found"
          description={`No conversations found matching "${searchQuery}". Try searching with a different name or profession.`}
          actionLabel="Clear Search"
          onAction={onClearSearch}
        />
      </View>
    );
  }

  if (activeTab === 'unread') {
    return (
      <View style={styles.container}>
        <EmptyState
          type="no-data"
          title="All caught up!"
          description="You don't have any unread messages at the moment."
          actionLabel="View All Messages"
          onAction={onResetTab}
        />
      </View>
    );
  }

  if (activeTab === 'active') {
    return (
      <View style={styles.container}>
        <EmptyState
          type="no-data"
          title="No active conversations"
          description="You don't have any in-progress or scheduled bookings with active chats."
          actionLabel="Explore Services"
          onAction={() => router.push('/(tabs)/explore')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EmptyState
        type="no-data"
        title="No conversations yet"
        description="Your conversations with service workers will appear here."
        actionLabel="Explore Services"
        onAction={() => router.push('/(tabs)/explore')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
