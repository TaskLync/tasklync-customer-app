import { createMMKV } from 'react-native-mmkv';
import { createBookingIdempotency } from './bookingIdempotency.core';

export { bookingDetailsFingerprint, newIdempotencyKey } from './bookingIdempotency.core';

/** Persisted in MMKV so the key survives the app being killed between "request sent" and "response received". */
export const bookingIdempotency = createBookingIdempotency(createMMKV());
