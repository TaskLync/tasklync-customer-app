import { useState, useCallback, useRef } from 'react';

import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../../utils/imageCompression';
import { customRequestApi } from '../../services/api/customRequest.api';
import { CustomServiceRequestMediaInput } from '../../types/customRequest.types';
import { showAlert } from '../../components/feedback/AppAlert';

export const MAX_CUSTOM_REQUEST_MEDIA = 6;
export const MAX_CUSTOM_REQUEST_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_CUSTOM_REQUEST_VIDEO_BYTES = 30 * 1024 * 1024; // 30 MB

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export interface MediaUploadSlot {
  id: string;
  localUri: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mimeType: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  uploadedUrl?: string | undefined;
  cloudinaryPublicId?: string | undefined;
  fileSizeBytes?: number | undefined;
  error?: string | null | undefined;
}

export interface AddMediaOptions {
  mimeType?: string | undefined;
  fileSize?: number | undefined;
}

function resolveMimeAndValidateFormat(
  uri: string,
  mediaType: 'IMAGE' | 'VIDEO',
  providedMime?: string
): { valid: boolean; mimeType: string; message?: string } {
  const cleanUri = (uri || '').split('?')[0];
  const extMatch = /\.(\w+)$/.exec(cleanUri);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';

  if (providedMime) {
    const lowerMime = providedMime.toLowerCase();
    const normalizedMime = lowerMime === 'image/jpg' ? 'image/jpeg' : lowerMime;
    if (!ALLOWED_MIMES.has(normalizedMime)) {
      return {
        valid: false,
        mimeType: normalizedMime,
        message: 'Unsupported file format. Please select a JPEG, PNG, WEBP image or MP4/MOV video.',
      };
    }
    return { valid: true, mimeType: normalizedMime };
  }

  if (mediaType === 'VIDEO') {
    if (ext && !ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        mimeType: 'video/mp4',
        message: 'Unsupported video format. Allowed video formats: MP4, MOV, WebM.',
      };
    }
    const videoMime = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4';
    return { valid: true, mimeType: videoMime };
  }

  if (ext && !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      mimeType: 'image/jpeg',
      message: 'Unsupported image format. Allowed image formats: JPG, PNG, WEBP.',
    };
  }
  const imageMime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { valid: true, mimeType: imageMime };
}

