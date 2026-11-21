import React, { useCallback } from 'react';
import { Pressable, View, StyleSheet, type StyleProp, type ViewStyle, type Insets } from 'react-native';
import { useRouter, useNavigation, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { pushOnce } from '../../utils/navigationGuard';
import {
  getWorkerProfileHref,
  normalizeWorkerId,
  isCompanyProfile,
  isProfileBelowCurrent,
} from '../../utils/workerProfileRoute';
import { prefetchWorkerProfile } from '../../hooks/useWorkerProfile';
import { layout } from '../../design/spacing';
import type { WorkerPublicProfile } from '../../types/worker.types';

/** Opacity while pressed: a light, layout-neutral cue (no scale, no ripple) that works in both themes. */
const PRESSED_OPACITY = 0.7;

export interface WorkerProfileLinkProps {
  /** The provider's id. Missing / invalid ids render the children as plain, non-interactive content. */
  workerId: unknown;
  /**
   * Agencies open the company profile instead of the individual worker profile. Leave undefined when the
   * caller does not know: the already-cached profile (if any) decides, with no extra request.
   */
  isCompany?: boolean | undefined;
  /** Used for the accessibility label ("View Ali Khan's profile"). */
  workerName?: string | null | undefined;
  /** Visual size of the wrapped avatar; used to extend the touch area to the 44pt minimum. */
  size?: number | undefined;
  disabled?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  children: React.ReactNode;
}

/** Grows the hit area so even small avatars meet the minimum touch target, without changing layout. */
function hitSlopFor(size?: number): Insets | undefined {
  if (!size || size >= layout.minTouchTarget) return undefined;
  const pad = Math.ceil((layout.minTouchTarget - size) / 2);
  return { top: pad, bottom: pad, left: pad, right: pad };
}

/**
 * Makes a worker avatar open that worker's public profile.
 *
 * - Renders as its own Pressable, so a tap on the avatar is consumed here and never reaches a parent
 *   card's onPress (React Native gives the touch to the innermost responder).
 * - Uses the shared `pushOnce` guard against double-tap pushes, and warms the same React Query cache
 *   the profile screen reads, so opening the profile does not trigger an extra request.
 * - Adds no wrapper styling of its own: the avatar keeps its exact size, shape and spacing.
 */
export function WorkerProfileLink({
  workerId,
  isCompany,
  workerName,
  size,
  disabled = false,
  style,
  children,
}: WorkerProfileLinkProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const safeId = normalizeWorkerId(workerId);

  const handlePressIn = useCallback(() => {
    if (safeId && isCompany !== true) prefetchWorkerProfile(queryClient, safeId);
  }, [safeId, isCompany, queryClient]);

  const handlePress = useCallback(() => {
    if (!safeId) return;
    const company =
      isCompany ?? isCompanyProfile(queryClient.getQueryData<WorkerPublicProfile>(['worker', safeId]));
    const href = getWorkerProfileHref(safeId, company);
    if (!href) return;
    pushOnce(() => {
      if (router.canGoBack() && isProfileBelowCurrent(navigation.getState(), href)) {
        router.back();
      } else {
        router.push(href as unknown as Href);
      }
    });
  }, [safeId, isCompany, queryClient, router, navigation]);

  if (!safeId || disabled) {
    return <View style={style}>{children}</View>;
  }

  const label = workerName?.trim()
    ? `View ${workerName.trim()}'s profile`
    : isCompany
    ? 'View agency profile'
    : 'View worker profile';

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      hitSlop={hitSlopFor(size)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
