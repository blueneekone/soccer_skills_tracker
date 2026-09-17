import { browser } from '$app/environment';
import { db, storage } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import {
	collection,
	deleteDoc,
	deleteField,
	doc,
	onSnapshot,
	serverTimestamp,
	setDoc,
	updateDoc,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { readFirestoreCoord, hydrateSig, parseFacilityMapData, type FacilityMapDataPayload } from '$lib/utils/facilityHelpers.js';
import { syncFacilityToLegacyField } from '$lib/director/fieldOps/syncFacilityToLegacyField.js';
import { untrack } from 'svelte';

export interface FacilityMapDataPayloadOld { version: 1; polygons: Array<{ name: string; path: Array<{ lat: number; lng: number }> }>; markers: Array<{ label?: string; lat: number; lng: number }> }
export interface FacilityMapRow { id: string; name: string; address?: string; mapStoragePath?: string; mapDownloadUrl?: string; type?: 'image' | 'pdf'; uploadedAt?: import('firebase/firestore').Timestamp; latitude?: number; longitude?: number; routingUrl?: string; tacticalCanvasJson?: string; status?: string; lockReason?: string; lockedAt?: import('firebase/firestore').Timestamp; mapData?: string }

export class FacilityMapVaultEngine {
	clubId = $state('');
	canManage = $state(false);

	rows = $state(/** @type {FacilityMapRow[]} */ ([]));
	previewId = $state(/** @type {string | null} */ (null));
	previewOpen = $state(false);

	draftAddress = $state('');
	draftName = $state('');
	draftLat = $state(/** @type {number | null} */ (null));
	draftLng = $state(/** @type {number | null} */ (null));
	draftStatus = $state(/** @type {'Active' | 'Locked' | 'LOCKED'} */ ('Active'));
	draftMapData = $state(/** @type {FacilityMapDataPayload} */ ({ version: 1, polygons: [], markers: [] }));

	logisticsSaving = $state(false);
	logisticsSaveErr = $state('');
	logisticsPostSaveHydrateQuietUntil = $state(0);
	logisticsQuietFacilityId = $state(/** @type {string | null} */ (null));

	regName = $state('');
	regAddress = $state('');
	regLat = $state('');
	regLng = $state('');
	regStatus = $state(/** @type {'Active' | 'Locked'} */ ('Active'));
	regSaving = $state(false);
	regErr = $state('');

	heroFacilityId = $state('');
	heroLat = $state(/** @type {number | null} */ (null));
	heroLng = $state(/** @type {number | null} */ (null));
	heroMapData = $state(/** @type {FacilityMapDataPayload} */ ({ version: 1, polygons: [], markers: [] }));
	heroSaving = $state(false);
	heroSaveErr = $state('');
	lastHeroHydrateKey = $state('');
	lastAppliedHydrateSig = $state('');
	heroCoordRevision = $state(0);

	facilityEditOpen = $state(false);
	facilityEditId = $state(/** @type {string | null} */ (null));
	facilityEditName = $state('');
	facilityEditAddress = $state('');
	facilityEditLatStr = $state('');
	facilityEditLngStr = $state('');
	facilityEditStatus = $state(/** @type {'Active' | 'Locked' | 'LOCKED'} */ ('Active'));
	facilityEditSaving = $state(false);
	facilityEditErr = $state('');

	pdfCanvasEl = $state(/** @type {HTMLCanvasElement | null} */ (null));
	pdfBusy = $state(false);

	constructor(clubId: string, canManage: boolean) {
		this.clubId = clubId;
		this.canManage = canManage;
	}

	get previewRow() {
		if (!this.previewId) return null;
		return this.rows.find((r) => r.id === this.previewId) ?? null;
	}

	get routingDisplayUri() {
		return this.draftLat != null && this.draftLng != null
			? `http://googleusercontent.com/maps.google.com/maps?daddr=${this.draftLat},${this.draftLng}`
			: '';
	}

	init() {
		$effect(() => {
			if (!this.clubId || !db || !authStore.isAuthenticated) {
				this.rows = [];
				return;
			}
			const col = collection(db, 'clubs', this.clubId, 'facilities');
			const unsub = onSnapshot(
				col,
				(snap) => {
					const list = snap.docs.map((d) => {
						const x = d.data();
						const lat = readFirestoreCoord(x.latitude);
						const lng = readFirestoreCoord(x.longitude);
						const routingUrl = typeof x.routingUrl === 'string' && x.routingUrl ? x.routingUrl : undefined;
						const tacticalCanvasJson = typeof x.tacticalCanvasJson === 'string' && x.tacticalCanvasJson.trim() ? x.tacticalCanvasJson : undefined;
						const mapStoragePath = typeof x.mapStoragePath === 'string' ? x.mapStoragePath : '';
						const mapDownloadUrl = typeof x.mapDownloadUrl === 'string' ? x.mapDownloadUrl : '';
						const status = typeof x.status === 'string' ? x.status : '';
						const lockReason = typeof x.lockReason === 'string' ? x.lockReason : '';
						const lockedAt = x.lockedAt;
						const mapDataRaw = x.mapData;
						const mapData = typeof mapDataRaw === 'string' && mapDataRaw.trim() ? mapDataRaw : undefined;
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
						} as FacilityMapRow;
					});
					list.sort((a, b) => {
						const ta = a.uploadedAt?.toMillis?.() ?? 0;
						const tb = b.uploadedAt?.toMillis?.() ?? 0;
						if (tb !== ta) return tb - ta;
						return a.name.localeCompare(b.name);
					});
					this.rows = list;
				},
				(e) => console.error('[FacilityMapVaultEngine]', e)
			);
			return () => unsub();
		});

		$effect(() => {
			if (!this.clubId) return;
			if (this.rows.length === 0) {
				this.heroFacilityId = '';
				return;
			}
			if (!this.heroFacilityId || !this.rows.some((r) => r.id === this.heroFacilityId)) {
				let preferred = '';
				if (browser) {
					try { preferred = localStorage.getItem(`fm-vault-hero-facility:${this.clubId}`) ?? ''; } catch { preferred = ''; }
				}
				if (preferred && this.rows.some((r) => r.id === preferred)) {
					this.heroFacilityId = preferred;
				} else {
					this.heroFacilityId = this.rows[0].id;
				}
			}
		});

		$effect(() => {
			if (!browser || !this.clubId || !this.heroFacilityId) return;
			try { localStorage.setItem(`fm-vault-hero-facility:${this.clubId}`, this.heroFacilityId); } catch {}
		});

		$effect(() => {
			if (!this.clubId || !this.heroFacilityId) {
				this.lastHeroHydrateKey = '';
				this.lastAppliedHydrateSig = '';
				return;
			}
			const row = this.rows.find((r) => r.id === this.heroFacilityId);
			if (!row) return;

			const snapSig = hydrateSig(row);

			if (this.heroSaving || this.logisticsSaving || (this.facilityEditSaving && this.facilityEditId && this.facilityEditId === this.heroFacilityId)) {
				return;
			}
			if (this.logisticsPostSaveHydrateQuietUntil > Date.now() && this.logisticsQuietFacilityId && row.id === this.logisticsQuietFacilityId) {
				return;
			}

			const key = `${this.clubId}:${this.heroFacilityId}`;
			if (key === this.lastHeroHydrateKey && snapSig === this.lastAppliedHydrateSig) return;

			this.applyHeroFromRow(row);
		});
	}

	applyHeroFromRow(row: FacilityMapRow) {
		if (!db || !authStore.isAuthenticated) return;
		this.heroFacilityId = row.id;
		this.heroLat = typeof row.latitude === 'number' ? row.latitude : null;
		this.heroLng = typeof row.longitude === 'number' ? row.longitude : null;
		this.heroMapData = parseFacilityMapData(row.mapData);
		if (this.clubId) this.lastHeroHydrateKey = `${this.clubId}:${row.id}`;
		this.lastAppliedHydrateSig = hydrateSig(row);
		this.heroCoordRevision += 1;
	}

	closePreview() {
		this.previewOpen = false;
		this.previewId = null;
		this.pdfBusy = false;
		this.logisticsPostSaveHydrateQuietUntil = 0;
		this.logisticsQuietFacilityId = null;
		this.logisticsSaveErr = '';
		this.draftAddress = '';
		this.draftName = '';
		this.draftLat = null;
		this.draftLng = null;
		this.draftStatus = 'Active';
		this.draftMapData = { version: 1, polygons: [], markers: [] };
	}

	openPreview(row: FacilityMapRow) {
		this.closePreview();
		this.previewId = row.id;
		this.draftName = typeof row.name === 'string' ? row.name : '';
		this.draftAddress = typeof row.address === 'string' ? row.address : '';
		this.draftLat = typeof row.latitude === 'number' ? row.latitude : null;
		this.draftLng = typeof row.longitude === 'number' ? row.longitude : null;
		const st = row.status || '';
		this.draftStatus = st === 'LOCKED' ? 'LOCKED' : st === 'Locked' ? 'Locked' : 'Active';
		this.draftMapData = parseFacilityMapData(row.mapData);
		this.previewOpen = true;
	}

	async deleteFacility(row: FacilityMapRow) {
		if (!this.canManage || !this.clubId || !db || !authStore.isAuthenticated) return;
		if (!confirm(`Delete facility "${row.name}"? This will remove its maps, fields, and routing data.`)) return;
		try {
			if (row.mapStoragePath) {
				const r = ref(storage, row.mapStoragePath);
				await deleteObject(r).catch(() => {});
			}
			await deleteDoc(doc(db, 'clubs', this.clubId, 'facilities', row.id));
			if (this.previewId === row.id) this.closePreview();
			if (this.heroFacilityId === row.id) {
				this.heroFacilityId = '';
				this.lastHeroHydrateKey = '';
				this.lastAppliedHydrateSig = '';
			}
			if (this.facilityEditId === row.id) {
				this.facilityEditOpen = false;
				this.facilityEditId = null;
			}
		} catch (e) {
			console.error(e);
			alert('Failed to delete facility.');
		}
	}

	async mirrorFacilityToFields(facilityId: string, name: string, address: string, status: string) {
		if (!this.clubId) return;
		await syncFacilityToLegacyField({ clubId: this.clubId, fieldId: facilityId, name, location: address, status });
	}

	async saveRegistryFacility() {
		this.regErr = '';
		if (!this.canManage || !this.clubId || !db || !authStore.isAuthenticated) return;
		const n = this.regName.trim().slice(0, 200);
		if (!n) { this.regErr = 'Facility name is required.'; return; }
		const lat = Number(this.regLat.trim());
		const lng = Number(this.regLng.trim());
		const hasCoords = this.regLat.trim() && this.regLng.trim() && Number.isFinite(lat) && Number.isFinite(lng);
		const routingUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : undefined;
		this.regSaving = true;
		try {
			const id = String(Date.now());
			const st = this.regStatus === 'Locked' ? 'Locked' : 'Active';
			const payload: Record<string, unknown> = {
				name: n,
				address: this.regAddress.trim().slice(0, 500),
				status: st,
				uploadedAt: serverTimestamp(),
			};
			if (hasCoords) { payload.latitude = lat; payload.longitude = lng; payload.routingUrl = routingUrl; }
			await setDoc(doc(db, 'clubs', this.clubId, 'facilities', id), payload);
			await this.mirrorFacilityToFields(id, n, this.regAddress.trim(), st);
			this.regName = '';
			this.regAddress = '';
			this.regLat = '';
			this.regLng = '';
			this.regStatus = 'Active';
			if (!this.heroFacilityId) this.heroFacilityId = id;
		} catch (e) {
			this.regErr = String(e);
		} finally {
			this.regSaving = false;
		}
	}

	async saveHeroFacility() {
		this.heroSaveErr = '';
		if (!this.canManage || !this.clubId || !this.heroFacilityId || !db || !authStore.isAuthenticated) return;
		this.heroSaving = true;
		try {
			const mdJson = JSON.stringify(this.heroMapData || { version: 1, polygons: [], markers: [] });
			const patch: Record<string, unknown> = { mapData: mdJson };
			if (this.heroLat != null && this.heroLng != null && Number.isFinite(this.heroLat) && Number.isFinite(this.heroLng)) {
				patch.latitude = this.heroLat;
				patch.longitude = this.heroLng;
				patch.routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${this.heroLat},${this.heroLng}`;
			}
			await updateDoc(doc(db, 'clubs', this.clubId, 'facilities', this.heroFacilityId), patch);
			this.lastAppliedHydrateSig = '';
			this.heroCoordRevision += 1;
		} catch (e) {
			this.heroSaveErr = String(e);
		} finally {
			this.heroSaving = false;
		}
	}

	async saveLogistics() {
		this.logisticsSaveErr = '';
		if (!this.canManage || !this.clubId || !this.previewId || !db || !authStore.isAuthenticated) return;
		this.logisticsSaving = true;
		this.logisticsPostSaveHydrateQuietUntil = Date.now() + 5000;
		this.logisticsQuietFacilityId = this.previewId;
		try {
			const st = this.draftStatus;
			const statusOut = st === 'LOCKED' ? 'LOCKED' : st === 'Locked' ? 'Locked' : 'Active';
			const nameTrim = this.draftName.trim().slice(0, 200) || this.previewId;
			const mdJson = JSON.stringify(this.draftMapData || { version: 1, polygons: [], markers: [] });
			const patch: Record<string, unknown> = {
				name: nameTrim,
				address: this.draftAddress.trim().slice(0, 500),
				status: statusOut,
				mapData: mdJson,
			};
			if (statusOut === 'Active') { patch.lockReason = deleteField(); patch.lockedAt = deleteField(); }
			if (this.draftLat != null && this.draftLng != null && Number.isFinite(this.draftLat) && Number.isFinite(this.draftLng)) {
				patch.latitude = this.draftLat;
				patch.longitude = this.draftLng;
				patch.routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${this.draftLat},${this.draftLng}`;
			}
			await updateDoc(doc(db, 'clubs', this.clubId, 'facilities', this.previewId), patch);
			await this.mirrorFacilityToFields(this.previewId, nameTrim, this.draftAddress.trim(), statusOut);
			if (this.heroFacilityId === this.previewId) {
				this.heroLat = this.draftLat;
				this.heroLng = this.draftLng;
				this.heroMapData = parseFacilityMapData(mdJson);
				this.heroCoordRevision += 1;
			}
		} catch (e) {
			this.logisticsSaveErr = String(e);
			this.logisticsQuietFacilityId = null;
			this.logisticsPostSaveHydrateQuietUntil = 0;
		} finally {
			this.logisticsSaving = false;
		}
	}

	openFacilityEditModal(row: FacilityMapRow) {
		this.facilityEditErr = '';
		this.facilityEditId = row.id;
		this.facilityEditName = typeof row.name === 'string' ? row.name : '';
		this.facilityEditAddress = typeof row.address === 'string' ? row.address : '';
		this.facilityEditLatStr = typeof row.latitude === 'number' && Number.isFinite(row.latitude) ? String(row.latitude) : '';
		this.facilityEditLngStr = typeof row.longitude === 'number' && Number.isFinite(row.longitude) ? String(row.longitude) : '';
		const st = row.status || '';
		this.facilityEditStatus = st === 'LOCKED' ? 'LOCKED' : st === 'Locked' ? 'Locked' : 'Active';
		this.facilityEditOpen = true;
	}

	async saveFacilityEditModal() {
		this.facilityEditErr = '';
		if (!this.canManage || !this.clubId || !this.facilityEditId || !db || !authStore.isAuthenticated) return;
		const nameTrim = this.facilityEditName.trim().slice(0, 200);
		if (!nameTrim) { this.facilityEditErr = 'Facility name is required.'; return; }
		const lat = Number(this.facilityEditLatStr.trim());
		const lng = Number(this.facilityEditLngStr.trim());
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) { this.facilityEditErr = 'Enter valid latitude and longitude.'; return; }
		const routingUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
		this.facilityEditSaving = true;
		try {
			const st = this.facilityEditStatus;
			const statusOut = st === 'LOCKED' ? 'LOCKED' : st === 'Locked' ? 'Locked' : 'Active';
			const patch: Record<string, unknown> = {
				name: nameTrim,
				address: this.facilityEditAddress.trim().slice(0, 500),
				latitude: lat,
				longitude: lng,
				routingUrl,
				status: statusOut,
			};
			if (statusOut === 'Active') { patch.lockReason = deleteField(); patch.lockedAt = deleteField(); }
			await updateDoc(doc(db, 'clubs', this.clubId, 'facilities', this.facilityEditId), patch);
			await this.mirrorFacilityToFields(this.facilityEditId, nameTrim, this.facilityEditAddress.trim(), statusOut);
			if (this.heroFacilityId === this.facilityEditId) {
				this.heroLat = lat;
				this.heroLng = lng;
				this.heroCoordRevision += 1;
			}
			this.facilityEditOpen = false;
			this.facilityEditId = null;
		} catch (e) {
			this.facilityEditErr = String(e);
		} finally {
			this.facilityEditSaving = false;
		}
	}
}
