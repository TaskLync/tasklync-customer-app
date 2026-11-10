import { useState, useCallback, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../utils/imageCompression';
import { chatApi } from '../services/api/chat.api';
import { EvidenceSlotState } from '../types/booking.types';
import { showAlert } from '../components/feedback/AppAlert';

const MAX_SLOTS = 3;

const createInitialSlots = (): EvidenceSlotState[] => [
  { id: 'slot-0', status: 'idle', progress: 0 },
  { id: 'slot-1', status: 'idle', progress: 0 },
  { id: 'slot-2', status: 'idle', progress: 0 },
];

export function useEvidenceUpload(bookingId?: string | null) {
  const [slots, setSlots] = useState<EvidenceSlotState[]>(createInitialSlots);

  /**
   * Internal upload execution for a specific slot index
   */
  const executeUpload = useCallback(
    async (slotIndex: number, localUri: string) => {
      const targetBookingId = bookingId || 'temp_dispute_evidence';

      setSlots((prev) => {
        const updated = [...prev];
        updated[slotIndex] = {
          ...updated[slotIndex],
          localUri,
          status: 'uploading',
          progress: 5,
          error: null,
        };
        return updated;
      });

      try {
        const onProgress = (percent: number) => {
          setSlots((prev) => {
            const updated = [...prev];
            if (updated[slotIndex]?.status === 'uploading') {
              updated[slotIndex] = {
                ...updated[slotIndex],
                progress: Math.max(percent, 5),
              };
            }
            return updated;
          });
        };

        const result = await chatApi.uploadMedia(
          targetBookingId,
          localUri,
          'image/jpeg',
          onProgress
        );


        setSlots((prev) => {
          const updated = [...prev];
          updated[slotIndex] = {
            ...updated[slotIndex],
            status: 'success',
            uploadedUrl: result.media_url,
            progress: 100,
            error: null,
          };
          return updated;
        });
      } catch (err: any) {

        setSlots((prev) => {
          const updated = [...prev];
          updated[slotIndex] = {
            ...updated[slotIndex],
            status: 'error',
            error: err?.message || 'Upload failed. Tap to retry.',
          };
          return updated;
        });
      }
    },
    [bookingId]
  );

  /**
   * Pick an image from camera or gallery and compress before upload
   */
  const pickImage = useCallback(
    async (slotIndex: number, source: 'camera' | 'gallery') => {
      if (slotIndex < 0 || slotIndex >= MAX_SLOTS) return;

      try {
        let pickerResult: ImagePicker.ImagePickerResult;

        if (source === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            showAlert('Camera access is required to capture evidence photos.');
            return;
          }

          pickerResult = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          });
        } else {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            showAlert('Gallery access is required to select evidence photos.');
            return;
          }

          pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          });
        }

        if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
          return;
        }

        const rawUri = pickerResult.assets[0].uri;

        // Compress image to <300KB band
        const compressed = await compressImage(rawUri, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.7,
        });

        // Trigger upload
        await executeUpload(slotIndex, compressed.uri);
      } catch (err) {
        if (__DEV__) {
          console.warn('[useEvidenceUpload] Image pick failed:', err);
        }
      }
    },
    [executeUpload]
  );

  /**
   * Retry failed upload using existing cached local compressed image URI
   */
  const retryUpload = useCallback(
    async (slotIndex: number) => {
      const slot = slots[slotIndex];
      if (slot && slot.localUri) {
        await executeUpload(slotIndex, slot.localUri);
      }
    },
    [executeUpload, slots]
  );

  /**
   * Remove photo and clear slot back to idle state
   */
  const removeSlot = useCallback((slotIndex: number) => {

    setSlots((prev) => {
      const updated = [...prev];
      updated[slotIndex] = {
        id: `slot-${slotIndex}`,
        status: 'idle',
        localUri: null,
        uploadedUrl: null,
        progress: 0,
        error: null,
      };
      return updated;
    });
  }, []);

  /**
   * Reset all slots to initial idle state
   */
  const reset = useCallback(() => {
    setSlots(createInitialSlots());
  }, []);

  const uploadedUrls = useMemo(() => {
    return slots
      .filter((s) => s.status === 'success' && Boolean(s.uploadedUrl))
      .map((s) => s.uploadedUrl as string);
  }, [slots]);

  const isAnyUploading = useMemo(() => {
    return slots.some((s) => s.status === 'uploading');
  }, [slots]);

  const isAnyError = useMemo(() => {
    return slots.some((s) => s.status === 'error');
  }, [slots]);

  return {
    slots,
    uploadedUrls,
    isAnyUploading,
    isAnyError,
    pickImage,
    retryUpload,
    removeSlot,
    reset,
  };
}
