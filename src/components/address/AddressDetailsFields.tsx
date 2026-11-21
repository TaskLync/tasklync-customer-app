import { View, StyleSheet } from 'react-native';
import { AddressNotesInput } from './AddressNotesInput';
import { ADDRESS_DETAIL_LIMITS, type AddressDetailsInput } from '../../utils/addressDetails';

export interface AddressDetailsFieldsProps {
  value: AddressDetailsInput;
  onChange: (next: AddressDetailsInput) => void;
  onFocus?: (() => void) | undefined;
  onBlur?: (() => void) | undefined;
}

/**
 * Pakistan-style address parts. Many homes have no number on the map, so the professional finds
 * the door through house / street / block + society + a landmark + directions (audit LOC-005).
 * All optional: the confirmed pin is always the destination.
 */
export const AddressDetailsFields: React.FC<AddressDetailsFieldsProps> = ({ value, onChange, onFocus, onBlur }) => {
  const set = (key: keyof AddressDetailsInput) => (text: string) => onChange({ ...value, [key]: text });
  const common = { onFocus, onBlur };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.half}>
          <AddressNotesInput
            {...common}
            label="House / flat / shop"
            placeholder="e.g. House 123"
            value={value.house_unit}
            onChangeText={set('house_unit')}
            maxLength={ADDRESS_DETAIL_LIMITS.house_unit}
            accessibilityHint="House, plot, flat or shop number"
          />
        </View>
        <View style={styles.half}>
          <AddressNotesInput
            {...common}
            label="Street / lane"
            placeholder="e.g. Street 5"
            value={value.street}
            onChangeText={set('street')}
            maxLength={ADDRESS_DETAIL_LIMITS.street}
            accessibilityHint="Street or lane name or number"
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <AddressNotesInput
            {...common}
            label="Block / phase"
            placeholder="e.g. Block A"
            value={value.block_phase}
            onChangeText={set('block_phase')}
            maxLength={ADDRESS_DETAIL_LIMITS.block_phase}
            accessibilityHint="Block, phase or sector"
          />
        </View>
        <View style={styles.half}>
          <AddressNotesInput
            {...common}
            label="Society / area"
            placeholder="e.g. Madina Town"
            value={value.area}
            onChangeText={set('area')}
            maxLength={ADDRESS_DETAIL_LIMITS.area}
            accessibilityHint="Society, colony or town"
          />
        </View>
      </View>
      <AddressNotesInput
        {...common}
        label="Nearby landmark"
        placeholder="e.g. Near University Gate"
        value={value.landmark}
        onChangeText={set('landmark')}
        maxLength={ADDRESS_DETAIL_LIMITS.landmark}
        accessibilityHint="A well-known place near your address"
      />
      <AddressNotesInput
        {...common}
        value={value.instructions}
        onChangeText={set('instructions')}
        maxLength={ADDRESS_DETAIL_LIMITS.instructions}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
});
