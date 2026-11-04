import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { FlatList } from 'react-native';
import { useScrollPosition } from './useScrollPosition';
import { classifyMessageChange, messageKey, type TrackedMessage } from '../utils/newMessageTracking';

/**
 * Shared scroll behaviour for the (inverted) chat lists:
 *  - own message or already at bottom → follow the newest message;
 *  - reading history → never yank the view, count unseen arrivals for the pill;
 *  - loading older pages → no scroll, no false "new message" count.
 */
export function useChatAutoScroll(args: {
  messages: TrackedMessage[];
  isLoading: boolean;
  listRef: RefObject<FlatList<any> | null>;
}) {
  const { messages, isLoading, listRef } = args;
  const { isAtBottom, handleScroll, isAtBottomRef } = useScrollPosition({ bottomThreshold: 45 });
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const prevNewestKeyRef = useRef<string | null>(messageKey(messages[messages.length - 1]));

  useEffect(() => {
    const prevKey = prevNewestKeyRef.current;
    const newestKey = messageKey(messages[messages.length - 1]);
    prevNewestKeyRef.current = newestKey;
    if (isLoading) return;

    const action = classifyMessageChange({
      prevNewestKey: prevKey,
      messages,
      isAtBottom: isAtBottomRef.current,
    });
    if (action.kind === 'scroll') {
      setUnreadCount(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else if (action.kind === 'unread') {
      setUnreadCount((c) => c + action.count);
    }
  }, [messages, isLoading, isAtBottomRef, listRef]);

  // Reaching the bottom by hand clears the pill
  useEffect(() => {
    if (isAtBottom && unreadCount > 0) setUnreadCount(0);
  }, [isAtBottom, unreadCount]);

  const scrollToBottom = useCallback(() => {
    setUnreadCount(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [listRef]);

  return { isAtBottom, handleScroll, unreadCount, scrollToBottom };
}
