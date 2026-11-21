/**
 * Decision logic for a screen that must not be left backwards (pure: no React / React Native imports).
 *
 *  - onHardwareBack(): the BackHandler callback. true = consumed (the navigator never pops the screen).
 *  - onBeforeRemove(e): the React Navigation `beforeRemove` listener (header back, router.back(), POP, GO_BACK,
 *    and any other action that would remove the screen). Calls e.preventDefault() while locked.
 *  - release(): call right before an intentional exit; that navigation then goes through.
 */
export function createNavigationLock(onBlocked?: () => void) {
  let released = false;
  let blockedHandler = onBlocked;
  return {
    setOnBlocked(fn: (() => void) | undefined) {
      blockedHandler = fn;
    },
    onHardwareBack(): boolean {
      if (released) return false;
      blockedHandler?.();
      return true;
    },
    onBeforeRemove(e: { preventDefault: () => void }): void {
      if (released) return;
      e.preventDefault();
      blockedHandler?.();
    },
    release(): void {
      released = true;
    },
    isReleased(): boolean {
      return released;
    },
  };
}
