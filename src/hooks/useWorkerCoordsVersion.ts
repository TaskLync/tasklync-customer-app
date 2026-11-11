import { useSyncExternalStore } from 'react';
import { getWorkerCoordsVersion, subscribeWorkerCoords } from '../utils/locationUtils';

/** Changes whenever a worker's live coordinates change; include in memo deps of distance labels. */
export const useWorkerCoordsVersion = (): number =>
  useSyncExternalStore(subscribeWorkerCoords, getWorkerCoordsVersion, getWorkerCoordsVersion);
