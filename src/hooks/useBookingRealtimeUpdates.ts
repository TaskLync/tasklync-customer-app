import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '../services/socket/socket.service';

interface UseBookingRealtimeUpdatesOptions {
  bookingId?: string;
  onReassigned?: (data: { newWorkerName: string; newWorkerPhone?: string | null; reason?: string | null }) => void;
  onStatusChanged?: (status: string) => void;
}

export function useBookingRealtimeUpdates({
  bookingId,
  onReassigned,
  onStatusChanged,
}: UseBookingRealtimeUpdatesOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookingId) return;

    // Join the booking room
    socketService.emit('booking.join', { booking_id: bookingId });

    // Handle acceptance
    const handleAccepted = () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-verification-otp', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    };

    // Handle reassignment (when company assigns new technician)
    const handleReassigned = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', bookingId] });
      if (onReassigned) {
        onReassigned({
          newWorkerName: payload?.new_worker_name || payload?.newWorkerName || 'New Technician',
          newWorkerPhone: payload?.new_worker_phone || payload?.newWorkerPhone || null,
          reason: payload?.reason || null,
        });
      }
    };

    // Handle status change
    const handleStatusChanged = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-details', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId, 'track'] });
      queryClient.invalidateQueries({ queryKey: ['booking-verification-otp', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-verification-qr', bookingId] });
      if (onStatusChanged && payload?.status) {
        onStatusChanged(payload.status);
      }
    };

    socketService.on('booking.accepted', handleAccepted);
    socketService.on('booking.reassigned', handleReassigned);
    socketService.on('booking.status_changed', handleStatusChanged);

    return () => {
      socketService.emit('booking.leave', { booking_id: bookingId });
      socketService.off('booking.accepted', handleAccepted);
      socketService.off('booking.reassigned', handleReassigned);
      socketService.off('booking.status_changed', handleStatusChanged);
    };
  }, [bookingId, queryClient, onReassigned, onStatusChanged]);
}
