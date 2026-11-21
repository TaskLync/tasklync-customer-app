import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from 'expo-router';
import { createNavigationLock } from './navigationLock.core';

/**
 * Locks the current screen: nothing can navigate BACK out of it until `release()` is called.
 *
 * Covers every way back:
 *  - Android hardware / system back (BackHandler; consumed so the navigator never sees it)
 *  - header back, `router.back()`, POP / GO_BACK and any other action that would remove this screen
 *    (React Navigation `beforeRemove`, prevented)
 *  - iOS swipe-back must ALSO be disabled with `gestureEnabled: false` on the screen options: native-stack cannot
 *    cancel a native gesture from `beforeRemove`.
 *
 * Intentional exits (e.g. to the success screen): call `release()` and navigate in the same tick; the flag flips
 * synchronously, so the listener lets that one navigation through.
 *
 * Both listeners are removed on unmount, so the lock never leaks into other screens.
 */
export function useNavigationLock(onBlocked?: () => void) {
  const navigation = useNavigation();
  const lock = useRef(createNavigationLock()).current;
  lock.setOnBlocked(onBlocked);

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', lock.onHardwareBack);
    const unsubscribe = navigation.addListener('beforeRemove', lock.onBeforeRemove);
    return () => {
      backSub.remove();
      unsubscribe();
    };
  }, [navigation, lock]);

  return { release: lock.release, isReleased: lock.isReleased };
}
