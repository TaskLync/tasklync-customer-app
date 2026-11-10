import { FC } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { typography } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface MapSearchBarProps {
  placeholder?: string;
}

export const MapSearchBar: FC<MapSearchBarProps> = ({
  placeholder = 'Search services or workers...',
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const handlePress = () => {
    router.push('/search');
  };

  const handleFilterPress = () => {
    router.push('/search/filters');
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      accessibilityRole="search"
      accessibilityLabel="Search services or workers"
    >
      <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
      <Text style={styles.placeholderText} numberOfLines={1}>
        {placeholder}
      </Text>
      <Pressable
        style={styles.filterButton}
        onPress={handleFilterPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Open search filters"
      >
        <SlidersHorizontal size={16} color={colors.primaryDark} />
      </Pressable>
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: colors.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  searchIcon: {
    marginRight: 10,
  },
  placeholderText: {
    flex: 1,
    fontFamily: typography.fontFamily.jakarta.medium,
    fontSize: typography.fontSize.body2,
    color: colors.textMuted,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
