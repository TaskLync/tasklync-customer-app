import React from 'react';
import { MessageStatusIcon } from '../feedback/MessageStatusIcon';
import { ReadReceiptStatus } from '../../types/chat.types';
import { useAppTheme } from '../../theme/useAppTheme';

interface ReadReceiptProps {
  status: ReadReceiptStatus;
  /** Overrides the status colour. Leave unset so read/failed stay distinguishable. */
  color?: string | undefined;
  size?: number | undefined;
}

/**
 * Status glyph beside the timestamp: clock (sending) → single check (sent) → double check
 * (delivered, muted) → double check (read, brand green) → alert (failed, red).
 */
export const ReadReceipt = React.memo(function ReadReceipt({
  status,
  color,
  size = 13,
}: ReadReceiptProps) {
  const { colors } = useAppTheme();
  const resolved =
    color ??
    (status === 'read' ? colors.primaryDark : status === 'failed' ? colors.danger : colors.textMuted);
  return <MessageStatusIcon status={status} size={size} colorOverride={resolved} />;
});
