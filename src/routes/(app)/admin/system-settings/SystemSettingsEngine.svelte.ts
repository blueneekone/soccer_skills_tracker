import { db } from '$lib/firebase.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { authStore } from '$lib/stores/auth.svelte.js';
import { teamsStore } from '$lib/stores/teams.svelte.js';
import { featureFlagsStore } from '$lib/stores/featureFlags.svelte.js';
import { logSecurityEvent } from '$lib/utils/security.js';

export class SystemSettingsEngine {
	activeTab = $state<'access' | 'flags' | 'integrations'>('access');

	// Tab 1
	adminErr = $state('');
	adminOk = $state('');

	// Tab 2
	flagSaving = $state('');
	flagErr = $state('');
	flagOk = $state('');
	maintenanceMessageDraft = $state('');

	flagLabels = {
		maintenanceMode: 'Maintenance Mode (Global Kill Switch)',
		enableRagAiCoaching: 'Enable RAG AI Coaching',
		enableVideoProcessing: 'Enable Video Processing',
		enableRecruiterMarketplace: 'Enable Recruiter Marketplace',
		enableLiveScoring: 'Enable Live Scoring'
	};

	flagDescriptions = {
		maintenanceMode:
			'When enabled, every non-super-admin session is blocked and replaced with a full-screen maintenance UI. Use for incident response or disruptive migrations.',
		enableRagAiCoaching:
			'Tactical & skills coaching surfaces that call the Gemini API. Disabling freezes AI responses platform-wide.',
		enableVideoProcessing:
			'Cloud-function-backed trial video verification. Disabling halts new uploads; existing clips remain viewable.',
		enableRecruiterMarketplace:
			'Public/private recruiter search over verified athlete profiles. Disabling hides the Recruiter OS from scouts.',
		enableLiveScoring:
			'Match-day scoring, roster attendance, and real-time broadcast channels.'
	};

	// Tab 3
	webhookRows = $state<any[]>([]);
	webhookLoading = $state(false);

	// Global Platform Security
	secMfaEnabled = $state(false);
	secPiiTtl = $state('24h');
	secSessionTimeout = $state('4h');
	secSaving = $state(false);
	secErr = $state('');
	secOk = $state('');

	loadSecurityConfig = async () => {
		try {
			const snap = await getDoc(doc(db, 'config', 'platform_security'));
			if (snap.exists()) {
				const d = snap.data();
				this.secMfaEnabled = d?.mfaEnabled === true;
				this.secPiiTtl = typeof d?.piiTtl === 'string' ? d.piiTtl : '24h';
				this.secSessionTimeout = typeof d?.sessionTimeout === 'string' ? d.sessionTimeout : '4h';
			}
		} catch (e) {
			console.warn('[system-settings] security config unavailable', e);
		}
	}

	saveSecurityConfig = async () => {
		this.secErr = '';
		this.secOk = '';
		this.secSaving = true;
		try {
			await setDoc(
				doc(db, 'config', 'platform_security'),
				{
					mfaEnabled: this.secMfaEnabled,
					piiTtl: this.secPiiTtl,
					sessionTimeout: this.secSessionTimeout,
					updatedAt: serverTimestamp(),
					updatedBy: authStore.user?.email || 'super_admin',
				},
				{ merge: true }
			);
			await logSecurityEvent(
				'SECURITY_CONFIG_UPDATE',
				'platform_security',
				`MFA=${this.secMfaEnabled}, TTL=${this.secPiiTtl}, timeout=${this.secSessionTimeout}`
			);
			this.secOk = 'Platform security configuration saved.';
		} catch (e) {
			this.secErr = e instanceof Error ? e.message : 'Could not save security configuration.';
		} finally {
			this.secSaving = false;
		}
	}

