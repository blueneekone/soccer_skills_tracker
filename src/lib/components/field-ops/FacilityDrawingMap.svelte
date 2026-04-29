<script>
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { ensureGoogleMapsLoaded, getGoogleMapsApiKey } from '$lib/maps/ensureGoogleMaps.js';

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

	let mapRoot = $state(/** @type {HTMLDivElement | null} */ (null));
	let loadError = $state(false);

	/** Set after Maps JS initializes — drives routing-pin sync from coord inputs. */
	let mapHandles = $state(
		/** @type {null | { map: any; g: any; routingMarker: any | null; routingIcon: any }} */ (null),
	);

	let resetFlip = $state(0);

	/** Debug dd2828 — map init inputs (hypothesis F/G). */
	$effect(() => {
		if (!browser) return;
		void latitude;
		void longitude;
		void loadError;
		// #region agent log
		fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
			body: JSON.stringify({
				sessionId: 'dd2828',
				location: 'FacilityDrawingMap.svelte:state',
				message: 'map inputs',
				data: {
					hypothesisId: 'F',
					hasApiKey: Boolean(apiKey),
					loadError,
					lat: latitude,
					lng: longitude,
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion
	});

	/**
	 * @param {string} hex
	 */
	function markerSvgDataUrl(hex) {
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 24">` +
			`<path fill="${hex}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>` +
			`</svg>`;
		return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
	}

	function brandPrimaryHex() {
		if (!browser) return '#f59e0b';
		const v = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
		if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
		return '#f59e0b';
	}

	/**
	 * Initial overlay snapshot. structuredClone($bindable mapData) can throw (DataCloneError) on reactive Proxies,
	 * which aborted the map mount effect before ensureGoogleMapsLoaded ran — see debug-dd2828 logs with map-effect-enter but no bootstrap.
	 * @param {FacilityMapData} data
	 */
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
	function hydrateFromMapData(map, g, data, polygonSink, markerSink) {
		for (const p of polygonSink.splice(0)) {
			try {
				p.setMap(null);
			} catch {
				/* ignore */
			}
		}
		for (const m of markerSink.splice(0)) {
			try {
				m.setMap(null);
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
						typeof pt.lng === 'number' ? pt.lng : Number(pt.lng)
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
			const pos = new g.maps.LatLng(mr.lat, mr.lng);
			const marker = new g.maps.Marker({
				map,
				position: pos,
				title: mr.label || '',
			});
			markerSink.push(marker);
			bounds.extend(pos);
		}

		if (!bounds.isEmpty()) {
			map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
			g.maps.event.addListenerOnce(map, 'idle', () => {
				const z = map.getZoom();
				if (typeof z === 'number' && z > 19) map.setZoom(19);
			});
		}
	}

	$effect(() => {
		const lat = latitude;
		const lng = longitude;
		const h = mapHandles;
		if (!h?.map || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
		const pos = { lat, lng };
		if (!h.routingMarker) {
			h.routingMarker = new h.g.maps.Marker({
				map: h.map,
				position: pos,
				icon: h.routingIcon,
				zIndex: 99999,
			});
		} else {
			h.routingMarker.setPosition(pos);
		}
	});

	$effect(() => {
		if (!browser || !mapRoot || !apiKey) return;

		// #region agent log
		fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
			body: JSON.stringify({
				sessionId: 'dd2828',
				location: 'FacilityDrawingMap.svelte:map-effect-enter',
				message: 'map mount effect running',
				data: {
					hypothesisId: 'X',
					rootW: mapRoot.clientWidth,
					rootH: mapRoot.clientHeight,
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion

		loadError = false;

		const lat0 = untrack(() => latitude);
		const lng0 = untrack(() => longitude);
		const readOnly = untrack(() => readonly);
		const initialMapData = untrack(() => snapshotFacilityMapData(mapData));

		let cancelled = false;
		/** @type {ResizeObserver | null} */
		let resizeObs = null;
		/** @type {any} */
		let map = null;
		/** @type {any} */
		let routingMarker = null;
		/** @type {any} */
		let mapClickListener = null;
		/** @type {any} */
		let overlayListener = null;
		/** @type {any} */
		let drawingManager = null;
		/** @type {any[]} */
		const drawnPolygons = [];
		/** @type {any[]} */
		const drawnMarkers = [];

		mapHandles = null;

		// #region agent log
		fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
			body: JSON.stringify({
				sessionId: 'dd2828',
				location: 'FacilityDrawingMap.svelte:pre-async',
				message: 'past mapData snapshot, entering loader',
				data: {
					hypothesisId: 'R',
					polygonsN: initialMapData.polygons?.length ?? 0,
					markersN: initialMapData.markers?.length ?? 0,
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion

		(async () => {
			try {
				const g = await ensureGoogleMapsLoaded();
				// #region agent log
				fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
					body: JSON.stringify({
						sessionId: 'dd2828',
						location: 'FacilityDrawingMap.svelte:post-await',
						message: 'ensureGoogleMapsLoaded settled',
						data: {
							hypothesisId: 'C',
							cancelled,
							hasMapRoot: Boolean(mapRoot),
						},
						timestamp: Date.now(),
					}),
				}).catch(() => {});
				// #endregion
				if (cancelled || !mapRoot) return;

				// #region agent log
				fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
					body: JSON.stringify({
						sessionId: 'dd2828',
						location: 'FacilityDrawingMap.svelte:bootstrap',
						message: 'ensureGoogleMapsLoaded resolved',
						data: {
							hypothesisId: 'S',
							loaderKind: 'classic-script',
							hasDrawing: Boolean(g.maps?.drawing?.DrawingManager),
						},
						timestamp: Date.now(),
					}),
				}).catch(() => {});
				// #endregion

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
				g.maps.event.addListenerOnce(map, 'idle', () => {
					kickResize();
					// #region agent log
					fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
						body: JSON.stringify({
							sessionId: 'dd2828',
							location: 'FacilityDrawingMap.svelte:idle',
							message: 'map idle (tiles/layout)',
							data: {
								hypothesisId: 'M',
								runId: 'idle-resize',
								zoom: typeof map.getZoom === 'function' ? map.getZoom() : null,
								cLat: center.lat,
								cLng: center.lng,
								rootW: mapRoot?.clientWidth ?? 0,
								rootH: mapRoot?.clientHeight ?? 0,
								gmChildren:
									mapRoot && typeof mapRoot.querySelectorAll === 'function' ?
										mapRoot.querySelectorAll('.gm-style,canvas,iframe').length
									:	0,
							},
							timestamp: Date.now(),
						}),
					}).catch(() => {});
					// #endregion
				});
				g.maps.event.addListenerOnce(map, 'tilesloaded', () => {
					// #region agent log
					fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
						body: JSON.stringify({
							sessionId: 'dd2828',
							location: 'FacilityDrawingMap.svelte:tilesloaded',
							message: 'first tiles loaded',
							data: {
								hypothesisId: 'P',
								runId: 'tiles',
								rootW: mapRoot?.clientWidth ?? 0,
								rootH: mapRoot?.clientHeight ?? 0,
							},
							timestamp: Date.now(),
						}),
					}).catch(() => {});
					// #endregion
				});

				const iconUrl = markerSvgDataUrl(brandPrimaryHex());
				const routingIcon = {
					url: iconUrl,
					scaledSize: new g.maps.Size(32, 40),
					anchor: new g.maps.Point(16, 40),
				};

				if (lat0 != null && lng0 != null) {
					routingMarker = new g.maps.Marker({
						map,
						position: center,
						icon: routingIcon,
						zIndex: 99999,
					});
				}

				mapHandles = { map, g, routingMarker, routingIcon };

				if (typeof ResizeObserver !== 'undefined' && mapRoot) {
					let resizeLogged = false;
					resizeObs = new ResizeObserver(() => {
						if (cancelled || !map) return;
						try {
							g.maps.event.trigger(map, 'resize');
							const rw = mapRoot?.clientWidth ?? 0;
							const rh = mapRoot?.clientHeight ?? 0;
							if (!resizeLogged && rw > 0 && rh > 0) {
								resizeLogged = true;
								// #region agent log
								fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
									body: JSON.stringify({
										sessionId: 'dd2828',
										location: 'FacilityDrawingMap.svelte:resize',
										message: 'map resize after nonzero layout',
										data: {
											hypothesisId: 'G',
											runId: 'post-fix',
											mapRootW: rw,
											mapRootH: rh,
										},
										timestamp: Date.now(),
									}),
								}).catch(() => {});
								// #endregion
							}
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
					hydrateFromMapData(map, g, initialMapData, drawnPolygons, drawnMarkers);
				} catch (he) {
					console.warn('[FacilityDrawingMap] hydrateFromMapData failed', he);
					// #region agent log
					fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
						body: JSON.stringify({
							sessionId: 'dd2828',
							location: 'FacilityDrawingMap.svelte:hydrate-fail',
							message: 'hydrateFromMapData threw (map kept)',
							data: {
								hypothesisId: 'H2',
								errShort:
									he instanceof Error ?
										he.message.slice(0, 160)
									:	String(he).slice(0, 160),
							},
							timestamp: Date.now(),
						}),
					}).catch(() => {});
					// #endregion
				}

				if (!readOnly) {
					try {
						if (g.maps?.drawing?.DrawingManager) {
							drawingManager = new g.maps.drawing.DrawingManager({
								drawingMode: null,
								drawingControl: true,
								drawingControlOptions: {
									position: g.maps.ControlPosition.TOP_CENTER,
									drawingModes: [g.maps.drawing.OverlayType.POLYGON, g.maps.drawing.OverlayType.MARKER],
								},
								polygonOptions: {
									fillColor: '#22c55e',
									fillOpacity: 0.25,
									strokeColor: '#22c55e',
									strokeOpacity: 1,
									strokeWeight: 2,
									editable: false,
									draggable: false,
								},
								markerOptions: {
									draggable: false,
								},
							});
							drawingManager.setMap(map);

							overlayListener = g.maps.event.addListener(drawingManager, 'overlaycomplete', (/** @type {any} */ e) => {
								if (cancelled) return;
								drawingManager.setDrawingMode(null);

								if (e.type === g.maps.drawing.OverlayType.POLYGON) {
									const poly = e.overlay;
									const path = poly.getPath();
									const coords = [];
									for (let i = 0; i < path.getLength(); i++) {
										const ll = path.getAt(i);
										coords.push({ lat: ll.lat(), lng: ll.lng() });
									}
									const rawName =
										typeof window !== 'undefined' ?
											window.prompt('Name this field (e.g. Field 1, North Pitch)', '')
										:	null;
									const name = rawName != null ? String(rawName).trim() : '';
									if (!name) {
										poly.setMap(null);
										return;
									}
									poly.setEditable(false);
									poly.setDraggable(false);
									drawnPolygons.push(poly);
									mapData = {
										version: 1,
										polygons: [...mapData.polygons, { name, path: coords }],
										markers: [...mapData.markers],
									};
								} else if (e.type === g.maps.drawing.OverlayType.MARKER) {
									const m = e.overlay;
									const pos = m.getPosition();
									if (!pos) {
										m.setMap(null);
										return;
									}
									const raw =
										typeof window !== 'undefined' ?
											window.prompt('Label this marker (optional)', '')
										:	null;
									const label = raw != null ? String(raw).trim() : '';
									drawnMarkers.push(m);
									mapData = {
										version: 1,
										polygons: [...mapData.polygons],
										markers: [
											...mapData.markers,
											{
												...(label ? { label } : {}),
												lat: pos.lat(),
												lng: pos.lng(),
											},
										],
									};
								}
							});
						}

						mapClickListener = map.addListener('click', (/** @type {any} */ e) => {
							if (cancelled || !e.latLng) return;
							if (drawingManager && drawingManager.getDrawingMode() !== null) return;
							const plat = e.latLng.lat();
							const plng = e.latLng.lng();
							const h = mapHandles;
							if (h?.routingMarker) {
								h.routingMarker.setMap(null);
							}
							const nm = new g.maps.Marker({
								map,
								position: { lat: plat, lng: plng },
								icon: routingIcon,
								zIndex: 99999,
							});
							routingMarker = nm;
							if (mapHandles) {
								mapHandles = { ...mapHandles, routingMarker: nm };
							}
							latitude = plat;
							longitude = plng;
						});
					} catch (te) {
						console.warn('[FacilityDrawingMap] drawing tools / click setup failed', te);
						// #region agent log
						fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
							body: JSON.stringify({
								sessionId: 'dd2828',
								location: 'FacilityDrawingMap.svelte:drawing-fail',
								message: 'drawing or click setup threw (map kept)',
								data: {
									hypothesisId: 'T',
									errShort:
										te instanceof Error ?
											te.message.slice(0, 160)
										:	String(te).slice(0, 160),
								},
								timestamp: Date.now(),
							}),
						}).catch(() => {});
						// #endregion
					}
				}
			} catch (e) {
				console.error('[FacilityDrawingMap]', e);
				// #region agent log
				fetch('http://127.0.0.1:7844/ingest/e11fbf9d-f584-42e4-bc6d-8ed178d35a24', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd2828' },
					body: JSON.stringify({
						sessionId: 'dd2828',
						location: 'FacilityDrawingMap.svelte:catch',
						message: 'map init failed',
						data: {
							hypothesisId: 'Y',
							errShort:
								e instanceof Error ?
									e.message.slice(0, 160)
								:	String(e).slice(0, 160),
						},
						timestamp: Date.now(),
					}),
				}).catch(() => {});
				// #endregion
				loadError = true;
			}
		})();

		return () => {
			cancelled = true;
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
			if (overlayListener && ggl?.maps?.event) {
				ggl.maps.event.removeListener(overlayListener);
			}
			if (mapClickListener && ggl?.maps?.event) {
				ggl.maps.event.removeListener(mapClickListener);
			}
			if (drawingManager && ggl?.maps?.event) {
				ggl.maps.event.clearInstanceListeners(drawingManager);
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
					m.setMap(null);
				} catch {
					/* ignore */
				}
			}
			drawnMarkers.length = 0;
			if (routingMarker) {
				routingMarker.setMap(null);
				routingMarker = null;
			}
			if (map && ggl?.maps?.event) {
				ggl.maps.event.clearInstanceListeners(map);
			}
			map = null;
			drawingManager = null;
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
					<button type="button" class="fd-map-clear" onclick={() => requestRemountForClear()}>
						Clear field drawings
					</button>
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

	/* Explicit px height — Maps JS often renders no tiles when height resolves from % flex alone
	   (see LogisticsMap.svelte). Keep min-height as floor inside embedded Field Ops vault. */
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
		justify-content: flex-end;
		flex-shrink: 0;
		margin-bottom: 8px;
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
