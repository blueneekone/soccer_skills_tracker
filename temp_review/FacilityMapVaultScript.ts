<script lang="ts">
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { storage, db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		deleteDoc,
		deleteField,
		doc,
		GeoPoint,
		onSnapshot,
		serverTimestamp,
		setDoc,
		updateDoc,
	} from 'firebase/firestore';
	import { deleteObject, ref } from 'firebase/storage';
	import '$lib/styles/enterprise-console.css';
	import Modal from '$lib/components/Modal.svelte';
	import TacticalBuilder from '$lib/components/field-ops/TacticalBuilder.svelte';
	import FacilityDrawingMap from '$lib/components/field-ops/FacilityDrawingMap.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { syncFacilityToLegacyField } from '$lib/director/fieldOps/syncFacilityToLegacyField.js';
	import { readFirestoreCoord, hydrateSig, parseFacilityMapData, type FacilityMapDataPayload } from '$lib/utils/facilityHelpers.js';
	import { renderPdfPageToCanvas } from '$lib/utils/pdfRenderer.js';

	/**
	 * @typedef {{ version: 1; polygons: Array<{ name: string; path: Array<{ lat: number; lng: number }> }>; markers: Array<{ label?: string; lat: number; lng: number }> }} FacilityMapDataPayload
	 * @typedef {{ id: string; name: string; address?: string; mapStoragePath?: string; mapDownloadUrl?: string; type?: 'image' | 'pdf'; uploadedAt?: import('firebase/firestore').Timestamp; latitude?: number; longitude?: number; routingUrl?: string; tacticalCanvasJson?: string; status?: string; lockReason?: string; lockedAt?: import('firebase/firestore').Timestamp; mapData?: string }} FacilityMapRow
	 */

	let { clubId = '', canManage = false, embedded = false } = $props();

	let rows = $state(/** @type {FacilityMapRow[]} */ ([]));
	let previewId = $state(/** @type {string | null} */ (null));
	let previewOpen = $state(false);
	let draftAddress = $state('');
	/** Editable facility display name (drawer logistics save). */
	let draftName = $state('');
	/** @type {number | null} */
	let draftLat = $state(null);
	/** @type {number | null} */
	let draftLng = $state(null);
	let logisticsSaving = $state(false);
	let logisticsSaveErr = $state('');
	/** After a successful logistics write, block snapshot-driven hero hydrate for this facility briefly (stale cache). */
	let logisticsPostSaveHydrateQuietUntil = $state(0);
	/** Facility id protected by `logisticsPostSaveHydrateQuietUntil` (paired with timestamp). */
	let logisticsQuietFacilityId = $state(/** @type {string | null} */ (null));
	/** Registry form (logistics-only facility docs — no vault map asset required). */
	let regName = $state('');
	let regAddress = $state('');
	let regLat = $state('');
	let regLng = $state('');
	let regStatus = $state(/** @type {'Active' | 'Locked'} */ ('Active'));
	let regSaving = $state(false);
	let regErr = $state('');
	/** @type {'Active' | 'Locked' | 'LOCKED'} */
	let draftStatus = $state('Active');

	/** Google Drawing overlay payload; persisted as Firestore string field `mapData`. */
	let draftMapData = $state(
		/** @type {FacilityMapDataPayload} */ ({
			version: 1,
			polygons: [],
			markers: [],
		}),
	);

	/** Hero satellite map (main vault frame); draft state lives in drawer — separate bind targets avoid dual-map conflicts. */
	let heroFacilityId = $state('');
	/** @type {number | null} */
	let heroLat = $state(null);
	/** @type {number | null} */
	let heroLng = $state(null);
	let heroMapData = $state(
		/** @type {FacilityMapDataPayload} */ ({
			version: 1,
			polygons: [],
			markers: [],
		}),
	);
	let heroSaving = $state(false);
	let heroSaveErr = $state('');

	/**
	 * Last `${clubId}:${facilityId}` we hydrated hero editor state from Firestore for.
	 * Prevents `applyHeroFromRow` on every `onSnapshot` — that overwrote unsaved pin moves (logs §77–85 vs §84–85).
	 */
	let lastHeroHydrateKey = $state('');
	/** Last hero-row snapshot fingerprint (`hydrateSig`) we applied — skips redundant applies while still catching cache→server corrections. */
	let lastAppliedHydrateSig = $state('');
	/** Bump when Firestore hydrates hero row so map effect remounts with correct initial center (refresh). */
	let heroCoordRevision = $state(0);

	let facilityEditOpen = $state(false);
	let facilityEditId = $state(/** @type {string | null} */ (null));
	let facilityEditName = $state('');
	let facilityEditAddress = $state('');
	let facilityEditLatStr = $state('');
	let facilityEditLngStr = $state('');
	/** @type {'Active' | 'Locked' | 'LOCKED'} */
	let facilityEditStatus = $state('Active');
	let facilityEditSaving = $state(false);
	let facilityEditErr = $state('');

	const previewRow = $derived.by(() => {
		if (!previewId) return /** @type {FacilityMapRow | null} */ (null);
		return rows.find((r) => r.id === previewId) ?? null;
	});

	const routingDisplayUri = $derived(
		draftLat != null && draftLng != null ?
			`http://googleusercontent.com/maps.google.com/maps?daddr=${draftLat},${draftLng}`
		:	''
	);

	/** @type {HTMLCanvasElement | null} */
	let pdfCanvasEl = $state(null);
	let pdfBusy = $state(false);

	$effect(() => {
		if (!clubId) {
			rows = [];
			return;
		}
		const col = collection(db, 'clubs', clubId, 'facilities');
		const unsub = onSnapshot(
			col,
			(snap) => {
				const list = snap.docs.map((d) => {
					const x = d.data();
					const lat = readFirestoreCoord(x.latitude);
					const lng = readFirestoreCoord(x.longitude);
					const routingUrl =
						typeof x.routingUrl === 'string' && x.routingUrl ? x.routingUrl : undefined;
					const tacticalCanvasJson =
						typeof x.tacticalCanvasJson === 'string' && x.tacticalCanvasJson.trim() ?
							x.tacticalCanvasJson
						:	undefined;
					const mapStoragePath =
						typeof x.mapStoragePath === 'string' ? x.mapStoragePath : '';
					const mapDownloadUrl =
						typeof x.mapDownloadUrl === 'string' ? x.mapDownloadUrl : '';
					const status = typeof x.status === 'string' ? x.status : '';
					const lockReason = typeof x.lockReason === 'string' ? x.lockReason : '';
					const lockedAt = x.lockedAt;
					const mapDataRaw = x.mapData;
					const mapData =
						typeof mapDataRaw === 'string' && mapDataRaw.trim() ?
							mapDataRaw
						:	undefined;
					const hasVaultMap = Boolean(mapStoragePath && mapDownloadUrl);
					return {
						id: d.id,
						name: typeof x.name === 'string' ? x.name : d.id,
						address: typeof x.address === 'string' ? x.address : '',
						...(mapStoragePath ? { mapStoragePath } : {}),
						...(mapDownloadUrl ? { mapDownloadUrl } : {}),
						...(hasVaultMap ? { type: x.type === 'pdf' ? 'pdf' : 'image' } : {}),
						uploadedAt: x.uploadedAt,
						...(lat !== undefined ? { latitude: lat } : {}),
						...(lng !== undefined ? { longitude: lng } : {}),
						...(routingUrl ? { routingUrl } : {}),
						...(tacticalCanvasJson ? { tacticalCanvasJson } : {}),
						...(status ? { status } : {}),
						...(lockReason ? { lockReason } : {}),
						...(lockedAt ? { lockedAt } : {}),
						...(mapData ? { mapData } : {}),
					};
				});
				list.sort((a, b) => {
					const ta = a.uploadedAt?.toMillis?.() ?? 0;
					const tb = b.uploadedAt?.toMillis?.() ?? 0;
					if (tb !== ta) return tb - ta;
					return a.name.localeCompare(b.name);
				});
				rows = list;
			},
			(e) => console.error('[FacilityMapVault]', e)
		);
		return () => unsub();
	});

	/**
	 * @param {FacilityMapRow} row
	 */
	function applyHeroFromRow(row) {
    if (!db || !authStore.isAuthenticated) return;
		heroFacilityId = row.id;
		heroLat = typeof row.latitude === 'number' ? row.latitude : null;
		heroLng = typeof row.longitude === 'number' ? row.longitude : null;
		heroMapData = parseFacilityMapData(row.mapData);
		if (clubId) lastHeroHydrateKey = `${clubId}:${row.id}`;
		lastAppliedHydrateSig = hydrateSig(row);
		heroCoordRevision += 1;
	}

	/** Default hero facility when list loads or current id is missing. Prefer last selection per club (localStorage). */
	$effect(() => {
		if (!clubId) return;
		if (rows.length === 0) {
			heroFacilityId = '';
			return;
		}
		if (!heroFacilityId || !rows.some((r) => r.id === heroFacilityId)) {
			let preferred = '';
			if (browser) {
				try {
					preferred = localStorage.getItem(`fm-vault-hero-facility:${clubId}`) ?? '';
				} catch {
					preferred = '';
				}
			}
			if (preferred && rows.some((r) => r.id === preferred)) {
				heroFacilityId = preferred;
			} else {
				heroFacilityId = rows[0].id;
			}
		}
	});

	/** Remember embedded-map facility selection across refresh (same browser profile). */
	$effect(() => {
		if (!browser || !clubId || !heroFacilityId) return;
		try {
			localStorage.setItem(`fm-vault-hero-facility:${clubId}`, heroFacilityId);
		} catch {
			/* ignore quota / private mode */
		}
	});

	/**
	 * Hydrate hero from Firestore when club/facility changes or when the **same** facility's Firestore row changes
	 * (coords/mapData) on a later snapshot (multi-tab / cache-then-server). `rows.length` alone misses those updates.
	 */
	$effect(() => {
		if (!clubId) {
			lastHeroHydrateKey = '';
			lastAppliedHydrateSig = '';
			return;
		}
		if (!heroFacilityId) {
			lastHeroHydrateKey = '';
			lastAppliedHydrateSig = '';
			return;
		}
		const row = rows.find((r) => r.id === heroFacilityId);
		void row?.latitude;
		void row?.longitude;
		void row?.mapData;

		const snapSig = hydrateSig(row);

		/**
		 * Snapshot-driven hydrate must pause during any facility write: hero save blocks stale overwrite of the pin,
		 * and logistics save blocks hydrate too — `rows.find` runs every snapshot and `lastHeroHydrateKey` can miss
		 * edge cases while drawer coords differ from hero.
		 */
		if (
			heroSaving ||
			logisticsSaving ||
			(facilityEditSaving && facilityEditId && facilityEditId === heroFacilityId)
		) {
			return;
		}
		/** Do not push pre-ack snapshot into hero while quiet window protects this doc after logistics save. */
		if (
			logisticsPostSaveHydrateQuietUntil > Date.now() &&
			logisticsQuietFacilityId &&
			row?.id === logisticsQuietFacilityId
		) {
			return;
		}

		const key = `${clubId}:${heroFacilityId}`;
		if (key === lastHeroHydrateKey && snapSig === lastAppliedHydrateSig) return;
		if (!row) return;

		applyHeroFromRow(row);
	});

	function closePreview() {
		previewOpen = false;
		previewId = null;
		pdfBusy = false;
		logisticsPostSaveHydrateQuietUntil = 0;
		logisticsQuietFacilityId = null;
		logisticsSaveErr = '';
		draftAddress = '';
		draftName = '';
		draftLat = null;
		draftLng = null;
		draftStatus = 'Active';
		draftMapData = { version: 1, polygons: [], markers: [] };
	}

	/**
	 * @param {FacilityMapRow} row
	 */
	function openPreview(row) {
		/**
		 * While saving logistics, Firestore snapshots may still carry pre-write coords/mapData.
		 * Re-running openPreview for the same row (table click or downstream effects) would clobber
		 * draftLat/draftLng/draftMapData and snap the routing marker back until the write settles.
		 */
		if (logisticsSaving && previewOpen && previewId === row.id) {
			return;
		}
		if (
			logisticsPostSaveHydrateQuietUntil > Date.now() &&
			logisticsQuietFacilityId === row.id &&
			previewOpen &&
			previewId === row.id
		) {
			return;
		}
		previewId = row.id;
		previewOpen = true;
		draftAddress = row.address ?? '';
		draftName = typeof row.name === 'string' ? row.name.trim().slice(0, 200) : '';
		draftLat = typeof row.latitude === 'number' ? row.latitude : null;
		draftLng = typeof row.longitude === 'number' ? row.longitude : null;
		logisticsSaveErr = '';
		const st = row.status || '';
		draftStatus =
			st === 'LOCKED' ? 'LOCKED' :
			st === 'Locked' ? 'Locked' :
			st === 'Active' ? 'Active' :
			'Active';
		draftMapData = parseFacilityMapData(row.mapData);
		applyHeroFromRow(row);
	}

	/** Hero dropdown ↔ drawer: switching facility in hero updates an open drawer to the same row. */
	$effect(() => {
		if (!previewOpen || !heroFacilityId || !previewId) return;
		if (heroFacilityId === previewId) return;
		const row = rows.find((r) => r.id === heroFacilityId);
		if (row) openPreview(row);
	});

	/**
	 * @param {FacilityMapRow} row
	 */
	function statusTone(row) {
		const s = row.status || '';
		if (s === 'LOCKED' || s === 'Locked') return 'locked';
		return 'active';
	}

	/** Mirror facility map rows into legacy `fields` for pitch booking. */
	async function mirrorFacilityToFields(
		fieldId: string,
		name: string,
		location = '',
		status = 'Active',
	) {
		if (!clubId || !canManage) return;
		try {
			await syncFacilityToLegacyField({
				fieldId,
				clubId,
				name,
				location,
				status,
			});
		} catch (e) {
			console.error('[FacilityMapVault] legacy field sync', e);
		}
	}

	async function saveRegistryFacility() {
		regErr = '';
		if (!clubId || !canManage) return;
		const nameTrim = regName.trim();
		if (!nameTrim) {
			regErr = 'Facility name is required.';
			return;
		}
		const lat = parseFloat(regLat);
		const lng = parseFloat(regLng);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			regErr = 'Enter valid latitude and longitude.';
			return;
		}
		if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
			regErr = 'Coordinates are out of range.';
			return;
		}
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
		const fid =
			typeof crypto !== 'undefined' && crypto.randomUUID ?
				crypto.randomUUID()
			:	`fac_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
		regSaving = true;
		try {
			await setDoc(doc(db, 'clubs', clubId, 'facilities', fid), {
				name: nameTrim.slice(0, 200),
				address: regAddress.trim().slice(0, 500),
				latitude: lat,
				longitude: lng,
				routingUrl,
				status: regStatus,
			});
			await mirrorFacilityToFields(fid, nameTrim, regAddress.trim(), regStatus);
			regName = '';
			regAddress = '';
			regLat = '';
			regLng = '';
			regStatus = 'Active';
		} catch (e) {
			regErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			regSaving = false;
		}
	}

	$effect(() => {
		if (!browser || !previewOpen || !previewRow || previewRow.type !== 'pdf') return;
		const url = previewRow.mapDownloadUrl;
		if (!url) return;

		let cancelled = false;
		const ac = new AbortController();
		pdfBusy = true;

		(async () => {
			try {
				if (pdfCanvasEl) {
					await renderPdfPageToCanvas(url, pdfCanvasEl, ac.signal);
				}
			} catch (e) {
				console.error('[FacilityMapVault] pdf render', e);
			} finally {
				if (!cancelled) pdfBusy = false;
			}
		})();

		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	/**
	 * @param {FacilityMapRow} row
	 */
	async function removeRow(row) {
		if (!canManage || !clubId) return;
		if (!confirm(`Remove “${row.name}” from the vault?`)) return;
		if (row.mapStoragePath) {
			try {
				await deleteObject(ref(storage, row.mapStoragePath));
			} catch {
				/* file may already be gone */
			}
		}
		try {
			await deleteDoc(doc(db, 'clubs', clubId, 'facilities', row.id));
			await mirrorFacilityToFields(row.id, row.name, row.address ?? '', 'closed');
		} catch (e) {
			alert(e instanceof Error ? e.message : String(e));
		}
		if (previewId === row.id) closePreview();
		if (heroFacilityId === row.id) {
			heroFacilityId = '';
		}
	}

	async function saveHeroFacility() {
		heroSaveErr = '';
		if (!canManage || !clubId || !heroFacilityId) return;
		const row = rows.find((r) => r.id === heroFacilityId);
		const rawName = typeof row?.name === 'string' ? row.name.trim() : '';
		const nameTrim = (rawName || heroFacilityId).slice(0, 200);
		if (heroLat == null || heroLng == null) {
			alert('Place the routing pin on the map or pick a facility with coordinates.');
			return;
		}
		const mdJson = JSON.stringify(heroMapData);
		if (mdJson.length > 500000) {
			heroSaveErr =
				'Field drawing data exceeds the 500 KB limit. Clear drawings or simplify shapes, then try again.';
			return;
		}
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${heroLat},${heroLng}`;
		heroSaving = true;
		try {
			const st = row?.status || '';
			const statusOut =
				st === 'LOCKED' ? 'LOCKED' :
				st === 'Locked' ? 'Locked' :
				'Active';
			/** @type {Record<string, unknown>} */
			const patch: Record<string, unknown> = {
				name: nameTrim,
				address: typeof row?.address === 'string' ? row.address.trim().slice(0, 500) : '',
				latitude: heroLat,
				longitude: heroLng,
				routingUrl,
				status: statusOut,
				mapData: mdJson,
			};
			if (statusOut === 'Active') {
				patch.lockReason = deleteField();
				patch.lockedAt = deleteField();
			}
			await updateDoc(doc(db, 'clubs', clubId, 'facilities', heroFacilityId), patch);
			await mirrorFacilityToFields(
				heroFacilityId,
				nameTrim,
				typeof row?.address === 'string' ? row.address.trim() : '',
				statusOut,
			);
		} catch (e) {
			heroSaveErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			heroSaving = false;
		}
	}

	async function saveLogistics() {
		logisticsSaveErr = '';
		if (!canManage || !clubId || !previewId) return;
		const savingFacilityId = previewId;
		const nameTrim = draftName.trim().slice(0, 200);
		if (!nameTrim) {
			logisticsSaveErr = 'Facility name is required.';
			return;
		}
		if (draftLat == null || draftLng == null) {
			alert('Enter latitude and longitude (use the map pin or fields above).');
			return;
		}
		const mdJson = JSON.stringify(draftMapData);
		if (mdJson.length > 500000) {
			logisticsSaveErr =
				'Field drawing data exceeds the 500 KB limit. Clear drawings or simplify shapes, then try again.';
			return;
		}
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${draftLat},${draftLng}`;
		/** Set before any await so reactive hydrates and pin sync never see a window with saving false mid-flight. */
		logisticsSaving = true;
		try {
			/** @type {Record<string, unknown>} */
			const patch: Record<string, unknown> = {
				name: nameTrim,
				address: draftAddress.trim().slice(0, 500),
				latitude: draftLat,
				longitude: draftLng,
				routingUrl,
				status:
					draftStatus === 'LOCKED' ? 'LOCKED' :
					draftStatus === 'Locked' ? 'Locked' :
					'Active',
				mapData: mdJson,
			};
			if (draftStatus === 'Active') {
				patch.lockReason = deleteField();
				patch.lockedAt = deleteField();
			}
			await updateDoc(doc(db, 'clubs', clubId, 'facilities', previewId), patch);
			await mirrorFacilityToFields(
				previewId,
				nameTrim,
				draftAddress.trim(),
				typeof patch.status === 'string' ? patch.status : 'Active',
			);
			logisticsQuietFacilityId = savingFacilityId;
			logisticsPostSaveHydrateQuietUntil = Date.now() + 450;
		} catch (e) {
			logisticsSaveErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
			logisticsQuietFacilityId = null;
			logisticsPostSaveHydrateQuietUntil = 0;
		} finally {
			logisticsSaving = false;
		}
	}

	/**
	 * @param {FacilityMapRow} row
	 */
	function openFacilityEditModal(row) {
		facilityEditErr = '';
		facilityEditId = row.id;
		facilityEditName = typeof row.name === 'string' ? row.name : '';
		facilityEditAddress = typeof row.address === 'string' ? row.address : '';
		facilityEditLatStr =
			typeof row.latitude === 'number' && Number.isFinite(row.latitude) ? String(row.latitude) : '';
		facilityEditLngStr =
			typeof row.longitude === 'number' && Number.isFinite(row.longitude) ? String(row.longitude) : '';
		const st = row.status || '';
		facilityEditStatus =
			st === 'LOCKED' ? 'LOCKED' :
			st === 'Locked' ? 'Locked' :
			'Active';
		facilityEditOpen = true;
	}

	async function saveFacilityEditModal() {
		facilityEditErr = '';
		if (!canManage || !clubId || !facilityEditId) return;
		const nameTrim = facilityEditName.trim().slice(0, 200);
		if (!nameTrim) {
			facilityEditErr = 'Facility name is required.';
			return;
		}
		const lat = Number(facilityEditLatStr.trim());
		const lng = Number(facilityEditLngStr.trim());
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			facilityEditErr = 'Enter valid latitude and longitude.';
			return;
		}
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
		facilityEditSaving = true;
		try {
			const st = facilityEditStatus;
			const statusOut =
				st === 'LOCKED' ? 'LOCKED' :
				st === 'Locked' ? 'Locked' :
				'Active';
			/** @type {Record<string, unknown>} */
			const patch: Record<string, unknown> = {
				name: nameTrim,
				address: facilityEditAddress.trim().slice(0, 500),
				latitude: lat,
				longitude: lng,
				routingUrl,
				status: statusOut,
			};
			if (statusOut === 'Active') {
				patch.lockReason = deleteField();
				patch.lockedAt = deleteField();
			}
			await updateDoc(doc(db, 'clubs', clubId, 'facilities', facilityEditId), patch);
			await mirrorFacilityToFields(
				facilityEditId,
				nameTrim,
				facilityEditAddress.trim(),
				statusOut,
			);
			if (heroFacilityId === facilityEditId) {
				heroLat = lat;
				heroLng = lng;
				heroCoordRevision += 1;
			}
			facilityEditOpen = false;
			facilityEditId = null;
		} catch (e) {
			facilityEditErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			facilityEditSaving = false;
		}
	}

	/**
	 * @param {import('firebase/firestore').Timestamp | undefined} t
	 */
	function fmtTime(t) {
		if (!t?.toDate) return '—';
		try {
			return t.toDate().toLocaleString();
		} catch {
			return '—';
		}
	}
</script>
