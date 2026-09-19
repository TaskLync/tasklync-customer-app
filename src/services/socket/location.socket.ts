import { socketService } from './socket.service';

export interface WorkerLocationPayload {
  bookingId: string;
  workerId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: string;
}

export const locationSocket = {
  subscribeToWorker: (bookingId: string) => {
    socketService.emit('location:subscribe', { bookingId });
  },

  unsubscribeFromWorker: (bookingId: string) => {
    socketService.emit('location:unsubscribe', { bookingId });
  },

  onWorkerLocationUpdate: (callback: (data: WorkerLocationPayload) => void) => {
    socketService.on('location:update', callback);
    socketService.on('worker:location', callback);
  },

  offWorkerLocationUpdate: (callback: (data: WorkerLocationPayload) => void) => {
    socketService.off('location:update', callback);
    socketService.off('worker:location', callback);
  },
};
