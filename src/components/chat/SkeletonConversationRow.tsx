import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonCircle, SkeletonGroup, SkeletonText } from '../ui/Skeleton/Skeleton';
import { CONVERSATION_ROW } from './ConversationRow';

/**
 * Mirrors ConversationRow line for line: 52pt avatar, then name (16/22) + time,
 * preview (14.5/20) and the category · status line (13/17), same gutters and spacing.
 */
export const SkeletonConversationRow: React.FC<{ nameWidth?: number; previewWidth?: `${number}%` }> = ({
  nameWidth = 132,
  previewWidth = '82%',
}) => (
  <SkeletonGroup style={styles.row} accessibilityLabel="Loading conversation">
    <SkeletonCircle size={CONVERSATION_ROW.avatar} style={styles.avatar} />
    <View style={styles.body}>
      <View style={styles.line}>
        <SkeletonText fontSize={16} lineHeight={22} width={nameWidth} />
        <SkeletonText fontSize={12.5} lineHeight={16} width={44} />
      </View>
      <SkeletonText fontSize={14.5} lineHeight={20} width={previewWidth} style={styles.preview} />
      <SkeletonText fontSize={13} lineHeight={17} width={118} style={styles.meta} />
    </View>
  </SkeletonGroup>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: CONVERSATION_ROW.gutter,
    paddingVertical: 14,
  },
  avatar: {
    marginRight: CONVERSATION_ROW.avatarGap,
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    marginTop: 2,
  },
  meta: {
    marginTop: 6,
  },
});
