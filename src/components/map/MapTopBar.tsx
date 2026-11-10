import { FC } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CategoryFilterChips } from './CategoryFilterChips';
import { MapSearchBar } from './MapSearchBar';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface MapTopBarProps {
  showSearchBar?: boolean;
}

export const MapTopBar: FC<MapTopBarProps> = ({
  showSearchBar = true,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={handleBack}
          hitSlop={10}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>

        {showSearchBar && (
          <View style={styles.searchContainer}>
            <MapSearchBar />
          </View>
        )}
      </View>

      <CategoryFilterChips />
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  backButton: {
    width: 44,
    height: 44, // Fitts's Law touch target
    borderRadius: 22,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonPressed: {
    backgroundColor: colors.bgSection,
    transform: [{ scale: 0.96 }],
  },
  searchContainer: {
    flex: 1,
    marginLeft: -4,
  },
});