export function useCustomRequestMediaUpload() {
  const [slots, setSlots] = useState<MediaUploadSlot[]>([]);
  const slotsRef = useRef<MediaUploadSlot[]>([]);
  const isPickingRef = useRef(false);
  const activeUploadIdsRef = useRef<Set<string>>(new Set());

  const updateSlots = useCallback((updater: (prev: MediaUploadSlot[]) => MediaUploadSlot[]) => {
    setSlots((prev) => {
      const next = updater(prev);
      slotsRef.current = next;
      return next;
    });
  }, []);

  const uploadFile = useCallback(
    async (
      slotId: string,
      localUri: string,
      mediaType: 'IMAGE' | 'VIDEO',
      mimeType: string
    ) => {
      // Prevent duplicate concurrent uploads for the same slot
      if (activeUploadIdsRef.current.has(slotId)) {
        return;
      }
      activeUploadIdsRef.current.add(slotId);

      updateSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, status: 'uploading', progress: 10, error: null } : s
        )
      );

      try {
        const result = await customRequestApi.uploadMedia(localUri, mimeType, (percent) => {
          updateSlots((prev) =>
            prev.map((s) =>
              s.id === slotId ? { ...s, progress: Math.max(percent, 10) } : s
            )
          );
        });

        updateSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  status: 'success',
                  progress: 100,
                  mediaType: result.media_type || mediaType,
                  uploadedUrl: result.media_url,
                  cloudinaryPublicId: result.cloudinary_public_id,
                  fileSizeBytes: result.file_size_bytes ?? s.fileSizeBytes,
                  error: null,
                }
              : s
          )
        );
      } catch (err: any) {
        updateSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  status: 'error',
                  error: err?.message || 'Upload failed',
                }
              : s
          )
        );
      } finally {
        activeUploadIdsRef.current.delete(slotId);
      }
    },
    [updateSlots]
  );

  const addMediaUri = useCallback(
    async (
      localUri: string,
      mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE',
      options?: AddMediaOptions
    ) => {
      if (!localUri || typeof localUri !== 'string' || localUri.trim().length === 0) {
        showAlert('Invalid File', 'The selected file is invalid or unreadable.');
        return;
      }

      if (slotsRef.current.length >= MAX_CUSTOM_REQUEST_MEDIA) {
        showAlert(
          'Limit Reached',
          `You can attach up to ${MAX_CUSTOM_REQUEST_MEDIA} photos or videos.`
        );
        return;
      }

      // Prevent duplicate selection of the exact same URI
      if (slotsRef.current.some((s) => s.localUri === localUri)) {
        return;
      }

      // Validate file format
      const formatCheck = resolveMimeAndValidateFormat(localUri, mediaType, options?.mimeType);
      if (!formatCheck.valid) {
        showAlert('Unsupported Format', formatCheck.message || 'Unsupported media format.');
        return;
      }

      // Validate pre-compression video size or raw image size
      if (mediaType === 'VIDEO' && options?.fileSize && options.fileSize > MAX_CUSTOM_REQUEST_VIDEO_BYTES) {
        showAlert(
          'Video Too Large',
          'Videos must be 30 MB or smaller. Please select a shorter clip.'
        );
        return;
      }

      let processedUri = localUri;
      let resolvedMime = formatCheck.mimeType;
      let resolvedSize = options?.fileSize;

      if (mediaType === 'IMAGE') {
        try {
          const compressed = await compressImage(localUri, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8,
          });
          if (!compressed?.uri) {
            throw new Error('Corrupted image');
          }
          processedUri = compressed.uri;
          resolvedMime = 'image/jpeg';
        } catch {
          showAlert('Invalid Image', 'Unable to process the selected image. It may be corrupted.');
          return;
        }

        if (resolvedSize && resolvedSize > MAX_CUSTOM_REQUEST_IMAGE_BYTES * 2) {
          showAlert(
            'Image Too Large',
            'Images must be 8 MB or smaller. Please choose another photo.'
          );
          return;
        }
      }

      // Re-check slot limit after async compression
      if (slotsRef.current.length >= MAX_CUSTOM_REQUEST_MEDIA) {
        showAlert(
          'Limit Reached',
          `You can attach up to ${MAX_CUSTOM_REQUEST_MEDIA} photos or videos.`
        );
        return;
      }

      const slotId = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newSlot: MediaUploadSlot = {
        id: slotId,
        localUri: processedUri,
        mediaType,
        mimeType: resolvedMime,
        status: 'uploading',
        progress: 5,
        fileSizeBytes: resolvedSize,
      };

      updateSlots((prev) => [...prev, newSlot]);
      await uploadFile(slotId, processedUri, mediaType, resolvedMime);
    },
    [updateSlots, uploadFile]
  );

  const pickFromCamera = useCallback(async () => {
    if (isPickingRef.current) return;
    if (slotsRef.current.length >= MAX_CUSTOM_REQUEST_MEDIA) {
      showAlert(
        'Limit Reached',
        `You can attach up to ${MAX_CUSTOM_REQUEST_MEDIA} photos or videos.`
      );
      return;
    }

    isPickingRef.current = true;
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        showAlert(
          'Camera Permission Required',
          'Please enable camera access in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        videoMaxDuration: 60,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        await addMediaUri(asset.uri, isVideo ? 'VIDEO' : 'IMAGE', {
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
        });
      }
    } catch (err: any) {
      showAlert('Camera Error', err?.message || 'Unable to access camera.');
    } finally {
      isPickingRef.current = false;
    }
  }, [addMediaUri]);

  const pickFromGallery = useCallback(async () => {
    if (isPickingRef.current) return;
    const remainingSlots = MAX_CUSTOM_REQUEST_MEDIA - slotsRef.current.length;
    if (remainingSlots <= 0) {
      showAlert(
        'Limit Reached',
        `You can attach up to ${MAX_CUSTOM_REQUEST_MEDIA} photos or videos.`
      );
      return;
    }

    isPickingRef.current = true;
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        showAlert(
          'Library Permission Required',
          'Please enable photo library access in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const assetsToProcess = result.assets.slice(0, remainingSlots);
        for (const asset of assetsToProcess) {
          if (slotsRef.current.length >= MAX_CUSTOM_REQUEST_MEDIA) break;
          const isVideo = asset.type === 'video';
          await addMediaUri(asset.uri, isVideo ? 'VIDEO' : 'IMAGE', {
            mimeType: asset.mimeType,
            fileSize: asset.fileSize,
          });
        }
      }
    } catch (err: any) {
      showAlert('Library Error', err?.message || 'Unable to open media library.');
    } finally {
      isPickingRef.current = false;
    }
  }, [addMediaUri]);

  const removeSlot = useCallback(
    (slotId: string) => {
      activeUploadIdsRef.current.delete(slotId);
      updateSlots((prev) => prev.filter((s) => s.id !== slotId));
    },
    [updateSlots]
  );

  const retrySlot = useCallback(
    (slotId: string) => {
      const slot = slotsRef.current.find((s) => s.id === slotId);
      if (slot && slot.status === 'error') {
        uploadFile(slotId, slot.localUri, slot.mediaType, slot.mimeType);
      }
    },
    [uploadFile]
  );

  const isUploadingAny = slots.some((s) => s.status === 'uploading');
  const hasErrors = slots.some((s) => s.status === 'error');
  const firstErrorMessage = slots.find((s) => s.status === 'error')?.error || null;

  const formattedMediaPayload: CustomServiceRequestMediaInput[] = slots
    .filter((s) => s.status === 'success' && s.uploadedUrl && s.cloudinaryPublicId)
    .map((s) => ({
      media_type: s.mediaType,
      media_url: s.uploadedUrl!,
      cloudinary_public_id: s.cloudinaryPublicId!,
      ...(typeof s.fileSizeBytes === 'number' ? { file_size_bytes: s.fileSizeBytes } : {}),
    }));

  return {
    slots,
    addMediaUri,
    pickFromCamera,
    pickFromGallery,
    removeSlot,
    retrySlot,
    isUploadingAny,
    hasErrors,
    firstErrorMessage,
    formattedMediaPayload,
    totalCount: slots.length,
    maxCount: MAX_CUSTOM_REQUEST_MEDIA,
  };
}
