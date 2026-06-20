/**
 * Field-mode AppMenuSheet state — shared across EnterpriseConsoleShell + PlayerShell.
 */
export type FieldMenuMode = 'browse' | 'pick-pin';
export type PinSlotIndex = 0 | 1 | 2 | 3;

/** Backdrop / swipe dismiss blocked for this long after open (ghost-tap on parent Tier-1). */
export const FIELD_MENU_DISMISS_GUARD_MS = 400;

/**
 * Reactive menu state — shells bind AppMenuSheet to fieldMenuState.open (not fieldMenu.open getter).
 */
export const fieldMenuState = $state({
	open: false,
	mode: 'browse' as FieldMenuMode,
	pickSlotIndex: 0 as PinSlotIndex,
	/** Set synchronously on open — AppMenuSheet dismiss guard before backdrop mounts. */
	openedAt: 0,
});

export function fieldMenuDismissBlocked(): boolean {
	return fieldMenuState.open && Date.now() - fieldMenuState.openedAt < FIELD_MENU_DISMISS_GUARD_MS;
}

export const fieldMenu = {
	get open(): boolean {
		return fieldMenuState.open;
	},
	get mode(): FieldMenuMode {
		return fieldMenuState.mode;
	},
	get pickSlotIndex(): PinSlotIndex {
		return fieldMenuState.pickSlotIndex;
	},
	get openedAt(): number {
		return fieldMenuState.openedAt;
	},
	openBrowse(): void {
		fieldMenuState.openedAt = Date.now();
		fieldMenuState.mode = 'browse';
		fieldMenuState.open = true;
	},
	openPickPin(slotIndex: PinSlotIndex): void {
		fieldMenuState.openedAt = Date.now();
		fieldMenuState.mode = 'pick-pin';
		fieldMenuState.pickSlotIndex = slotIndex;
		fieldMenuState.open = true;
	},
	close(): void {
		fieldMenuState.open = false;
		fieldMenuState.mode = 'browse';
	},
};
