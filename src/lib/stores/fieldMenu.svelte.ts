/**
 * Field-mode AppMenuSheet state — shared across EnterpriseConsoleShell + PlayerShell.
 */
export type FieldMenuMode = 'browse' | 'pick-pin';
export type PinSlotIndex = 0 | 1 | 2 | 3;

/** Backdrop / swipe dismiss blocked for this long after open (ghost-tap on parent Tier-1). */
export const FIELD_MENU_DISMISS_GUARD_MS = 400;

let open = $state(false);
let mode = $state<FieldMenuMode>('browse');
let pickSlotIndex = $state<PinSlotIndex>(0);
/** Set synchronously on open — AppMenuSheet dismiss guard before backdrop mounts. */
let openedAt = $state(0);

export function fieldMenuDismissBlocked(): boolean {
	return open && Date.now() - openedAt < FIELD_MENU_DISMISS_GUARD_MS;
}

export const fieldMenu = {
	get open(): boolean {
		return open;
	},
	get mode(): FieldMenuMode {
		return mode;
	},
	get pickSlotIndex(): PinSlotIndex {
		return pickSlotIndex;
	},
	get openedAt(): number {
		return openedAt;
	},
	openBrowse(): void {
		openedAt = Date.now();
		mode = 'browse';
		open = true;
	},
	openPickPin(slotIndex: PinSlotIndex): void {
		openedAt = Date.now();
		mode = 'pick-pin';
		pickSlotIndex = slotIndex;
		open = true;
	},
	close(): void {
		open = false;
		mode = 'browse';
	},
};
