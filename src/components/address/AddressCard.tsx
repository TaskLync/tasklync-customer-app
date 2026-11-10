import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Address } from '../../types/address.types';
import { labelToIcon } from '../../utils/address';
import { DefaultAddressBadge } from './DefaultAddressBadge';
import { fontFamily, fontSize } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface AddressCardProps {
  address: Address;
  onPress?: ((address: Address) => void) | undefined;
  onLongPress?: ((address: Address) => void) | undefined;
  isSelected?: boolean | undefined;
  onSelect?: ((address: any) => void) | undefined;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onPress,
  onLongPress,
  isSelected,
  onSelect,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { label, custom_label, address_line, city, is_default } = address as any;
  const displayLabel = custom_label || label || 'Address';
  const IconComponent = labelToIcon(label);

  const isSelectionMode = isSelected !== undefined;

  const handlePress = () => {
    if (onSelect) {
      onSelect(address);
    } else if (onPress) {
      onPress(address);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(address);
    }
  };

  const street = address_line || (address as any).street || '';
  const fullAddressLine = [street, city].filter(Boolean).join(', ');
  const a11yLabel = `${displayLabel}, ${fullAddressLine}${
    is_default ? ', Default address' : ''
  }${isSelectionMode && isSelected ? ', selected' : ''}`;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        isSelectionMode && isSelected ? styles.cardSelected : styles.cardUnselected,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole={isSelectionMode ? 'radio' : 'button'}
      accessibilityState={isSelectionMode ? { selected: isSelected } : undefined}
      accessibilityLabel={a11yLabel}
      accessibilityHint={
        isSelectionMode
          ? 'Double tap to select this address'
          : 'Double tap to edit address. Long press for options.'
      }
    >
      <View style={styles.contentRow}>
        {/* Left: 40px Icon Circle with Tinted Background */}
        <View
          style={[
            styles.iconCircle,
            isSelectionMode && isSelected ? styles.iconCircleSelected : styles.iconCircleUnselected,
          ]}
        >
          <IconComponent
            size={20}
            color={isSelectionMode && isSelected ? colors.primaryDark : palette.gray600}
            strokeWidth={2.2}
          />
        </View>

        {/* Middle: 2-Line Text Block */}
        <View style={styles.textContainer}>
          <Text
            style={styles.labelTitle}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {displayLabel}
          </Text>
          <Text
            style={styles.addressSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.3}
          >
            {fullAddressLine}
          </Text>
        </View>

        {/* Right Section */}
        {isSelectionMode ? (
          <View
            style={[
              styles.radioOuter,
              isSelected ? styles.radioOuterSelected : styles.radioOuterUnselected,
            ]}
          >
            {isSelected && <Check size={12} color={palette.pureWhite} strokeWidth={3} />}
          </View>
        ) : (
          <View style={styles.rightContainer}>
            {is_default ? <DefaultAddressBadge /> : <View style={styles.emptyBadgeSpacer} />}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    minHeight: 68,
    paddingVertical: 14,
    backgroundColor: palette.white,
    justifyContent: 'center',
  },
  cardUnselected: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardSelected: {
    backgroundColor: colors.primaryTint,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  cardPressed: {
    backgroundColor: colors.bgSection,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleUnselected: {
    backgroundColor: colors.bgSection,
  },
  iconCircleSelected: {
    backgroundColor: palette.green100,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  labelTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  addressSubtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightContainer: {
    minWidth: 54,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  emptyBadgeSpacer: {
    width: 1,
    height: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterUnselected: {
    borderWidth: 2,
    borderColor: palette.gray300,
  },
  radioOuterSelected: {
    backgroundColor: colors.primary,
  },
});
