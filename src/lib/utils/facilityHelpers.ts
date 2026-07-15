import { GeoPoint } from 'firebase/firestore';

export type FacilityMapDataPayload = {
	version: 1;
	polygons: Array<{ name: string; path: Array<{ lat: number; lng: number }>; color?: string }>;
	markers: Array<{ label?: string; lat: number; lng: number }>;
};

export function readFirestoreCoord(v: unknown): number | undefined {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim()) {
		const n = Number(v);
		return Number.isFinite(n) ? n : undefined;
	}
	if (v instanceof GeoPoint) {
		const n = v.latitude;
		return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
	}
	if (v && typeof v === 'object' && 'latitude' in v) {
		const n = (v as { latitude: unknown }).latitude;
		return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

export function hydrateSig(row: any): string {
	if (!row) return '';
	return `${row.latitude ?? ''},${row.longitude ?? ''}|${row.mapData ?? ''}`;
}

export function parseFacilityMapData(raw: unknown): FacilityMapDataPayload {
	if (typeof raw !== 'string' || !raw.trim()) {
		return { version: 1, polygons: [], markers: [] };
	}
	try {
		const o = JSON.parse(raw);
		if (!o || typeof o !== 'object') throw new Error('bad');
		const polys = Array.isArray(o.polygons) ? o.polygons : [];
		const markers = Array.isArray(o.markers) ? o.markers : [];
		const cleanPolys = [];
		for (const p of polys) {
			if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !Array.isArray(p.path)) continue;
			const path = [];
			for (const pt of p.path) {
				if (!pt || typeof pt !== 'object') continue;
				const lat = typeof pt.lat === 'number' ? pt.lat : Number(pt.lat);
				const lng = typeof pt.lng === 'number' ? pt.lng : Number(pt.lng);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
				path.push({ lat, lng });
			}
			if (path.length >= 3) {
				const entry: { name: string; path: Array<{ lat: number; lng: number }>; color?: string } = {
					name: p.name.trim().slice(0, 120),
					path,
				};
				const col =
					typeof p.color === 'string' ?
						p.color.trim().slice(0, 9)
					:	'';
				if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(col)) {
					entry.color = col.length === 4 ? `#${col[1]}${col[1]}${col[2]}${col[2]}${col[3]}${col[3]}` : col;
				}
				cleanPolys.push(entry);
			}
		}
		const cleanMarks = [];
		for (const m of markers) {
			if (!m || typeof m !== 'object') continue;
			const lat = typeof m.lat === 'number' ? m.lat : Number(m.lat);
			const lng = typeof m.lng === 'number' ? m.lng : Number(m.lng);
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
			const label =
				typeof m.label === 'string' && m.label.trim() ? m.label.trim().slice(0, 120) : undefined;
			cleanMarks.push(label ? { label, lat, lng } : { lat, lng });
		}
		return { version: 1, polygons: cleanPolys, markers: cleanMarks };
	} catch {
		return { version: 1, polygons: [], markers: [] };
	}
}
