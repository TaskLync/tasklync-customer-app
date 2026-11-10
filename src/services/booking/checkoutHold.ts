import { workerApi } from '../api/worker.api';
import { createSlotHoldManager } from './slotHold';

/** The app's single checkout hold (one booking funnel at a time). */
export const checkoutHold = createSlotHoldManager(workerApi);
