import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmptyState } from '../feedback/EmptyState';

interface AddressEmptyStateProps {
  onAddPress: () => void;
}

export const AddressEmptyState: React.FC<AddressEmptyStateProps> = ({ onAddPress }) => {
  return (
    <View style={styles.container}>
      <EmptyState
        type="no-data"
        title="No saved addresses yet"
        description="Add an address to book services faster"
        actionLabel="Add Address"
        onAction={onAddPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
