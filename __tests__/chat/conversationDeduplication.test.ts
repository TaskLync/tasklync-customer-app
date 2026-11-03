import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  buildDeduplicatedConversations,
  mergeIncomingMessageIntoConversations,
  deduplicateConversationList,
  groupBookingsByWorker,
  isActiveBookingStatus,
} from '../../src/utils/conversationDeduplication.ts';
import type { ConversationItem, Message, ChatRoom } from '../../src/types/chat.types.ts';

describe('Chat Conversation Deduplication & Multi-Booking Consolidation', () => {
  const customerId = 'cust-1001';
  const workerAId = 'wrk-plumber-01';
  const workerBId = 'wrk-electrician-02';

  const bookingA1 = {
    id: 'bkg-001',
    worker_id: workerAId,
    worker_name: 'Imran Plumber',
    worker_avatar_url: 'https://cdn.example.com/imran.jpg',
    worker_phone: '+923001234567',
    category_id: 'plumbing',
    category_name: 'Plumbing Services',
    status: 'COMPLETED',
    created_at: '2026-09-01T10:00:00.000Z',
  };

  const bookingA2 = {
    id: 'bkg-002',
    worker_id: workerAId,
    worker_name: 'Imran Plumber',
    worker_avatar_url: 'https://cdn.example.com/imran.jpg',
    worker_phone: '+923001234567',
    category_id: 'plumbing',
    category_name: 'Plumbing Services',
    status: 'IN_PROGRESS',
    created_at: '2026-10-15T14:00:00.000Z',
  };

  const bookingB1 = {
    id: 'bkg-003',
    worker_id: workerBId,
    worker_name: 'Rashid Electrician',
    worker_avatar_url: 'https://cdn.example.com/rashid.jpg',
    worker_phone: '+923007654321',
    category_id: 'electrical',
    category_name: 'Electrical Repair',
    status: 'ACCEPTED',
    created_at: '2026-10-20T09:00:00.000Z',
  };

  const canonicalRoomWorkerA: ChatRoom = {
    id: 'room-canonical-worker-a',
    booking_id: 'bkg-002',
    user_id: customerId,
    worker_id: workerAId,
    counterparty_id: workerAId,
    status: 'ACTIVE',
    last_message_at: '2026-10-15T14:30:00.000Z',
    last_message_preview: 'I am on my way to your location',
    last_message_sender_type: 'worker',
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-10-15T14:30:00.000Z',
    unread_count: 1,
    unread: true,
  } as any;

  const canonicalRoomWorkerB: ChatRoom = {
    id: 'room-canonical-worker-b',
    booking_id: 'bkg-003',
    user_id: customerId,
    worker_id: workerBId,
    counterparty_id: workerBId,
    status: 'ACTIVE',
    last_message_at: '2026-10-20T09:15:00.000Z',
    last_message_preview: 'I will arrive at 3:00 PM',
    last_message_sender_type: 'worker',
    created_at: '2026-10-20T09:00:00.000Z',
    updated_at: '2026-10-20T09:15:00.000Z',
    unread_count: 0,
    unread: false,
  } as any;

  const mockCachedMessages: Record<string, Message[]> = {
    'bkg-001': [
      {
        id: 'msg-1',
        room_id: 'room-canonical-worker-a',
        booking_id: 'bkg-001',
        sender_id: customerId,
        sender_type: 'user',
        type: 'text',
        content: 'Job is complete, thank you!',
        created_at: '2026-09-01T12:00:00.000Z',
      },
    ],
    'bkg-002': [
      {
        id: 'msg-2',
        room_id: 'room-canonical-worker-a',
        booking_id: 'bkg-002',
        sender_id: workerAId,
        sender_type: 'worker',
        type: 'text',
        content: 'I am on my way to your location',
        created_at: '2026-10-15T14:30:00.000Z',
      },
    ],
    'bkg-003': [
      {
        id: 'msg-3',
        room_id: 'room-canonical-worker-b',
        booking_id: 'bkg-003',
        sender_id: workerBId,
        sender_type: 'worker',
        type: 'text',
        content: 'I will arrive at 3:00 PM',
        created_at: '2026-10-20T09:15:00.000Z',
      },
    ],
  };

  const getCachedMessages = (id: string): Message[] => mockCachedMessages[id] || [];

  describe('Single Conversation per Unique Customer-Worker Pair', () => {
    test('displays exactly one conversation row when customer books the same worker multiple times', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA],
        bookings: [bookingA1, bookingA2],
        getCachedMessages,
      });

      assert.strictEqual(
        conversations.length,
        1,
        'Must display exactly 1 conversation for Worker A despite 2 bookings'
      );
      assert.strictEqual(conversations[0].workerId, workerAId);
      assert.strictEqual(conversations[0].workerName, 'Imran Plumber');
    });

    test('preserves all associated booking IDs in allBookingIds while selecting the active booking as primary', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA],
        bookings: [bookingA1, bookingA2],
        getCachedMessages,
      });

      const conv = conversations[0];
      assert.strictEqual(conv.bookingId, 'bkg-002', 'Active booking bkg-002 must be primary bookingId');
      assert.strictEqual(conv.bookingStatus, 'IN_PROGRESS', 'Status must reflect the active booking');
      assert.ok(Array.isArray(conv.allBookingIds));
      assert.ok(conv.allBookingIds.includes('bkg-001'), 'Must preserve bkg-001 in allBookingIds');
      assert.ok(conv.allBookingIds.includes('bkg-002'), 'Must preserve bkg-002 in allBookingIds');
    });

    test('shows latest message, timestamp, and unread count across all bookings with the worker', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA],
        bookings: [bookingA1, bookingA2],
        getCachedMessages,
      });

      const conv = conversations[0];
      assert.strictEqual(conv.lastMessage, 'I am on my way to your location');
      assert.strictEqual(conv.lastMessageAt, '2026-10-15T14:30:00.000Z');
      assert.strictEqual(conv.unreadCount, 1);
    });

    test('opening the conversation provides the shared room and primary booking context', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA],
        bookings: [bookingA1, bookingA2],
        getCachedMessages,
      });

      const conv = conversations[0];
      assert.strictEqual(conv.roomId, 'room-canonical-worker-a');
      assert.strictEqual(conv.bookingId, 'bkg-002');
    });
  });

  describe('Separate Conversations for Different Workers', () => {
    test('renders distinct conversations when customer has bookings with different workers', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA, canonicalRoomWorkerB],
        bookings: [bookingA1, bookingA2, bookingB1],
        getCachedMessages,
      });

      assert.strictEqual(conversations.length, 2, 'Must display 2 conversations (1 for Worker A, 1 for Worker B)');

      const workerAConv = conversations.find((c) => c.workerId === workerAId);
      const workerBConv = conversations.find((c) => c.workerId === workerBId);

      assert.ok(workerAConv, 'Worker A conversation must exist');
      assert.ok(workerBConv, 'Worker B conversation must exist');

      assert.strictEqual(workerAConv.workerName, 'Imran Plumber');
      assert.strictEqual(workerBConv.workerName, 'Rashid Electrician');

      assert.strictEqual(workerAConv.categoryName, 'Plumbing Services');
      assert.strictEqual(workerBConv.categoryName, 'Electrical Repair');
    });
  });

  describe('Offline / Local Cache Deduplication Resilience', () => {
    test('deduplicates multiple bookings for same worker even when room API returns empty (offline mode)', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [], // Empty server rooms!
        bookings: [bookingA1, bookingA2], // Local cached bookings
        getCachedMessages,
      });

      assert.strictEqual(
        conversations.length,
        1,
        'Offline mode must still yield only 1 conversation row for Worker A'
      );
      assert.strictEqual(conversations[0].workerId, workerAId);
      assert.strictEqual(conversations[0].bookingId, 'bkg-002', 'Picks active booking as primary');
      assert.strictEqual(conversations[0].lastMessage, 'I am on my way to your location');
    });

    test('ignores bookings that have no message history sent or received', () => {
      const bookingWithoutMessages = {
        id: 'bkg-empty-099',
        worker_id: 'wrk-empty-99',
        worker_name: 'No Chat Worker',
        status: 'PENDING',
        created_at: '2026-10-21T00:00:00.000Z',
      };

      const conversations = buildDeduplicatedConversations({
        rooms: [],
        bookings: [bookingWithoutMessages],
        getCachedMessages,
      });

      assert.strictEqual(conversations.length, 0, 'Bookings without messages must not produce conversation rows');
    });
  });

  describe('Real-Time Socket.IO Incoming Messages without Duplication', () => {
    test('updates existing conversation in-place when incoming message cites an older booking ID', () => {
      const initialConversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA, canonicalRoomWorkerB],
        bookings: [bookingA1, bookingA2, bookingB1],
        getCachedMessages,
      });

      assert.strictEqual(initialConversations.length, 2);

      // Incoming message from Worker A referencing older booking 'bkg-001'
      const incomingData = {
        id: 'msg-live-10',
        roomId: 'room-canonical-worker-a',
        bookingId: 'bkg-001',
        senderId: workerAId,
        senderType: 'worker',
        content: 'Following up regarding your warranty',
        createdAt: '2026-10-21T18:00:00.000Z',
      };

      const { updated, found } = mergeIncomingMessageIntoConversations(
        initialConversations,
        incomingData,
        customerId
      );

      assert.strictEqual(found, true, 'Matching conversation must be found');
      assert.strictEqual(updated.length, 2, 'Must NOT introduce a new duplicate row');

      const target = updated.find((c) => c.workerId === workerAId);
      assert.strictEqual(target?.lastMessage, 'Following up regarding your warranty');
      assert.strictEqual(target?.lastMessageAt, '2026-10-21T18:00:00.000Z');
      assert.strictEqual(target?.unreadCount, 2, 'Unread count increments for worker message');
      // The updated conversation is moved to top
      assert.strictEqual(updated[0].workerId, workerAId, 'Updated conversation moves to index 0');
    });

    test('matches incoming message by stable roomId', () => {
      const initialConversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA],
        bookings: [bookingA1, bookingA2],
        getCachedMessages,
      });

      const incomingData = {
        id: 'msg-live-20',
        roomId: 'room-canonical-worker-a',
        senderId: workerAId,
        senderType: 'worker',
        content: 'New message via roomId',
        createdAt: '2026-10-21T18:05:00.000Z',
      };

      const { updated, found } = mergeIncomingMessageIntoConversations(
        initialConversations,
        incomingData,
        customerId
      );

      assert.strictEqual(found, true);
      assert.strictEqual(updated.length, 1);
      assert.strictEqual(updated[0].lastMessage, 'New message via roomId');
    });

    test('matches incoming message by workerId', () => {
      const initialConversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA],
        bookings: [bookingA1, bookingA2],
        getCachedMessages,
      });

      const incomingData = {
        id: 'msg-live-30',
        workerId: workerAId,
        senderId: workerAId,
        senderType: 'worker',
        content: 'New message via workerId',
        createdAt: '2026-10-21T18:10:00.000Z',
      };

      const { updated, found } = mergeIncomingMessageIntoConversations(
        initialConversations,
        incomingData,
        customerId
      );

      assert.strictEqual(found, true);
      assert.strictEqual(updated.length, 1);
      assert.strictEqual(updated[0].lastMessage, 'New message via workerId');
    });
  });

  describe('Search & Filter Preservation', () => {
    test('filters conversations accurately by search query across worker name, category, and message content', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA, canonicalRoomWorkerB],
        bookings: [bookingA1, bookingA2, bookingB1],
        getCachedMessages,
      });

      // Search by worker name
      const byName = conversations.filter((c) =>
        c.workerName.toLowerCase().includes('imran')
      );
      assert.strictEqual(byName.length, 1);
      assert.strictEqual(byName[0].workerId, workerAId);

      // Search by category
      const byCategory = conversations.filter((c) =>
        c.categoryName.toLowerCase().includes('electrical')
      );
      assert.strictEqual(byCategory.length, 1);
      assert.strictEqual(byCategory[0].workerId, workerBId);

      // Search by message content
      const byContent = conversations.filter((c) =>
        c.lastMessage.toLowerCase().includes('way')
      );
      assert.strictEqual(byContent.length, 1);
      assert.strictEqual(byContent[0].workerId, workerAId);
    });

    test('filters conversations accurately by Active and Unread tabs', () => {
      const conversations = buildDeduplicatedConversations({
        rooms: [canonicalRoomWorkerA, canonicalRoomWorkerB],
        bookings: [bookingA1, bookingA2, bookingB1],
        getCachedMessages,
      });

      // Active tab: both Worker A (IN_PROGRESS) and Worker B (ACCEPTED) are active
      const activeList = conversations.filter((c) => {
        const s = (c.bookingStatus || '').toUpperCase();
        return ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'ACTIVE'].includes(s) || c.isOnline;
      });
      assert.strictEqual(activeList.length, 2);

      // Unread tab: only Worker A has unreadCount > 0 (unreadCount = 1)
      const unreadList = conversations.filter((c) => c.unreadCount > 0);
      assert.strictEqual(unreadList.length, 1);
      assert.strictEqual(unreadList[0].workerId, workerAId);
    });
  });

  describe('Defensive Deduplication Function', () => {
    test('deduplicateConversationList collapses any duplicate conversation items sharing the same workerId', () => {
      const item1: ConversationItem = {
        id: 'room-1',
        bookingId: 'bkg-001',
        workerId: workerAId,
        workerName: 'Imran Plumber',
        categoryName: 'Plumbing',
        lastMessage: 'First message',
        lastMessageAt: '2026-09-01T10:00:00.000Z',
        unreadCount: 0,
        isOnline: false,
        bookingStatus: 'COMPLETED',
        allBookingIds: ['bkg-001'],
      };

      const item2: ConversationItem = {
        id: 'room-1',
        bookingId: 'bkg-002',
        workerId: workerAId,
        workerName: 'Imran Plumber',
        categoryName: 'Plumbing',
        lastMessage: 'Second message',
        lastMessageAt: '2026-10-15T10:00:00.000Z',
        unreadCount: 1,
        isOnline: true,
        bookingStatus: 'IN_PROGRESS',
        allBookingIds: ['bkg-002'],
      };

      const result = deduplicateConversationList([item1, item2]);
      assert.strictEqual(result.length, 1, 'Must collapse into exactly 1 item');
      assert.strictEqual(result[0].bookingId, 'bkg-002', 'Preserves active bookingId');
      assert.strictEqual(result[0].lastMessage, 'Second message', 'Preserves newest message');
      assert.strictEqual(result[0].unreadCount, 1, 'Preserves max unread count');
      assert.strictEqual(result[0].isOnline, true, 'Preserves online flag');
      assert.ok(result[0].allBookingIds?.includes('bkg-001'));
      assert.ok(result[0].allBookingIds?.includes('bkg-002'));
    });
  });

  describe('Priority and Active Booking Helpers', () => {
    test('isActiveBookingStatus correctly classifies engagement states', () => {
      assert.strictEqual(isActiveBookingStatus('PENDING'), true);
      assert.strictEqual(isActiveBookingStatus('ACCEPTED'), true);
      assert.strictEqual(isActiveBookingStatus('IN_PROGRESS'), true);
      assert.strictEqual(isActiveBookingStatus('ACTIVE'), true);

      assert.strictEqual(isActiveBookingStatus('COMPLETED'), false);
      assert.strictEqual(isActiveBookingStatus('CANCELLED'), false);
      assert.strictEqual(isActiveBookingStatus('REJECTED'), false);
      assert.strictEqual(isActiveBookingStatus(null), false);
      assert.strictEqual(isActiveBookingStatus(undefined), false);
    });

    test('groupBookingsByWorker places active booking before completed booking', () => {
      const grouped = groupBookingsByWorker([bookingA1, bookingA2]);
      const workerABookings = grouped.get(workerAId)!;

      assert.strictEqual(workerABookings.length, 2);
      assert.strictEqual(workerABookings[0].id, 'bkg-002', 'bkg-002 (IN_PROGRESS) must come before bkg-001 (COMPLETED)');
      assert.strictEqual(workerABookings[1].id, 'bkg-001');
    });
  });
});
