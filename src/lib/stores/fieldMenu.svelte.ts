/**
 * Field-mode AppMenuSheet state — shared across EnterpriseConsoleShell + PlayerShell.
 */
export type FieldMenuMode = 'browse' | 'pick-pin';
export type PinSlotIndex = 0 | 1 | 2 | 3;

let open = $state(false);
let mode = $state<FieldMenuMode>('browse');
let pickSlotIndex = $state<PinSlotIndex>(0);

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
	openBrowse(): void {
		mode = 'browse';
		open = true;
	},
	openPickPin(slotIndex: PinSlotIndex): void {
		mode = 'pick-pin';
		pickSlotIndex = slotIndex;
		open = true;
	},
	close(): void {
		open = false;
		mode = 'browse';
	},
};
