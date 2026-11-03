import { View, Text, StyleSheet } from 'react-native';
import { CardBrand } from '../../types/payment.types';
import { CreditCard, Banknote } from 'lucide-react-native';
import { palette, fontFamily } from '../../design';

export interface CardBrandIconProps {
  brand?: CardBrand | string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardBrandIcon: React.FC<CardBrandIconProps> = ({ brand = 'unknown', size = 'md' }) => {
  const normalized = (brand || 'unknown').toLowerCase();

  // Width & height: 36×24px for md, 44×28px for lg, 30×20px for sm
  const dimensions =
    size === 'lg'
      ? { width: 44, height: 28, radius: 6 }
      : size === 'sm'
      ? { width: 30, height: 20, radius: 4 }
      : { width: 36, height: 24, radius: 5 };

  if (normalized === 'jazzcash') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.radius,
            backgroundColor: palette.red600, // JazzCash Red
            borderColor: palette.red700,
          },
        ]}
      >
        <Text style={styles.jazzText}>JC</Text>
      </View>
    );
  }

  if (normalized === 'easypaisa') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.radius,
            backgroundColor: palette.emerald600, // EasyPaisa Emerald
            borderColor: palette.emerald700,
          },
        ]}
      >
        <Text style={styles.epText}>EP</Text>
      </View>
    );
  }

  if (normalized === 'cash') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.radius,
            backgroundColor: palette.green100,
            borderColor: palette.green300,
          },
        ]}
      >
        <Banknote size={15} color={palette.green800} />
      </View>
    );
  }

  if (normalized === 'visa') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.radius,
            backgroundColor: palette.blue900, // Visa Navy
            borderColor: palette.blue950 || palette.blue900,
          },
        ]}
      >
        <Text style={styles.visaText}>VISA</Text>
      </View>
    );
  }

  if (normalized === 'mastercard') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.radius,
            backgroundColor: palette.slate800,
            borderColor: palette.slate700,
          },
        ]}
      >
        <View style={styles.mcCircles}>
          <View style={[styles.mcCircle, { backgroundColor: palette.red600 }]} />
          <View style={[styles.mcCircle, { backgroundColor: palette.amber500, marginLeft: -5, opacity: 0.9 }]} />
        </View>
      </View>
    );
  }

  if (normalized === 'paypak' || normalized === 'unionpay') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.radius,
            backgroundColor: palette.sky600,
            borderColor: palette.sky700,
          },
        ]}
      >
        <Text style={styles.paypakText}>{normalized === 'paypak' ? 'PAYPAK' : 'UPI'}</Text>
      </View>
    );
  }

  if (normalized === 'amex') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.radius,
            backgroundColor: palette.sky600,
            borderColor: palette.sky700,
          },
        ]}
      >
        <Text style={styles.amexText}>AMEX</Text>
      </View>
    );
  }

  // Generic Card
  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.radius,
          backgroundColor: palette.gray100,
          borderColor: palette.gray300,
        },
      ]}
    >
      <CreditCard size={14} color={palette.gray600} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  jazzText: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 10,
    color: palette.amber200, // Bright yellow
    letterSpacing: 0.5,
  },
  epText: {
    fontFamily: fontFamily.poppins.bold,
    fontSize: 10,
    color: palette.white,
    letterSpacing: 0.5,
  },
  visaText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 9,
    color: palette.white,
    fontStyle: 'italic',
    letterSpacing: 0.8,
  },
  paypakText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 7,
    color: palette.white,
    letterSpacing: 0.2,
  },
  amexText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 7.5,
    color: palette.white,
    letterSpacing: 0.3,
  },
  mcCircles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
});
