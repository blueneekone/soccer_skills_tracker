import { getFunctions, httpsCallable } from 'firebase/functions';

export interface RebateRow {
	idempotencyKey: string;
	tenantId: string;
	hotelPartnerId: string;
	partnerCommissionCents: number;
	periodStart?: string;
	periodEnd?: string;
	roomNights?: number;
	linkedEventId?: string;
	_computedNgbCreditCents?: number;
	_error?: string;
}

export type UploadPhase = 'idle' | 'parsing' | 'previewing' | 'submitting' | 'done';

export class RebatesEngine {
	phase = $state<UploadPhase>('idle');
	rows = $state<RebateRow[]>([]);
	results = $state<{ idempotencyKey: string; ok: boolean; msg: string }[]>([]);
	globalError = $state('');
	dragOver = $state(false);

	readonly REBATE_RATE_PCT = 70; // 70% goes to NGB (preview only)

	get validRows() {
		return this.rows.filter((r) => !r._error);
	}

	get errorRows() {
		return this.rows.filter((r) => !!r._error);
	}

	async handleFile(file: File) {
		if (!file.name.endsWith('.csv')) {
			this.globalError = 'Please upload a .csv file.';
			return;
		}
		this.phase = 'parsing';
		this.globalError = '';
		
		try {
			const Papa = (await import('papaparse')).default;
			Papa.parse<Record<string, string>>(file, {
				header: true,
				skipEmptyLines: true,
				complete: (result) => {
					const parsed = result.data.map((raw) => {
						const idempotencyKey = (raw.idempotencyKey || raw.settlement_ref || '').trim();
						const tenantId = (raw.tenantId || raw.ngb_id || '').trim();
						const hotelPartnerId = (raw.hotelPartnerId || raw.partner_id || '').trim();
						const cents = Math.round(parseFloat(raw.partnerCommissionCents || raw.commission_cents || '0'));

						const row: RebateRow = {
							idempotencyKey,
							tenantId,
							hotelPartnerId,
							partnerCommissionCents: cents,
							periodStart: (raw.periodStart || raw.period_start || '').trim() || undefined,
							periodEnd: (raw.periodEnd || raw.period_end || '').trim() || undefined,
							roomNights: raw.roomNights ? parseInt(raw.roomNights, 10) : undefined,
							linkedEventId: (raw.linkedEventId || raw.event_id || '').trim() || undefined,
						};

						// Client-side preview estimate
						row._computedNgbCreditCents = Math.round(cents * (this.REBATE_RATE_PCT / 100));

						// Validation
						const errors: string[] = [];
						if (!idempotencyKey) errors.push('idempotencyKey missing');
						if (!tenantId) errors.push('tenantId missing');
						if (!hotelPartnerId) errors.push('hotelPartnerId missing');
						if (!Number.isInteger(cents) || cents <= 0) errors.push('invalid partnerCommissionCents');
						if (errors.length) row._error = errors.join('; ');

						return row;
					});

					// Detect duplicate idempotencyKeys within the file
					const seen = new Set<string>();
					for (const r of parsed) {
						if (!r._error && r.idempotencyKey) {
							if (seen.has(r.idempotencyKey)) {
								r._error = `Duplicate idempotencyKey in file: "${r.idempotencyKey}"`;
							} else {
								seen.add(r.idempotencyKey);
							}
						}
					}

					this.rows = parsed;
					this.phase = 'previewing';
				},
				error: (err) => {
					this.globalError = `CSV parse error: ${err.message}`;
					this.phase = 'idle';
				},
			});
		} catch (e) {
			this.globalError = e instanceof Error ? e.message : 'Unknown parsing error';
			this.phase = 'idle';
		}
	}

	onDrop(e: DragEvent) {
		e.preventDefault();
		this.dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) {
			void this.handleFile(file);
		}
	}

	onFileInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			void this.handleFile(file);
		}
	}

	reset() {
		this.rows = [];
		this.results = [];
		this.phase = 'idle';
		this.globalError = '';
	}

	async submit() {
		const valid = this.validRows;
		if (valid.length === 0) return;
		
		this.phase = 'submitting';
		this.results = [];
		
		const fns = getFunctions(undefined, 'us-east1');
		const submitRecord = httpsCallable<Record<string, unknown>, Record<string, unknown>>(
			fns,
			'submitHotelRebateRecord',
		);

		for (const row of valid) {
			try {
				await submitRecord({
					tenantId: row.tenantId,
					hotelPartnerId: row.hotelPartnerId,
					partnerCommissionCents: row.partnerCommissionCents,
					idempotencyKey: row.idempotencyKey,
					periodStart: row.periodStart,
					periodEnd: row.periodEnd,
					roomNights: row.roomNights,
					linkedEventId: row.linkedEventId,
				});
				this.results.push({ idempotencyKey: row.idempotencyKey, ok: true, msg: 'Recorded' });
			} catch (e: unknown) {
				this.results.push({
					idempotencyKey: row.idempotencyKey,
					ok: false,
					msg: e instanceof Error ? e.message : String(e),
				});
			}
		}
		
		this.phase = 'done';
	}
}
