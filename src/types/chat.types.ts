export type MessageType = 'text' | 'image' | 'location' | 'system';
export type SenderType = 'user' | 'customer' | 'worker' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ReadReceiptStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ChatRoomStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface LocationMetadata {
  latitude: number;
  longitude: number;
  address?: string | undefined;
}

export interface Message {
  id: string;
  room_id?: string | undefined;
  booking_id: string;
  sender_id: string;
  sender_type: SenderType;
  content: string;
  type: MessageType;
  media_url?: string | undefined;
  media_thumbnail_url?: string | undefined;
  metadata?: LocationMetadata | Record<string, any> | undefined;
  status: MessageStatus;
  read_by: string[];
  created_at: string; // ISO-8601 UTC
  temp_id?: string | undefined;
}

export interface ChatRoom {
  id?: string | undefined;
  booking_id: string;
  user_id?: string | undefined;
  worker_id?: string | undefined;
  counterparty_id?: string | undefined;
  counterparty_type?: 'worker' | 'customer' | undefined;
  status: ChatRoomStatus;
  last_message_at?: string | null | undefined;
  last_message_preview?: string | null | undefined;
  last_message_sender_type?: SenderType | undefined;
  unread?: boolean | undefined;
  unread_count?: number | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export interface DateDividerItem {
  type: 'date_divider';
  id: string;
  label: string;
  timestamp: string;
}

export interface SystemMessageItem {
  type: 'system';
  id: string;
  content: string;
  timestamp: string;
}

export interface MessageBubbleItem {
  type: 'message';
  id: string;
  message: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showTimestamp: boolean;
  showAvatar: boolean;
  isOutgoing: boolean;
  readReceiptStatus: ReadReceiptStatus;
}

export type MessageRenderItem = DateDividerItem | SystemMessageItem | MessageBubbleItem;

export interface ChatHistoryResponse {
  messages: Message[];
  next_cursor?: string | null | undefined;
  has_more: boolean;
}

export interface ChatMediaUploadResponse {
  media_url: string;
  media_thumbnail_url?: string | undefined;
}

export type ConversationFilterTab = 'all' | 'active' | 'unread';

export interface ConversationItem {
  id: string;
  bookingId: string;
  workerId?: string | undefined;
  workerName: string;
  workerAvatarUrl?: string | undefined;
  workerPhone?: string | undefined;
  categoryName: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderType?: SenderType | undefined;
  unreadCount: number;
  isOnline: boolean;
  bookingStatus?: string | undefined;
}
