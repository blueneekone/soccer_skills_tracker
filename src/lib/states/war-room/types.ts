/** Pitch / roster token on the tactical SVG. */
export type TacticalToken = {
	id: string;
	name?: string;
	number?: string;
	position?: string;
	color?: string;
	x?: number;
	y?: number;
	side?: 'friendly' | 'opponent';
};

/** Quadratic or cut polyline route with optional bound player. */
export type TacticalRoute = {
	id: string;
	x1: number;
	y1: number;
	cx: number;
	cy: number;
	x2: number;
	y2: number;
	color: string;
	bindPlayerId?: string | null;
	pathKind?: 'curve' | 'cut';
	delay?: number;
};

/** Persistent tactical play snapshot — decoupled from transient UI (HUD tool, holotable, selection). */
export interface TacticalCartridge {
	id: string;
	title: string;
	schemaVersion: string;
	metadata: {
		sport: string;
		duration: number;
		tags: string[];
	};
	entities: TacticalToken[];
	routes: TacticalRoute[];
}

export const TACTICAL_CARTRIDGE_SCHEMA_VERSION = '1.0.0' as const;

/** `setContext` / `getContext` key for `{ loadCartridge(payload) }` registered by `TacticalGrid`. */
export const WAR_ROOM_CARTRIDGE_CONTEXT = 'warRoomCartridge';
