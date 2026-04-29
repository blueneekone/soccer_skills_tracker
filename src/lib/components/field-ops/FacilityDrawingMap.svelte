<script>
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { createAdvancedPinMarker } from '$lib/maps/advancedMarkers.js';
	import { ensureGoogleMapsLoaded, getGoogleMapsApiKey, getGoogleMapsMapId } from '$lib/maps/ensureGoogleMaps.js';

	/**
	 * @typedef {{ lat: number; lng: number }} LatLng
	 * @typedef {{ name: string; path: LatLng[]; color?: string }} FacilityPolygonRecord
	 * @typedef {{ label?: string; lat: number; lng: number }} FacilityMarkerRecord
	 * @typedef {{ version: 1; polygons: FacilityPolygonRecord[]; markers: FacilityMarkerRecord[] }} FacilityMapData
	 */

	let {
		latitude = $bindable(/** @type {number | null} */ (null)),
		longitude = $bindable(/** @type {number | null} */ (null)),
		mapData = $bindable(/** @type {FacilityMapData} */ ({ version: 1, polygons: [], markers: [] })),
		readonly = false,
		/** Bump when parent hydrates coords from Firestore so map remounts with correct center (refresh). Not tied to drag. */
		coordRevision = 0,
		/**
		 * While true, do not move the routing pin from reactively synced lat/lng props (Firestore can briefly
		 * broadcast stale coords during an in-flight save). Drag/click placement still updates bindables.
		 */
		lockRoutingPinSync = false,
		/** Embedded vault hero: save handler placed beside Clear. */
		onSaveMap = undefined,
		saveBusy = false,
		saveDisabled = false,
	} = $props();

	const apiKey = getGoogleMapsApiKey();
	const mapsMapId = getGoogleMapsMapId();

	let mapRoot = $state(/** @type {HTMLDivElement | null} */ (null));
	let loadError = $state(false);

	let mapHandles = $state(
		/** @type {null | { map: any; g: any; routingMarker: any | null }} */ (null),
	);

	let resetFlip = $state(0);

	/** Selected saved field polygon for color editing (index into mapData.polygons / drawnPolygons). */
	let selectedPolygonIndex = $state(/** @type {number | null} */ (null));

	/** Selected facility marker for removal (index into mapData.markers). */
	let selectedMarkerIndex = $state(/** @type {number | null} */ (null));

	/** Close draft polygon when click is within this distance (m) of the first vertex (snap-to-close). */
	const SNAP_CLOSE_METERS = 28;

	/** Draw polygons below facility pins so markers stay visible on top. */
	const FACILITY_POLYGON_Z_INDEX = 5;
	const FACILITY_MARKER_Z_INDEX = 120;

	/**
	 * While placing markers, polygons must not capture clicks so taps pass through to the map.
	 */
	function syncPolygonClickableForMarkerPlacement() {
		const refs = facilityDrawRefs;
		if (!refs?.drawnPolygons?.length) return;
		const passthrough = manualDrawMode === 'marker';
		for (const poly of refs.drawnPolygons) {
			try {
				poly.setOptions({ clickable: !passthrough });
			} catch {
				/* ignore */
			}
		}
	}

	$effect(() => {
		const n = mapData.polygons.length;
		if (selectedPolygonIndex !== null && (selectedPolygonIndex < 0 || selectedPolygonIndex >= n)) {
			selectedPolygonIndex = null;
		}
	});

	$effect(() => {
		const n = mapData.markers.length;
		if (selectedMarkerIndex !== null && (selectedMarkerIndex < 0 || selectedMarkerIndex >= n)) {
			selectedMarkerIndex = null;
		}
	});

	/**
	 * Great-circle distance in meters (for snap-to-close near first vertex).
	 * @param {{ lat: number; lng: number }} a
	 * @param {{ lat: number; lng: number }} b
	 */
	function haversineMeters(a, b) {
		const R = 6371000;
		const dLat = (((b.lat - a.lat) * Math.PI) / 180);
		const dLng = (((b.lng - a.lng) * Math.PI) / 180);
		const lat1 = (a.lat * Math.PI) / 180;
		const lat2 = (b.lat * Math.PI) / 180;
		const s =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
		return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
	}

	/** Read a hex token from `:root` for Google Maps Pin/Polygon APIs. */
	function cssVarHex(/** @type {string} */ name, /** @type {string} */ fallback) {
		if (!browser) return fallback;
		const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		if (!/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(raw)) return fallback;
		if (raw.length === 4) {
			return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
		}
		return raw;
	}

	/** Facility polygons & pin fills — `--brand-accent` from global design system. */
	function defaultFieldColorHex() {
		return cssVarHex('--brand-accent', '#10b981');
	}

	function facilityPinBorderHex() {
		return cssVarHex('--enterprise-primary-bg', '#0a0a0a');
	}

	function facilityPinGlyphHex() {
		return cssVarHex('--enterprise-primary-fg', '#ffffff');
	}

	/** @param {string | undefined} hex */
	function normalizeFieldColorHex(hex) {
		if (typeof hex === 'string') {
			const t = hex.trim();
			if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
			if (/^#[0-9a-fA-F]{3}$/.test(t)) {
				return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`;
			}
		}
		return defaultFieldColorHex();
	}

	/** @param {string | undefined} hex */
	function fieldPolygonPaint(hex) {
		const h = normalizeFieldColorHex(hex);
		return {
			fillColor: h,
			strokeColor: h,
			fillOpacity: 0.22,
			strokeOpacity: 0.95,
			strokeWeight: 2,
		};
	}

	/**
	 * Keep bindable mapData.path in sync when the user drags polygon vertices; attach selection click.
	 * @param {any} g
	 * @param {any} poly
	 * @param {number} recordIndex index into mapData.polygons
	 * @param {boolean} polygonsLocked
	 */
	function wireSavedPolygon(g, poly, recordIndex, polygonsLocked) {
		poly.__facilityPolygonIndex = recordIndex;
		if (polygonsLocked) return;
		poly.setOptions({ editable: true, draggable: false });
		const path = poly.getPath();
		const syncPathToMapData = () => {
			const nextPath = /** @type {{ lat: number; lng: number }[]} */ ([]);
			path.forEach((/** @type {any} */ ll) => {
				nextPath.push({ lat: ll.lat(), lng: ll.lng() });
			});
			mapData = {
				version: 1,
				polygons: mapData.polygons.map((rec, i) => (i === recordIndex ? { ...rec, path: nextPath } : rec)),
				markers: [...mapData.markers],
			};
		};
		for (const ev of /** @type {const} */ (['set_at', 'insert_at', 'remove_at'])) {
			g.maps.event.addListener(path, ev, syncPathToMapData);
		}
		g.maps.event.addListener(poly, 'click', () => {
			selectedPolygonIndex = recordIndex;
			selectedMarkerIndex = null;
		});
	}

	/**
	 * Select marker on click; stop propagation when possible so the map does not also place the routing pin.
	 * @param {any} g
	 * @param {any} marker AdvancedMarkerElement
	 */
	function wireFacilityMarkerClick(g, marker) {
		const handler = () => {
			const idx = marker.__facilityMarkerIndex;
			if (typeof idx !== 'number') return;
			selectedMarkerIndex = idx;
			selectedPolygonIndex = null;
		};
		g.maps.event.addListener(marker, 'gmp-click', (/** @type {any} */ e) => {
			try {
				e?.stop?.();
			} catch {
				/* ignore */
			}
			handler();
		});
	}

	/** @param {any} pos google.maps.LatLng | LatLngLiteral */
	function markerPositionToPlain(pos) {
		if (pos == null) return null;
		const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
		const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
		return { lat, lng };
	}

	/**
	 * Persist marker position after drag (editable facility pins).
	 * @param {any} g
	 * @param {any} marker
	 */
	function wireFacilityMarkerDrag(g, marker) {
		const idx = marker.__facilityMarkerIndex;
		if (typeof idx !== 'number') return;
		g.maps.event.addListener(marker, 'gmp-dragend', () => {
			const plain = markerPositionToPlain(marker.position);
			if (!plain) return;
			mapData = {
				version: 1,
				polygons: [...mapData.polygons],
				markers: mapData.markers.map((m, i) => (i === idx ? { ...m, lat: plain.lat, lng: plain.lng } : m)),
			};
		});
	}

	/**
	 * Persist routing pin position after drag (Advanced Marker).
	 * @param {any} g
	 * @param {any} marker
	 */
	function wireRoutingPinDrag(g, marker) {
		g.maps.event.addListener(marker, 'gmp-dragend', () => {
			const plain = markerPositionToPlain(marker.position);
			if (!plain) return;
			latitude = plain.lat;
			longitude = plain.lng;
		});
	}

	function removeSelectedFacilityMarker() {
		const idx = selectedMarkerIndex;
		const refs = facilityDrawRefs;
		if (idx == null || !refs || idx < 0 || idx >= mapData.markers.length) return;
		const m = refs.drawnMarkers[idx];
		if (m) {
			try {
				m.map = null;
			} catch {
				/* ignore */
			}
		}
		refs.drawnMarkers.splice(idx, 1);
		mapData = {
			version: 1,
			polygons: [...mapData.polygons],
			markers: mapData.markers.filter((_, i) => i !== idx),
		};
		for (let j = 0; j < refs.drawnMarkers.length; j++) {
			refs.drawnMarkers[j].__facilityMarkerIndex = j;
		}
		selectedMarkerIndex = null;
	}

	function applySelectedPolygonColorFromPicker(hexInput) {
		const idx = selectedPolygonIndex;
		if (idx == null || idx < 0 || idx >= mapData.polygons.length) return;
		const hex = normalizeFieldColorHex(hexInput);
		mapData = {
			version: 1,
			polygons: mapData.polygons.map((rec, i) => (i === idx ? { ...rec, color: hex } : rec)),
			markers: [...mapData.markers],
		};
		const refs = facilityDrawRefs;
		const poly = refs?.drawnPolygons.find(
			(/** @type {any} */ p) => p.__facilityPolygonIndex === idx,
		);
		if (poly) poly.setOptions(fieldPolygonPaint(hex));
	}

	/** @param {string} raw */
	function applySelectedMarkerLabelInput(raw) {
		const idx = selectedMarkerIndex;
		if (idx == null || idx < 0 || idx >= mapData.markers.length) return;
		const trimmed = String(raw ?? '').trim().slice(0, 120);
		const cur = mapData.markers[idx];
		mapData = {
			version: 1,
			polygons: [...mapData.polygons],
			markers: mapData.markers.map((m, i) => {
				if (i !== idx) return m;
				const next = /** @type {typeof cur} */ ({ lat: m.lat, lng: m.lng });
				if (trimmed) next.label = trimmed;
				return next;
			}),
		};
		const refs = facilityDrawRefs;
		const marker = refs?.drawnMarkers[idx];
		if (marker) {
			try {
				marker.title = trimmed || 'Marker';
			} catch {
				/* ignore */
			}
		}
	}

	/** Replaces deprecated DrawingManager — click map to add vertices; Finish closes polygon. */
	let manualDrawMode = $state(/** @type {null | 'polygon' | 'marker'} */ (null));
	let polygonDraftPts = $state(/** @type {{ lat: number; lng: number }[]} */ ([]));

	/** Polyline preview while drafting (module scope so toolbar handlers can clear). */
	let polygonDraftPreview = /** @type {any} */ (null);

	/** Mutable draft points — Maps click listener reads this ref so mode/path stay fresh outside Svelte's reactive closure. */
	const polygonDraftPtsRef = { pts: /** @type {{ lat: number; lng: number }[]} */ ([]) };

	/** Synced from manualDrawMode — external Maps listeners must not read stale $state closures. */
	const interactionModeRef = { value: /** @type {null | 'polygon' | 'marker'} */ (null) };

	/** Set once the map instance exists — used by polygon toolbar actions. */
	/** @type {null | { drawnPolygons: any[]; drawnMarkers: any[]; map: any; g: any }} */
	let facilityDrawRefs = null;

	$effect(() => {
		interactionModeRef.value = manualDrawMode;
	});

	function brandPrimaryHex() {
		return cssVarHex('--brand-primary', '#6366f1');
	}

	function snapshotFacilityMapData(data) {
		try {
			return /** @type {FacilityMapData} */ (JSON.parse(JSON.stringify(data)));
		} catch {
			return { version: /** @type {const} */ (1), polygons: [], markers: [] };
		}
	}

	/**
	 * @param {any} map
	 * @param {any} g
	 * @param {FacilityMapData} data
	 * @param {any[]} polygonSink
	 * @param {any[]} markerSink
	 * @param {boolean} polygonsLocked when true (readonly map), polygons are not editable and emit no path sync
	 */
	async function hydrateFromMapData(map, g, data, polygonSink, markerSink, polygonsLocked) {
		for (const p of polygonSink.splice(0)) {
			try {
				p.setMap(null);
			} catch {
				/* ignore */
			}
		}
		for (const m of markerSink.splice(0)) {
			try {
				m.map = null;
			} catch {
				/* ignore */
			}
		}

		const bounds = new g.maps.LatLngBounds();

		const polys = data.polygons || [];
		for (let i = 0; i < polys.length; i++) {
			const polyRec = polys[i];
			if (!polyRec?.path?.length || typeof polyRec.name !== 'string') continue;
			const path = polyRec.path.map(
				(pt) =>
					new g.maps.LatLng(
						typeof pt.lat === 'number' ? pt.lat : Number(pt.lat),
						typeof pt.lng === 'number' ? pt.lng : Number(pt.lng),
					),
			);
			const paint = fieldPolygonPaint(polyRec.color);
			const poly = new g.maps.Polygon({
				paths: path,
				map,
				zIndex: FACILITY_POLYGON_Z_INDEX,
				...paint,
				editable: false,
				draggable: false,
			});
			polygonSink.push(poly);
			wireSavedPolygon(g, poly, i, polygonsLocked);
			path.forEach((/** @type {any} */ ll) => bounds.extend(ll));
		}

		syncPolygonClickableForMarkerPlacement();

		const marks = data.markers || [];
		for (let mi = 0; mi < marks.length; mi++) {
			const mr = marks[mi];
			if (typeof mr.lat !== 'number' || typeof mr.lng !== 'number') continue;
			const marker = await createAdvancedPinMarker(
				g,
				map,
				{ lat: mr.lat, lng: mr.lng },
				{
					title: mr.label || '',
					background: defaultFieldColorHex(),
					borderColor: facilityPinBorderHex(),
					glyphColor: facilityPinGlyphHex(),
					zIndex: FACILITY_MARKER_Z_INDEX,
					draggable: !polygonsLocked,
				},
			);
			marker.__facilityMarkerIndex = mi;
			markerSink.push(marker);
			if (!polygonsLocked) {
				wireFacilityMarkerClick(g, marker);
				wireFacilityMarkerDrag(g, marker);
			}
			bounds.extend({ lat: mr.lat, lng: mr.lng });
		}

		if (!bounds.isEmpty()) {
			map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
			g.maps.event.addListenerOnce(map, 'idle', () => {
				const z = map.getZoom();
				if (typeof z === 'number' && z > 19) map.setZoom(19);
			});
		}
	}

	function cancelPolygonDraft(clearMode = true) {
		polygonDraftPtsRef.pts.length = 0;
		polygonDraftPts = [];
		if (polygonDraftPreview) {
			try {
				polygonDraftPreview.setMap(null);
			} catch {
				/* ignore */
			}
			polygonDraftPreview = null;
		}
		if (clearMode) manualDrawMode = null;
		interactionModeRef.value = manualDrawMode;
	}

	function togglePolygonMode() {
		if (manualDrawMode === 'polygon') {
			if (polygonDraftPtsRef.pts.length >= 3) {
				finishPolygonDraft();
			}
			if (manualDrawMode === 'polygon') {
				cancelPolygonDraft(true);
			}
			interactionModeRef.value = manualDrawMode;
			syncPolygonClickableForMarkerPlacement();
			return;
		}
		selectedMarkerIndex = null;
		manualDrawMode = 'polygon';
		cancelPolygonDraft(false);
		interactionModeRef.value = manualDrawMode;
		syncPolygonClickableForMarkerPlacement();
	}

	function toggleMarkerMode() {
		if (manualDrawMode === 'marker') {
			manualDrawMode = null;
		} else {
			cancelPolygonDraft(false);
			selectedPolygonIndex = null;
			manualDrawMode = 'marker';
		}
		interactionModeRef.value = manualDrawMode;
		syncPolygonClickableForMarkerPlacement();
	}

	function finishPolygonDraft() {
		const refs = facilityDrawRefs;
		if (!refs?.map || polygonDraftPtsRef.pts.length < 3) return;
		const rawName =
			typeof window !== 'undefined' ?
				window.prompt('Name this field (e.g. Field 1, North Pitch)', '')
			:	null;
		const name = rawName != null ? String(rawName).trim() : '';
		if (!name) return;

		const coords = polygonDraftPtsRef.pts.map((p) => ({ lat: p.lat, lng: p.lng }));
		const path = coords.map((p) => new refs.g.maps.LatLng(p.lat, p.lng));
		const paint = fieldPolygonPaint(defaultFieldColorHex());
		const poly = new refs.g.maps.Polygon({
			paths: path,
			map: refs.map,
			zIndex: FACILITY_POLYGON_Z_INDEX,
			...paint,
			fillOpacity: 0.25,
			editable: false,
			draggable: false,
		});
		refs.drawnPolygons.push(poly);
		const newIndex = mapData.polygons.length;
		mapData = {
			version: 1,
			polygons: [...mapData.polygons, { name, path: coords, color: defaultFieldColorHex() }],
			markers: [...mapData.markers],
		};
		wireSavedPolygon(refs.g, poly, newIndex, readonly);
		selectedPolygonIndex = newIndex;
		cancelPolygonDraft(true);
		syncPolygonClickableForMarkerPlacement();
	}

	$effect(() => {
		const locked = lockRoutingPinSync;
		const lat = latitude;
		const lng = longitude;
		const h = mapHandles;
		if (locked) return;
		if (!h?.routingMarker || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
		h.routingMarker.position = { lat, lng };
	});

	/**
	 * Coordinates may hydrate after map mount (parent Firestore snapshot); initial loader uses untrack(latitude).
	 * Without this, refresh showed Kansas zoom 4 with no pin until interaction.
	 */
	$effect(() => {
		if (!browser || readonly) return;
		const lat = latitude;
		const lng = longitude;
		const h = mapHandles;
		if (!h?.map || !h?.g) return;
		if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
		if (h.routingMarker) return;

		void (async () => {
			const g = h.g;
			const map = h.map;
			/** @type {any} */
			let nm;
			try {
				nm = await createAdvancedPinMarker(g, map, { lat, lng }, {
					title: 'Routing pin',
					background: brandPrimaryHex(),
					zIndex: 99999,
					draggable: !readonly,
				});
			} catch {
				return;
			}
			const cur = mapHandles;
			if (!cur || cur.map !== map || cur.routingMarker) {
				try {
					nm.map = null;
				} catch {
					/* ignore */
				}
				return;
			}
			wireRoutingPinDrag(g, nm);
			mapHandles = { ...cur, routingMarker: nm };
			try {
				map.panTo({ lat, lng });
				map.setZoom(17);
			} catch {
				/* ignore */
			}
		})();
	});

	$effect(() => {
		if (!browser || !mapRoot || !apiKey || !mapsMapId) return;

		void coordRevision;

		loadError = false;

		const lat0 = untrack(() => latitude);
		const lng0 = untrack(() => longitude);
		const readOnly = untrack(() => readonly);
		const initialMapData = untrack(() => snapshotFacilityMapData(mapData));

		let cancelled = false;
		let resizeObs = /** @type {ResizeObserver | null} */ (null);
		let map = /** @type {any} */ (null);
		let routingMarker = /** @type {any} */ (null);
		let mapClickListener = /** @type {any} */ (null);
		const drawnPolygons = /** @type {any[]} */ ([]);
		const drawnMarkers = /** @type {any[]} */ ([]);

		mapHandles = null;
		facilityDrawRefs = null;

		(async () => {
			try {
				const g = await ensureGoogleMapsLoaded();
				if (cancelled || !mapRoot) return;

				if (!g?.maps) {
					loadError = true;
					return;
				}

				const center =
					lat0 != null && lng0 != null ?
						{ lat: lat0, lng: lng0 }
					:	{ lat: 39.8283, lng: -98.5795 };
				const zoom = lat0 != null && lng0 != null ? 17 : 4;

				map = new g.maps.Map(mapRoot, {
					mapId: mapsMapId,
					center,
					zoom,
					mapTypeId: g.maps.MapTypeId.HYBRID,
					mapTypeControl: true,
					streetViewControl: false,
					fullscreenControl: true,
					clickableIcons: false,
				});

				const kickResize = () => {
					if (cancelled || !map) return;
					try {
						g.maps.event.trigger(map, 'resize');
					} catch {
						/* ignore */
					}
				};
				requestAnimationFrame(() => {
					requestAnimationFrame(() => kickResize());
				});

				facilityDrawRefs = { drawnPolygons, drawnMarkers, map, g };

				if (lat0 != null && lng0 != null) {
					routingMarker = await createAdvancedPinMarker(g, map, center, {
						title: 'Routing pin',
						background: brandPrimaryHex(),
						zIndex: 99999,
						draggable: !readOnly,
					});
					if (!readOnly && routingMarker) {
						wireRoutingPinDrag(g, routingMarker);
					}
				}

				mapHandles = { map, g, routingMarker };

				if (typeof ResizeObserver !== 'undefined' && mapRoot) {
					resizeObs = new ResizeObserver(() => {
						if (cancelled || !map) return;
						try {
							g.maps.event.trigger(map, 'resize');
						} catch {
							/* ignore */
						}
					});
					resizeObs.observe(mapRoot);
				}
				try {
					g.maps.event.trigger(map, 'resize');
				} catch {
					/* ignore */
				}

				try {
					await hydrateFromMapData(map, g, initialMapData, drawnPolygons, drawnMarkers, readOnly);
				} catch (he) {
					console.warn('[FacilityDrawingMap] hydrateFromMapData failed', he);
				}

				if (!readOnly) {
					mapClickListener = map.addListener('click', (/** @type {any} */ e) => {
						if (cancelled || !e.latLng) return;
						const plat = e.latLng.lat();
						const plng = e.latLng.lng();

						if (interactionModeRef.value === 'polygon') {
							const pts = polygonDraftPtsRef.pts;
							const click = { lat: plat, lng: plng };
							if (
								pts.length >= 3 &&
								haversineMeters(pts[0], click) <= SNAP_CLOSE_METERS
							) {
								finishPolygonDraft();
								return;
							}
							pts.push(click);
							polygonDraftPts = [...pts];
							if (!polygonDraftPreview) {
								polygonDraftPreview = new g.maps.Polyline({
									path: polygonDraftPtsRef.pts,
									strokeColor: defaultFieldColorHex(),
									strokeOpacity: 1,
									strokeWeight: 2,
									map,
									clickable: false,
								});
							} else {
								polygonDraftPreview.setPath(polygonDraftPtsRef.pts);
							}
							return;
						}

						if (interactionModeRef.value === 'marker') {
							void (async () => {
								const refs = facilityDrawRefs;
								if (!refs?.map || cancelled) return;
								const raw =
									typeof window !== 'undefined' ?
										window.prompt('Label this marker (optional)', '')
									:	null;
								const label = raw != null ? String(raw).trim() : '';
								const m = await createAdvancedPinMarker(g, refs.map, { lat: plat, lng: plng }, {
									title: label || 'Marker',
									background: defaultFieldColorHex(),
									borderColor: facilityPinBorderHex(),
									glyphColor: facilityPinGlyphHex(),
									zIndex: FACILITY_MARKER_Z_INDEX,
									draggable: true,
								});
								const markerIdx = mapData.markers.length;
								m.__facilityMarkerIndex = markerIdx;
								refs.drawnMarkers.push(m);
								wireFacilityMarkerClick(g, m);
								wireFacilityMarkerDrag(g, m);
								mapData = {
									version: 1,
									polygons: [...mapData.polygons],
									markers: [
										...mapData.markers,
										label ?
											{
												label,
												lat: plat,
												lng: plng,
											}
										:	{
												lat: plat,
												lng: plng,
											},
									],
								};
								manualDrawMode = null;
								interactionModeRef.value = manualDrawMode;
								syncPolygonClickableForMarkerPlacement();
							})();
							return;
						}

						void (async () => {
							selectedMarkerIndex = null;
							selectedPolygonIndex = null;
							const h = mapHandles;
							if (!h?.map) return;
							if (h.routingMarker) {
								try {
									h.routingMarker.map = null;
								} catch {
									/* ignore */
								}
							}
							const nm = await createAdvancedPinMarker(g, h.map, { lat: plat, lng: plng }, {
								title: 'Routing pin',
								background: brandPrimaryHex(),
								zIndex: 99999,
								draggable: true,
							});
							routingMarker = nm;
							mapHandles = { ...h, routingMarker: nm };
							wireRoutingPinDrag(g, nm);
							latitude = plat;
							longitude = plng;
						})();
					});
				}
			} catch (e) {
				console.error('[FacilityDrawingMap]', e);
				loadError = true;
			}
		})();

		return () => {
			cancelled = true;
			facilityDrawRefs = null;
			cancelPolygonDraft(false);
			polygonDraftPtsRef.pts.length = 0;
			polygonDraftPreview = null;
			if (resizeObs && mapRoot) {
				try {
					resizeObs.unobserve(mapRoot);
				} catch {
					/* ignore */
				}
				resizeObs.disconnect();
				resizeObs = null;
			}
			mapHandles = null;
			const ggl = globalThis.google;
			if (mapClickListener && ggl?.maps?.event) {
				ggl.maps.event.removeListener(mapClickListener);
			}
			for (const p of drawnPolygons) {
				try {
					p.setMap(null);
				} catch {
					/* ignore */
				}
			}
			drawnPolygons.length = 0;
			for (const m of drawnMarkers) {
				try {
					m.map = null;
				} catch {
					/* ignore */
				}
			}
			drawnMarkers.length = 0;
			if (routingMarker) {
				try {
					routingMarker.map = null;
				} catch {
					/* ignore */
				}
				routingMarker = null;
			}
			if (map && ggl?.maps?.event) {
				ggl.maps.event.clearInstanceListeners(map);
			}
			map = null;
		};
	});

	function requestRemountForClear() {
		selectedPolygonIndex = null;
		selectedMarkerIndex = null;
		resetFlip += 1;
		mapData = { version: 1, polygons: [], markers: [] };
	}
</script>

{#if !apiKey}
	<div
		class="fd-map-empty fd-map-empty--no-key"
		role="img"
		aria-label="Google Maps API key required"
	>
		<i class="ph ph-lock-key fd-map-empty__icon" aria-hidden="true"></i>
		<p class="fd-map-empty__text">
			Set <code class="fd-map-code">VITE_GOOGLE_MAPS_API_KEY</code> (or
			<code class="fd-map-code">VITE_PUBLIC_GOOGLE_MAPS_API_KEY</code>) to enable satellite drawing tools.
		</p>
	</div>
{:else if !mapsMapId}
	<div class="fd-map-empty fd-map-empty--no-key" role="img" aria-label="Google Maps Map ID required">
		<i class="ph ph-map-pin fd-map-empty__icon" aria-hidden="true"></i>
		<p class="fd-map-empty__text">
			Set <code class="fd-map-code">VITE_GOOGLE_MAPS_MAP_ID</code> (Google Cloud → Map Management → Map IDs) so Advanced
			Markers work — required after Google deprecated classic markers.
		</p>
	</div>
{:else if loadError}
	<div class="fd-map-empty fd-map-empty--error" role="img" aria-label="Google Maps failed to load">
		<i class="ph ph-map-pin fd-map-empty__icon" aria-hidden="true"></i>
		<p class="fd-map-empty__text">Unable to load Google Maps. Check your API key and billing.</p>
	</div>
{:else}
	{#key resetFlip}
		<div class="fd-map-shell">
			<div class="fd-map-toolbar">
				{#if !readonly}
					<div class="fd-map-toolbar__cluster">
						<div class="fd-map-toolbar__acts">
							<button
								type="button"
								class="fd-map-act fd-map-act--blue"
								class:fd-map-act--active={manualDrawMode === 'polygon'}
								onclick={() => togglePolygonMode()}
							>
								Draw field
							</button>
							<button
								type="button"
								class="fd-map-act fd-map-act--blue"
								class:fd-map-act--active={manualDrawMode === 'marker'}
								onclick={() => toggleMarkerMode()}
							>
								Place marker
							</button>
							<button type="button" class="fd-map-act fd-map-act--blue" onclick={() => requestRemountForClear()}>
								Clear field drawings
							</button>
							{#if typeof onSaveMap === 'function'}
								<button
									type="button"
									class="fd-map-act fd-map-act--green"
									disabled={saveBusy || saveDisabled}
									onclick={() => void onSaveMap()}
								>
									{saveBusy ? 'Saving…' : 'Save map & pin'}
								</button>
							{/if}
						</div>
						<div class="fd-map-draw-group">
							{#if manualDrawMode === 'polygon' && polygonDraftPts.length >= 3}
								<button type="button" class="fd-map-draw-btn fd-map-draw-btn--primary" onclick={() => finishPolygonDraft()}>
									Finish polygon
								</button>
							{/if}
							{#if manualDrawMode === 'polygon' && polygonDraftPts.length > 0}
								<button type="button" class="fd-map-draw-btn" onclick={() => cancelPolygonDraft(true)}> Cancel </button>
							{/if}
							{#if manualDrawMode === 'polygon' && polygonDraftPts.length >= 3}
								<p class="fd-map-draft-hint">
									Tap near your first point (~30&nbsp;m) to snap closed, or use Finish polygon.
								</p>
							{/if}
						</div>
						{#if selectedPolygonIndex !== null && mapData.polygons[selectedPolygonIndex]}
							<div class="fd-map-field-style">
								<span class="fd-map-field-style__label">Selected field</span>
								<label class="fd-map-field-style__color">
									<span class="fd-map-field-style__hint">Color</span>
									<input
										type="color"
										value={normalizeFieldColorHex(mapData.polygons[selectedPolygonIndex].color)}
										aria-label="Field polygon color"
										oninput={(e) =>
											applySelectedPolygonColorFromPicker(/** @type {HTMLInputElement} */ (e.currentTarget).value)}
									/>
								</label>
								<button type="button" class="fd-map-draw-btn" onclick={() => (selectedPolygonIndex = null)}>
									Done styling
								</button>
							</div>
							<p class="fd-map-field-style__tip">Tip: drag the hollow squares on the outline to reshape.</p>
						{/if}
						{#if selectedMarkerIndex !== null && mapData.markers[selectedMarkerIndex]}
							<div class="fd-map-marker-style">
								<div class="fd-map-marker-style__head">
									<span class="fd-map-field-style__label">Selected marker</span>
								</div>
								<div class="fd-map-marker-style__field">
									<label class="fd-map-marker-label" for={`fd-marker-label-${selectedMarkerIndex}`}>
										<span class="fd-map-field-style__hint">Label</span>
										<input
											id={`fd-marker-label-${selectedMarkerIndex}`}
											type="text"
											class="fd-map-marker-label-input"
											value={mapData.markers[selectedMarkerIndex].label ?? ''}
											placeholder="Optional label"
											maxlength={120}
											aria-label="Marker label"
											oninput={(e) =>
												applySelectedMarkerLabelInput(/** @type {HTMLInputElement} */ (e.currentTarget).value)}
										/>
									</label>
								</div>
								<div class="fd-map-marker-style__actions">
									<button
										type="button"
										class="fd-map-draw-btn fd-map-marker-remove"
										onclick={() => removeSelectedFacilityMarker()}
									>
										Remove marker
									</button>
									<button type="button" class="fd-map-draw-btn" onclick={() => (selectedMarkerIndex = null)}>
										Done
									</button>
								</div>
							</div>
							<p class="fd-map-marker-style__tip">
								Edit the label above (saved with your map). Drag the pin to move it. Use Place marker mode to drop pins on top of fields.
							</p>
						{/if}
					</div>
				{/if}
			</div>
			<div
				id="facility-map"
				bind:this={mapRoot}
				class="fd-map-root"
				role="application"
				aria-label={readonly ? 'Facility satellite map' : 'Satellite map — draw fields or click to set routing pin'}
			></div>
		</div>
	{/key}
{/if}

<style>
	.fd-map-shell {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-height: 0;
		width: 100%;
		height: 100%;
	}

	.fd-map-root {
		box-sizing: border-box;
		flex: 1 1 auto;
		min-height: 500px;
		height: 500px;
		width: 100%;
		position: relative;
		z-index: 1;
		border-radius: var(--radius-inner);
		overflow: hidden;
		border: 1px solid var(--glass-border);
		margin: 0;
		background: var(--glass-bg);
		box-shadow: var(--shadow-premium);
	}

	:global(html.dark) .fd-map-root {
		border-color: var(--glass-border);
		background: var(--glass-bg);
	}

	.fd-map-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--spacing-element);
		flex-shrink: 0;
		margin-bottom: var(--spacing-element);
	}

	.fd-map-toolbar__cluster {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		flex: 1 1 auto;
		min-width: 0;
	}

	@media (max-width: 639px) {
		.fd-map-toolbar__cluster {
			width: 100%;
			flex-basis: 100%;
		}
	}

	.fd-map-toolbar__acts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		width: 100%;
		flex-basis: 100%;
		box-sizing: border-box;
	}

	.fd-map-act {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		font: inherit;
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		min-height: 42px;
		padding: 9px 14px;
		border-radius: 10px;
		cursor: pointer;
		touch-action: manipulation;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease,
			filter 0.15s ease;
	}

	.fd-map-act--blue {
		border: 1px solid var(--ec-ops-border-subtle, rgba(34, 211, 238, 0.28));
		background: linear-gradient(
			155deg,
			rgba(34, 211, 238, 0.16) 0%,
			rgba(15, 23, 42, 0.94) 48%,
			rgba(9, 9, 11, 0.98) 100%
		);
		color: #ecfeff;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.35) inset,
			0 10px 22px rgba(0, 0, 0, 0.28);
	}

	.fd-map-act--blue:hover:not(:disabled) {
		border-color: rgba(34, 211, 238, 0.52);
		background: linear-gradient(
			155deg,
			rgba(34, 211, 238, 0.26) 0%,
			rgba(15, 23, 42, 0.9) 48%,
			rgba(9, 9, 11, 0.96) 100%
		);
		color: #ffffff;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.38) inset,
			0 12px 26px rgba(0, 0, 0, 0.32);
	}

	.fd-map-act--blue.fd-map-act--active {
		border-color: var(--ec-ops-accent, #22d3ee);
		box-shadow:
			var(--shadow-premium),
			var(--ec-ops-glow, 0 0 24px rgba(34, 211, 238, 0.12)),
			0 0 0 1px rgba(0, 0, 0, 0.35) inset;
	}

	.fd-map-act--green {
		border: 1px solid rgba(52, 211, 153, 0.42);
		background: linear-gradient(
			155deg,
			rgba(52, 211, 153, 0.22) 0%,
			rgba(15, 23, 42, 0.92) 48%,
			rgba(9, 9, 11, 0.98) 100%
		);
		color: #ecfdf5;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.35) inset,
			0 10px 22px rgba(0, 0, 0, 0.28);
	}

	.fd-map-act--green:hover:not(:disabled) {
		border-color: rgba(52, 211, 153, 0.62);
		background: linear-gradient(
			155deg,
			rgba(52, 211, 153, 0.34) 0%,
			rgba(15, 23, 42, 0.88) 48%,
			rgba(9, 9, 11, 0.96) 100%
		);
		color: #ffffff;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.38) inset,
			0 12px 26px rgba(0, 0, 0, 0.32);
	}

	.fd-map-act:disabled {
		opacity: 1;
		cursor: not-allowed;
		filter: grayscale(0.12);
		background: rgba(51, 65, 85, 0.65);
		border-color: rgba(148, 163, 184, 0.35);
		color: rgba(248, 250, 252, 0.82);
	}

	:global(html.dark) .fd-map-act--blue:not(:disabled):not(.fd-map-act--active) {
		border-color: rgba(34, 211, 238, 0.38);
	}

	:global(html.dark) .fd-map-act--green:not(:disabled) {
		border-color: rgba(52, 211, 153, 0.45);
	}

	.fd-map-field-style {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-radius: var(--radius-inner);
		border: 1px solid var(--ec-ops-border-subtle, rgba(34, 211, 238, 0.22));
		background: var(--ec-ops-sheen, rgba(34, 211, 238, 0.12));
		box-shadow: var(--ec-ops-glow, none);
	}

	.fd-map-field-style__label {
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ec-ops-accent, #22d3ee);
	}

	.fd-map-field-style__hint {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-right: 4px;
	}

	.fd-map-field-style__color {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		cursor: pointer;
	}

	.fd-map-field-style__color input[type='color'] {
		width: 32px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--input-border);
		border-radius: 6px;
		cursor: pointer;
		background: var(--input-bg);
	}

	.fd-map-marker-style {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
		padding: 10px 12px;
		flex: 1 1 100%;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		border-radius: var(--radius-inner);
		border: 1px solid var(--ec-ops-border-subtle, rgba(34, 211, 238, 0.22));
		background: var(--ec-ops-ambient, rgba(34, 211, 238, 0.045));
		box-shadow: var(--shadow-premium);
	}

	.fd-map-marker-style__head {
		flex-shrink: 0;
	}

	.fd-map-marker-style__field {
		width: 100%;
		min-width: 0;
	}

	.fd-map-marker-style__actions {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 2px;
	}

	@media (min-width: 640px) {
		.fd-map-marker-style__actions {
			flex-wrap: nowrap;
		}
	}

	.fd-map-marker-label {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 6px;
		width: 100%;
		min-width: 0;
		margin: 0;
	}

	.fd-map-marker-label-input {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.35;
		padding: 10px 12px;
		min-height: 44px;
		border-radius: var(--radius-inner);
		border: 1px solid var(--input-border);
		background: var(--input-bg);
		color: var(--input-text);
	}

	@media (min-width: 640px) {
		.fd-map-marker-label-input {
			min-height: 40px;
			padding: 8px 12px;
		}
	}

	.fd-map-marker-label-input::placeholder {
		color: var(--text-secondary);
		opacity: 0.85;
	}

	.fd-map-marker-label-input:focus {
		outline: 2px solid var(--focus-ring-color);
		outline-offset: 1px;
	}

	.fd-map-marker-remove {
		color: var(--enterprise-primary-fg);
		background: color-mix(in srgb, var(--danger-red) 78%, transparent);
		border: 1px solid color-mix(in srgb, var(--danger-red) 42%, transparent);
	}

	.fd-map-marker-remove:hover {
		filter: brightness(1.06);
	}

	.fd-map-marker-style__tip {
		width: 100%;
		flex-basis: 100%;
		margin: 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.fd-map-field-style__tip {
		width: 100%;
		margin: 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.fd-map-draft-hint {
		width: 100%;
		flex-basis: 100%;
		margin: 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--ec-ops-accent, #22d3ee);
		line-height: 1.35;
		opacity: 0.95;
	}

	.fd-map-draw-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.fd-map-draw-btn {
		font: inherit;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 6px 10px;
		border-radius: var(--radius-inner);
		cursor: pointer;
		color: var(--text-primary);
		background: var(--glass-bg);
		border: 1px solid var(--border-subtle);
		box-shadow: var(--shadow-premium);
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.fd-map-draw-btn:hover {
		background: var(--surface-row-hover);
		border-color: var(--border-strong);
	}

	.fd-map-draw-btn--active {
		border-color: var(--ec-ops-accent, #22d3ee);
		box-shadow:
			var(--shadow-premium),
			var(--ec-ops-glow, 0 0 24px rgba(34, 211, 238, 0.08));
	}

	.fd-map-draw-btn--primary {
		color: var(--enterprise-primary-fg);
		background: var(--brand-primary);
		border: 1px solid color-mix(in srgb, var(--brand-primary) 72%, #000);
	}

	.fd-map-draw-btn--primary:hover {
		filter: brightness(1.05);
		border-color: color-mix(in srgb, var(--brand-primary) 55%, #000);
	}

	@media (max-width: 639px) {
		.fd-map-toolbar__acts .fd-map-act {
			flex: 1 1 auto;
			justify-content: center;
			text-align: center;
			min-width: 0;
		}
	}

	.fd-map-empty {
		box-sizing: border-box;
		display: flex;
		flex: 1 1 auto;
		min-height: 280px;
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		text-align: center;
		border-radius: var(--radius-premium);
		overflow: hidden;
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		box-shadow: var(--shadow-premium);
	}

	.fd-map-empty--no-key {
		background-color: var(--surface-subtle);
		background-image: repeating-linear-gradient(
			135deg,
			transparent,
			transparent 10px,
			color-mix(in srgb, var(--muted-slate) 14%, transparent) 10px,
			color-mix(in srgb, var(--muted-slate) 14%, transparent) 11px
		);
	}

	:global(html.dark) .fd-map-empty--no-key {
		background-color: var(--glass-bg);
	}

	.fd-map-empty--error {
		background-color: var(--glass-bg);
		border-color: color-mix(in srgb, var(--danger-red) 35%, transparent);
	}

	.fd-map-empty__icon {
		font-size: 2.25rem;
		line-height: 1;
		color: var(--brand-primary);
	}

	.fd-map-empty__text {
		margin: 0;
		max-width: 26rem;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.fd-map-code {
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--accent-orange-soft);
		background: var(--surface-subtle);
		padding: 1px 6px;
		border-radius: 4px;
		border: 1px solid var(--border-subtle);
	}
</style>