	removeAdmin = async (email: string) => {
		if (!confirm(`Revoke super admin access for ${email}?`)) return;
		this.adminErr = '';
		this.adminOk = '';
		try {
			const newList = teamsStore.admins.filter((e) => e !== email);
			await setDoc(doc(db, 'config', 'admins'), { list: newList });
			await logSecurityEvent('REVOKE_GLOBAL_ADMIN', email, 'Removed from global config');
			this.adminOk = `${email} removed from Global Admins.`;
			await teamsStore.load('super_admin', {
				scope: 'admin_full',
				routePath: '/admin/system-settings'
			});
		} catch (e) {
			this.adminErr = e instanceof Error ? e.message : 'Could not revoke access.';
		}
	}

	toggleFlag = async (key: keyof typeof this.flagLabels, nextValue: boolean) => {
		this.flagErr = '';
		this.flagOk = '';
		this.flagSaving = key;
		try {
			if (key === 'maintenanceMode' && nextValue === true) {
				const ok = confirm(
					'Enable Maintenance Mode?\n\nEvery non-super-admin session will be locked out of the platform until you disable this flag.'
				);
				if (!ok) {
					this.flagSaving = '';
					return;
				}
			}

			const payload = {
				[key]: nextValue,
				updatedAt: serverTimestamp(),
				updatedBy: authStore.user?.email || 'super_admin'
			};

			await setDoc(doc(db, 'config', 'feature_flags'), payload, { merge: true });
			await logSecurityEvent('FEATURE_FLAG_UPDATE', key, `${key}=${String(nextValue)}`);
			this.flagOk = `${this.flagLabels[key]} is now ${nextValue ? 'ON' : 'OFF'}.`;
		} catch (e) {
			this.flagErr = e instanceof Error ? e.message : 'Could not update feature flag.';
		} finally {
			this.flagSaving = '';
		}
	}

	saveMaintenanceMessage = async () => {
		this.flagErr = '';
		this.flagOk = '';
		this.flagSaving = 'maintenanceMessage';
		try {
			await setDoc(
				doc(db, 'config', 'feature_flags'),
				{
					maintenanceMessage: this.maintenanceMessageDraft.slice(0, 500),
					updatedAt: serverTimestamp(),
					updatedBy: authStore.user?.email || 'super_admin'
				},
				{ merge: true }
			);
			await logSecurityEvent(
				'FEATURE_FLAG_UPDATE',
				'maintenanceMessage',
				this.maintenanceMessageDraft.slice(0, 200)
			);
			this.flagOk = 'Maintenance message saved.';
		} catch (e) {
			this.flagErr = e instanceof Error ? e.message : 'Could not save maintenance message.';
		} finally {
			this.flagSaving = '';
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (!featureFlagsStore.loaded) return;
				this.maintenanceMessageDraft = featureFlagsStore.maintenanceMessage;
			});

			$effect(() => {
				if (authStore.isLoading || !authStore.isAuthenticated) return;
				void this.loadSecurityConfig();
			});

			$effect(() => {
				if (authStore.isLoading || !authStore.isAuthenticated) return;
				if (this.activeTab !== 'integrations') return;

				let cancelled = false;
				this.webhookLoading = true;

				(async () => {
					try {
						const snap = await getDoc(doc(db, 'config', 'webhook_status'));
						if (cancelled) return;
						if (snap.exists()) {
							const raw = snap.data();
							const rows = Array.isArray(raw?.rows)
								? raw.rows.map((r, i) => ({
										id: typeof r?.id === 'string' ? r.id : `row-${i}`,
										integration: typeof r?.integration === 'string' ? r.integration : 'unknown',
										status: r?.status === 'ok' || r?.status === 'warn' || r?.status === 'fail' ? r.status : 'warn',
										timestamp: Number(r?.timestamp) || 0,
										summary: typeof r?.summary === 'string' ? r.summary : ''
								  }))
								: [];
							this.webhookRows = rows;
						} else {
							this.webhookRows = [];
						}
					} catch (e) {
						console.warn('[system-settings] webhook status unavailable', e);
						this.webhookRows = [];
					} finally {
						if (!cancelled) this.webhookLoading = false;
					}
				})();

				return () => {
					cancelled = true;
				};
			});

			return () => {};
		});
	}
}
