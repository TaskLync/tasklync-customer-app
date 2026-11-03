import React, { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { EmptyState } from '../feedback/EmptyState';

interface MapEmptyStateProps {
  onResetFilters: () => void;
}

export const MapEmptyState: FC<MapEmptyStateProps> = ({ onResetFilters }) => {
  return (
    <View style={styles.container}>
      <EmptyState
        type="no-workers"
        title="No workers found nearby"
        description="Try changing your selected category or widening your search radius."
        actionLabel="Reset filters"
        onAction={onResetFilters}
        compact={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
  },
});
