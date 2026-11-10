import { View, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { Svg, Path, Defs, ClipPath, Rect, G } from 'react-native-svg';
import { fontFamily as fonts } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface ReviewStarRowProps {
  rating: number; // 1-5
  punctuality?: number | null | undefined;
  quality?: number | null | undefined;
  communication?: number | null | undefined;
  value?: number | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  numberStyle?: TextStyle;
  style?: ViewStyle;
}

const StarIcon = ({ filled, half, sizePx }: { filled: boolean; half?: boolean; sizePx: number }) => {
  const { colors } = useAppTheme();
  if (half) {
    return (
      <Svg width={sizePx} height={sizePx} viewBox="0 0 24 24">
        <Defs>
          <ClipPath id="half-clip">
            <Rect x="0" y="0" width="12" height="24" />
          </ClipPath>
        </Defs>
        <Path
          d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"
          fill={colors.border}
        />
        <G clipPath="url(#half-clip)">
          <Path
            d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"
            fill="#F59E0B"
          />
        </G>
      </Svg>
    );
  }

  return (
    <Svg width={sizePx} height={sizePx} viewBox="0 0 24 24">
      <Path
        d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"
        fill={filled ? '#F59E0B' : colors.border}
      />
    </Svg>
  );
};

export const ReviewStarRow = ({
  rating,
  size = 'md',
  showNumber = false,
  numberStyle,
  style,
}: ReviewStarRowProps) => {
  const styles = useThemedStyles(createStyles);
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 28,
  };
  const gapMap = {
    xs: 2,
    sm: 2,
    md: 3,
    lg: 4,
  };

  const sizePx = sizeMap[size];
  const gapPx = gapMap[size];

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = rating >= i - 0.25;
      const isHalf = !isFull && rating >= i - 0.75;
      stars.push(
        <View key={i} style={{ marginRight: i === 5 ? 0 : gapPx }}>
          <StarIcon filled={isFull} half={isHalf} sizePx={sizePx} />
        </View>
      );
    }
    return stars;
  };

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityLabel={`Rating: ${rating.toFixed(1)} out of 5 stars`}
      accessibilityRole="image"
    >
      {showNumber && (
        <Text
          style={[
            styles.numberText,
            { fontSize: sizePx, lineHeight: sizePx },
            numberStyle,
          ]}
        >
          {rating.toFixed(1)}
        </Text>
      )}
      <View style={styles.starsContainer} aria-hidden={true}>
        {renderStars()}
      </View>
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberText: {
    fontFamily: fonts.inter.semiBold,
    color: colors.textPrimary,
    marginRight: 6,
  },
});
