import { FC } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ZoomControlProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const ZoomControl: FC<ZoomControlProps> = ({
  onZoomIn,
  onZoomOut,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const handleZoomIn = () => {
    onZoomIn();
  };

  const handleZoomOut = () => {
    onZoomOut();
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.topButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleZoomIn}
        hitSlop={8}
        accessibilityLabel="Zoom map in"
        accessibilityRole="button"
      >
        <Plus size={20} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.bottomButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleZoomOut}
        hitSlop={8}
        accessibilityLabel="Zoom map out"
        accessibilityRole="button"
      >
        <Minus size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    width: 44,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  button: {
    width: 44,
    height: 44, // Fitts's Law: 44px minimum tap target
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  buttonPressed: {
    backgroundColor: colors.bgSection,
  },
  topButton: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  bottomButton: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    width: '100%',
  },
});
