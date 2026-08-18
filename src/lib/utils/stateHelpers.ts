import { untrack } from 'svelte';
import { goto } from '$app/navigation';
import { snapshot } from 'svelte/reactivity';

export function appendItem<T>(array: T[], newItem: T): T[] {
  return [...array, newItem];
}

export function navigateSafely(path: string): void {
  untrack(() => {
    goto(path);
  });
}

export function snapshotState<T>(state: T): T {
  try {
    return snapshot(state);
  } catch(e) {
    return state;
  }
}

export class BoundEventHandlerExample {
  active = $state(false);

  toggle = () => {
    this.active = !this.active;
  };
}
