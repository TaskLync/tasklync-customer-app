import React from 'react';
import { BlockIcon, FlagIcon, ShareIcon } from '../ui/Icon/icons';
import { ActionSheet } from '../layout/ActionSheet/ActionSheet';

interface MoreOptionsMenuProps {
  workerId: string;
  workerName: string;
  isVisible: boolean;
  onClose: () => void;
  onReport: () => void;
  onBlock: () => void;
  onShare: () => void;
}

export const MoreOptionsMenu: React.FC<MoreOptionsMenuProps> = ({
  workerId,
  workerName,
  isVisible,
  onClose,
  onReport,
  onBlock,
  onShare,
}) => {
  const actions = [
    {
      label: 'Share profile',
      icon: ShareIcon,
      variant: 'default' as const,
      onPress: onShare,
    },
    {
      label: 'Report worker',
      icon: FlagIcon,
      variant: 'default' as const,
      onPress: onReport,
    },
    {
      label: 'Block worker',
      icon: BlockIcon,
      variant: 'danger' as const,
      onPress: onBlock,
    },
  ];

  return (
    <ActionSheet
      isVisible={isVisible}
      onClose={onClose}
      title={workerName}
      actions={actions}
    />
  );
};
