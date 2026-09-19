import React from 'react';
import { MessageStatusIcon } from '../feedback/MessageStatusIcon';
import { ReadReceiptStatus } from '../../types/chat.types';

interface ReadReceiptProps {
  status: ReadReceiptStatus;
  color?: string | undefined;
  size?: number | undefined;
}

/**
 * ReadReceipt Component (Day 39)
 * 
 * Reuses MessageStatusIcon for smooth 100ms cross-fades and universal iconography:
 * Clock (sending) -> Single Check (sent) -> Double Check (delivered/read) -> Alert (failed)
 */
export const ReadReceipt = React.memo(function ReadReceipt({
  status,
  color,
  size = 12,
}: ReadReceiptProps) {
  return <MessageStatusIcon status={status} size={size} colorOverride={color} />;
});
