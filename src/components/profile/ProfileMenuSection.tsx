import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileMenuSectionConfig, ProfileMenuItemConfig } from '../../types/user.types';
import { ProfileMenuItem } from './ProfileMenuItem';
import { fontFamily } from '../../design';

export interface ProfileMenuSectionProps {
  section: ProfileMenuSectionConfig;
  onPressItem: (item: ProfileMenuItemConfig) => void;
}

/**
 * ProfileMenuSection Component
 *
 * Clean section grouping:
 * - Subtle uppercase section title
 * - Separate rounded rectangular cards for each item
 */
export const ProfileMenuSection: React.FC<ProfileMenuSectionProps> = ({
  section,
  onPressItem,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{section.sectionTitle}</Text>

      <View style={styles.itemsList}>
        {section.items.map((item) => (
          <ProfileMenuItem
            key={item.id}
            item={item}
            onPress={onPressItem}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemsList: {
    gap: 8,
  },
});
