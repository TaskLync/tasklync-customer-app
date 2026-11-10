import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { typography } from '../../design/typography';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface ServicePriceTagProps {
  amount: number | null;
  priceType: 'fixed' | 'hourly' | 'visit' | 'quote';
  showFrom?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const ServicePriceTag: React.FC<ServicePriceTagProps> = ({
  amount,
  priceType,
  showFrom = false,
  size = 'md',
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  const formatPrice = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getFontSizes = () => {
    switch (size) {
      case 'sm':
        return {
          fromSize: 11,
          priceSize: 13,
          unitSize: 11,
          fontWeight: typography.fontFamily.inter.semiBold,
        };
      case 'lg':
        return {
          fromSize: 14,
          priceSize: 20,
          unitSize: 14,
          fontWeight: typography.fontFamily.inter.bold,
        };
      case 'md':
      default:
        return {
          fromSize: 12,
          priceSize: 15,
          unitSize: 12,
          fontWeight: typography.fontFamily.inter.semiBold,
        };
    }
  };

  const { fromSize, priceSize, unitSize, fontWeight } = getFontSizes();

  if (priceType === 'quote' || amount === null) {
    return (
      <View style={[styles.container, style]}>
        <Text
          style={[
            styles.quoteText,
            {
              fontSize: priceSize,
              fontFamily: typography.fontFamily.jakarta.semiBold,
            },
          ]}
        >
          Get Quote
        </Text>
      </View>
    );
  }

  const getUnitSuffix = () => {
    switch (priceType) {
      case 'hourly':
        return '/hr';
      case 'visit':
        return '/visit';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, style]}>
      {showFrom && (
        <Text
          style={[
            styles.fromText,
            {
              fontSize: fromSize,
              fontFamily: typography.fontFamily.jakarta.regular,
            },
          ]}
        >
          From{' '}
        </Text>
      )}

      <Text
        style={[
          styles.priceText,
          {
            fontSize: priceSize,
            fontFamily: fontWeight,
          },
        ]}
      >
        Rs {formatPrice(amount)}
      </Text>

      {priceType !== 'fixed' && (
        <Text
          style={[
            styles.unitText,
            {
              fontSize: unitSize,
              fontFamily: typography.fontFamily.jakarta.regular,
            },
          ]}
        >
          {getUnitSuffix()}
        </Text>
      )}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fromText: {
    color: colors.textMuted,
  },
  priceText: {
    color: colors.primary,
  },
  unitText: {
    color: colors.textMuted,
  },
  quoteText: {
    color: colors.primary,
  },
});
