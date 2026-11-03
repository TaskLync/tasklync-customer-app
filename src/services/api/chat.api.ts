import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { apiClient } from './client';
import { useAuthStore } from '../../store/auth.store';
import {
  Message,
  ChatRoom,
  ChatHistoryResponse,
  ChatMediaUploadResponse,
} from '../../types/chat.types';

const chatStorage = createMMKV({ id: 'tasklync_chat_cache' });

export function getCachedChatMessages(bookingOrRoomId: string): Message[] {
  try {
    const raw = chatStorage.getString(`chat_msgs_${bookingOrRoomId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const mappedRoomId = chatStorage.getString(`bkg_room_${bookingOrRoomId}`);
    if (mappedRoomId && mappedRoomId !== bookingOrRoomId) {
      const roomRaw = chatStorage.getString(`chat_msgs_${mappedRoomId}`);
      if (roomRaw) {
        const parsed = JSON.parse(roomRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveCachedChatMessages(
  bookingOrRoomId: string,
  messages: Message[],
  roomId?: string
): void {
  try {
    chatStorage.set(`chat_msgs_${bookingOrRoomId}`, JSON.stringify(messages));
    if (roomId && roomId !== bookingOrRoomId) {
      chatStorage.set(`chat_msgs_${roomId}`, JSON.stringify(messages));
      chatStorage.set(`bkg_room_${bookingOrRoomId}`, roomId);
    }
  } catch {
    // MMKV fallback safe
  }
}

export const chatApi = {
  /**
   * 2.1 List Customer Chat Rooms
   * GET /api/v1/chat/rooms
   */
  listRooms: async (): Promise<ChatRoom[]> => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return [];

    try {
      const response = await apiClient.get<any>('/chat/rooms');
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (_error) {
      return [];
    }
  },

  /**
   * 2.2 Get Room Details
   * GET /api/v1/chat/rooms/:bookingId
   */
  getRoomDetails: async (bookingId: string): Promise<ChatRoom | null> => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;

    try {
      const response = await apiClient.get<any>(`/chat/rooms/${bookingId}`);
      const data = response.data?.data || response.data;
      if (!data) return null;
      return {
        ...data,
        id: data.id || data.room_id,
        booking_id: data.booking_id || data.bookingId || bookingId,
        status: data.status,
      };
    } catch (_error) {
      return null;
    }
  },

  /**
   * 2.3 Get Message History (Cursor-based Pagination)
   * GET /api/v1/chat/rooms/:bookingId/messages
   */
  getMessages: async (
    bookingId: string,
    cursor?: string | null,
    limit: number = 30
  ): Promise<ChatHistoryResponse> => {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
      const cached = getCachedChatMessages(bookingId);
      return {
        messages: cached,
        has_more: false,
      };
    }

    try {
      const response = await apiClient.get<any>(`/chat/rooms/${bookingId}/messages`, {
        params: { cursor: cursor || undefined, limit },
      });

      const data = response.data?.data || response.data;
      const rawMessages = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : [];

      const normalizedMessages: Message[] = rawMessages.map((m: any) => ({
        id: m.id || `msg_${Date.now()}`,
        room_id: m.room_id || m.roomId,
        booking_id: m.booking_id || m.bookingId || bookingId,
        sender_id: m.sender_id || m.senderId,
        sender_type: m.sender_type || m.senderType || 'user',
        type: m.type || 'text',
        content: m.content || '',
        media_url: m.media_url || m.mediaUrl || undefined,
        media_thumbnail_url: m.media_thumbnail_url || m.mediaThumbnailUrl || undefined,
        metadata: m.metadata || undefined,
        status: (m.status as any) || 'sent',
        read_by: Array.isArray(m.read_by) ? m.read_by : Array.isArray(m.readBy) ? m.readBy : [],
        created_at: m.created_at || m.createdAt || new Date().toISOString(),
      }));

      if (!cursor) {
        saveCachedChatMessages(bookingId, normalizedMessages);
      }

      return {
        messages: normalizedMessages,
        next_cursor: response.data?.meta?.next_cursor || data?.next_cursor || null,
        has_more: !!(response.data?.meta?.has_more ?? data?.has_more),
      };
    } catch (_error) {
      const cached = getCachedChatMessages(bookingId);
      return {
        messages: cached,
        has_more: false,
      };
    }
  },

  /**
   * 2.4 Upload Media (Images) with Cross-Platform Binary Streaming
   * POST /api/v1/chat/rooms/:bookingId/messages/media
   * Backend chat-service expects 'image' form-data field via multer.single('image')
   */
  uploadMedia: async (
    bookingId: string,
    fileUri: string,
    mimeType: string = 'image/jpeg',
    onProgress?: (percent: number) => void
  ): Promise<ChatMediaUploadResponse> => {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
      throw new Error('Unauthorized: No access token found');
    }

    const rawFilename = fileUri.split('/').pop() || `chat_upload_${Date.now()}.jpg`;
    const cleanFilename = rawFilename.split('?')[0].split('#')[0];
    const filename = cleanFilename.includes('.') ? cleanFilename : `${cleanFilename}.jpg`;
    const ext = filename.split('.').pop()?.toLowerCase();
    const resolvedMimeType =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const formData = new FormData();

    // Universal Cross-Platform Multipart Support (Web Blob / Native React Native Object)
    if (Platform.OS === 'web' || fileUri.startsWith('blob:') || fileUri.startsWith('data:')) {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      const fileObj = new File([blob], filename, { type: resolvedMimeType || blob.type || 'image/jpeg' });
      formData.append('image', fileObj, filename);
    } else {
      const nativeFilePayload = {
        uri: fileUri,
        name: filename,
        type: resolvedMimeType,
      } as any;
      formData.append('image', nativeFilePayload);
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tasklync.pk/api/v1';
    const cleanBaseUrl = API_URL.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/chat/rooms/${bookingId}/messages/media`;

    return new Promise<ChatMediaUploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(Math.min(100, Math.max(0, percent)));
          }
        };
      }

      xhr.onload = () => {
        try {
          const responseJson = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && (responseJson.success || responseJson.data)) {
            const data = responseJson.data || responseJson;
            const mediaUrl = data.media_url || data.mediaUrl || data.url;
            if (!mediaUrl) {
              reject(new Error('No media URL returned in upload response'));
              return;
            }
            resolve({
              media_url: mediaUrl,
              media_thumbnail_url: data.media_thumbnail_url || data.mediaThumbnailUrl || undefined,
            });
          } else {
            const errorMsg =
              responseJson?.error?.message ||
              responseJson?.message ||
              `Upload failed with status ${xhr.status}`;
            reject(new Error(errorMsg));
          }
        } catch (err) {
          reject(new Error(`Failed to parse upload response: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during media upload'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Media upload timed out'));
      };

      xhr.timeout = 60000;
      xhr.send(formData);
    });
  },

  /**
   * 2.5 Mark Messages as Read
   * PATCH /api/v1/chat/rooms/:bookingId/read
   */
  markAsRead: async (bookingId: string): Promise<void> => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    try {
      await apiClient.patch(`/chat/rooms/${bookingId}/read`, {});
    } catch (_error) {
      // Silent error handling for background read receipt
    }
  },

  /**
   * 2.6 Create or Open Pre-Booking Clarification Chat Room for Custom Request
   * POST /api/v1/chat/rooms/request/:requestId
   */
  createRequestRoom: async (requestId: string): Promise<ChatRoom> => {
    try {
      const response = await apiClient.post<any>(`/chat/rooms/request/${requestId}`);
      const data = response.data?.data || response.data;
      return {
        ...data,
        id: data.id || data.room_id,
        booking_id: data.booking_id || data.bookingId || data.request_id || requestId,
        status: data.status,
      };
    } catch (error: any) {
      const apiMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message;
      throw new Error(apiMsg || 'Failed to open clarification chat.');
    }
  },
};
