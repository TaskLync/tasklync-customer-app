import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';

// Design system

// Success Subcomponents
import { SuccessCelebration } from '../../src/components/booking/success/SuccessCelebration';
import { SuccessHeadline } from '../../src/components/booking/success/SuccessHeadline';
import {
  SuccessSubtitle,
  BookingIdCard,
} from '../../src/components/booking/success/SuccessSubtitle';
import { SuccessCTAGroup } from '../../src/components/booking/success/SuccessCTAGroup';
import { Reveal } from '../../src/components/booking/success/Reveal';
import { useThemedStyles, type AppTheme } from '../../src/theme/useAppTheme';
import { ThemedStatusBar } from '../../src/theme/ThemedStatusBar';

export default function SuccessScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId || '';

  // Driven by <SuccessCelebration /> once the circle forms; staggers the content in.
  const reveal = useSharedValue(0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ThemedStatusBar />
      <View style={styles.content}>
        {/* 1. Progress line → success circle + drawn checkmark */}
        <SuccessCelebration reveal={reveal} />

        {/* 2. Headline */}
        <Reveal reveal={reveal} index={0}>
          <SuccessHeadline title="Booking Confirmed!" />
        </Reveal>

        {/* 3. Short confirmation message */}
        <Reveal reveal={reveal} index={1} style={styles.message}>
          <SuccessSubtitle />
        </Reveal>

        {/* 4. Booking ID */}
        <Reveal reveal={reveal} index={2} style={styles.idRow}>
          <BookingIdCard bookingId={bookingId} />
        </Reveal>
      </View>

      {/* 5. Track Booking + Back to Home */}
      <Reveal reveal={reveal} index={3}>
        <SuccessCTAGroup bookingId={bookingId} />
      </Reveal>
    </SafeAreaView>
  );
}

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  message: {
    marginTop: 12,
  },
  idRow: {
    width: '100%',
  },
});
