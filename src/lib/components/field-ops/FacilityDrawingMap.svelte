<script>
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { createAdvancedPinMarker } from '$lib/maps/advancedMarkers.js';
	import { ensureGoogleMapsLoaded, getGoogleMapsApiKey, getGoogleMapsMapId } from '$lib/maps/ensureGoogleMaps.js';

	/**
	 * @typedef {{ lat: number; lng: number }} LatLng
	 * @typedef {{ name: string; path: LatLng[] }} FacilityPolygonRecord
	 * @typedef {{ label?: string; lat: number; lng: number }} FacilityMarkerRecord
	 * @typedef {{ version: 1; polygons: FacilityPolygonRecord[]; markers: FacilityMarkerRecord[] }} FacilityMapData
	 */

	let {
		latitude = $bindable(/** @type {number | null} */ (null)),
		longitude = $bindable(/** @type {number | null} */ (null)),
		mapData = $bindable(/** @type {FacilityMapData} */ ({ version: 1, polygons: [], markers: [] })),
		readonly = false,
	} = $props();

	const apiKey = getGoogleMapsApiKey();
	const mapsMapId = getGoogleMapsMapId();

	let mapRoot = $state(/** @type {HTMLDivElement | null} */ (null));
	let loadError = $state(false);

	let mapHandles = $state(
		/** @type {null | { map: any; g: any; routingMarker: any | null }} */ (null),
	);

	let resetFlip = $state(0);

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
		if (!browser) return '#f59e0b';
		const v = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
		if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
		return '#f59e0b';
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
	 */
	async function hydrateFromMapData(map, g, data, polygonSink, markerSink) {
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

		for (const polyRec of data.polygons || []) {
			if (!polyRec?.path?.length || typeof polyRec.name !== 'string') continue;
			const path = polyRec.path.map(
				(pt) =>
					new g.maps.LatLng(
						typeof pt.lat === 'number' ? pt.lat : Number(pt.lat),
						typeof pt.lng === 'number' ? pt.lng : Number(pt.lng),
					),
			);
			const poly = new g.maps.Polygon({
				paths: path,
				map,
				fillColor: '#22c55e',
				fillOpacity: 0.22,
				strokeColor: '#22c55e',
				strokeOpacity: 0.95,
				strokeWeight: 2,
				editable: false,
				draggable: false,
			});
			polygonSink.push(poly);
			path.forEach((/** @type {any} */ ll) => bounds.extend(ll));
		}

		for (const mr of data.markers || []) {
			if (typeof mr.lat !== 'number' || typeof mr.lng !== 'number') continue;
			const marker = await createAdvancedPinMarker(
				g,
				map,
				{ lat: mr.lat, lng: mr.lng },
				{ title: mr.label || '', background: '#22c55e', zIndex: 40 },
			);
			markerSink.push(marker);
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
	}

	function togglePolygonMode() {
		if (manualDrawMode === 'polygon') {
			cancelPolygonDraft(true);
		} else {
			manualDrawMode = 'polygon';
			cancelPolygonDraft(false);
		}
	}

	function toggleMarkerMode() {
		if (manualDrawMode === 'marker') {
			manualDrawMode = null;
		} else {
			cancelPolygonDraft(false);
			manualDrawMode = 'marker';
		}
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
		const poly = new refs.g.maps.Polygon({
			paths: path,
			map: refs.map,
			fillColor: '#22c55e',
			fillOpacity: 0.25,
			strokeColor: '#22c55e',
			strokeOpacity: 1,
			strokeWeight: 2,
			editable: false,
			draggable: false,
		});
		refs.drawnPolygons.push(poly);
		mapData = {
			version: 1,
			polygons: [...mapData.polygons, { name, path: coords }],
			markers: [...mapData.markers],
		};
		cancelPolygonDraft(true);
	}

	$effect(() => {
		const lat = latitude;
		const lng = longitude;
		const h = mapHandles;
		if (!h?.routingMarker || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
		h.routingMarker.position = { lat, lng };
	});

	$effect(() => {
		if (!browser || !mapRoot || !apiKey || !mapsMapId) return;

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
					});
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
					await hydrateFromMapData(map, g, initialMapData, drawnPolygons, drawnMarkers);
				} catch (he) {
					console.warn('[FacilityDrawingMap] hydrateFromMapData failed', he);
				}

				if (!readOnly) {
					mapClickListener = map.addListener('click', (/** @type {any} */ e) => {
						if (cancelled || !e.latLng) return;
						const plat = e.latLng.lat();
						const plng = e.latLng.lng();

						if (interactionModeRef.value === 'polygon') {
							polygonDraftPtsRef.pts.push({ lat: plat, lng: plng });
							polygonDraftPts = [...polygonDraftPtsRef.pts];
							if (!polygonDraftPreview) {
								polygonDraftPreview = new g.maps.Polyline({
									path: polygonDraftPtsRef.pts,
									strokeColor: '#22c55e',
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
									background: '#22c55e',
									zIndex: 50,
								});
								refs.drawnMarkers.push(m);
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
							})();
							return;
						}

						void (async () => {
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
							});
							routingMarker = nm;
							mapHandles = { ...h, routingMarker: nm };
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
					<div class="fd-map-draw-group">
						<button
							type="button"
							class="fd-map-draw-btn"
							class:fd-map-draw-btn--active={manualDrawMode === 'polygon'}
							onclick={() => togglePolygonMode()}
						>
							Draw field
						</button>
						<button
							type="button"
							class="fd-map-draw-btn"
							class:fd-map-draw-btn--active={manualDrawMode === 'marker'}
							onclick={() => toggleMarkerMode()}
						>
							Place marker
						</button>
						{#if manualDrawMode === 'polygon' && polygonDraftPts.length >= 3}
							<button type="button" class="fd-map-draw-btn fd-map-draw-btn--primary" onclick={() => finishPolygonDraft()}>
								Finish polygon
							</button>
						{/if}
						{#if manualDrawMode === 'polygon' && polygonDraftPts.length > 0}
							<button type="button" class="fd-map-draw-btn" onclick={() => cancelPolygonDraft(true)}> Cancel </button>
						{/if}
					</div>
					<button type="button" class="fd-map-clear" onclick={() => requestRemountForClear()}> Clear field drawings </button>
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
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid rgba(51, 65, 85, 0.85);
		margin: 0;
		background: rgb(15 23 42);
	}

	:global(html.dark) .fd-map-root {
		border-color: rgba(71, 85, 105, 0.75);
		background: rgb(15 23 42);
	}

	.fd-map-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-shrink: 0;
		margin-bottom: 8px;
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
		letter-spacing: 0.05em;
		padding: 6px 10px;
		border-radius: 8px;
		cursor: pointer;
		color: #e2e8f0;
		background: rgba(30, 41, 59, 0.85);
		border: 1px solid rgba(71, 85, 105, 0.65);
	}

	.fd-map-draw-btn:hover {
		filter: brightness(1.08);
	}

	.fd-map-draw-btn--active {
		border-color: rgba(34, 197, 94, 0.65);
		box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.25);
	}

	.fd-map-draw-btn--primary {
		color: #ecfdf5;
		background: rgba(22, 101, 52, 0.65);
		border-color: rgba(34, 197, 94, 0.55);
	}

	.fd-map-clear {
		font: inherit;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 6px 12px;
		border-radius: 8px;
		cursor: pointer;
		color: #fecaca;
		background: rgba(127, 29, 29, 0.55);
		border: 1px solid rgba(248, 113, 113, 0.45);
		margin-left: auto;
	}

	.fd-map-clear:hover {
		filter: brightness(1.06);
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
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid rgb(51 65 85 / 0.65);
	}

	.fd-map-empty--no-key {
		background-color: #18181b;
		background-image: repeating-linear-gradient(
			135deg,
			transparent,
			transparent 10px,
			rgba(113, 113, 122, 0.09) 10px,
			rgba(113, 113, 122, 0.09) 11px
		);
	}

	.fd-map-empty--error {
		background-color: #18181b;
		border-color: rgba(248, 113, 113, 0.35);
	}

	.fd-map-empty__icon {
		font-size: 2.25rem;
		line-height: 1;
		color: #fbbf24;
	}

	.fd-map-empty__text {
		margin: 0;
		max-width: 26rem;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.45;
		color: #d4d4d8;
	}

	.fd-map-code {
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		font-weight: 700;
		color: #fde047;
		background: rgba(15, 23, 42, 0.75);
		padding: 1px 6px;
		border-radius: 4px;
	}
</style>
