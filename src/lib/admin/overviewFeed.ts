import type { IconName } from '$lib/icons/registry.js';

export function relativeTime(d: Date | null): string {
	if (!(d instanceof Date)) return '—';
	const diff = Date.now() - d.getTime();
	if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
	if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
	if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
	return `${Math.round(diff / 86_400_000)}d ago`;
}

export function actionTone(action: unknown): 'danger' | 'success' | 'warn' | 'info' {
	const a = String(action || '').toUpperCase();
	if (a.includes('REVOKE') || a.includes('REJECT') || a.includes('DELETE') || a.includes('FAILED')) {
		return 'danger';
	}
	if (a.includes('GRANT') || a.includes('APPROVE') || a.includes('VERIFY') || a.includes('CREATE')) {
		return 'success';
	}
	if (a.includes('BG_CHECK') || a.includes('IMPERSONAT')) return 'warn';
	return 'info';
}

export function actionIcon(action: string): IconName {
	const t = actionTone(action);
	if (t === 'danger') return 'status.warning-circle' as IconName;
	if (t === 'success') return 'status.verified' as IconName;
	if (t === 'warn') return 'status.warning' as IconName;
	return 'status.info' as IconName;
}

export function prettyAction(action: unknown): string {
	return String(action || '')
		.replace(/_/g, ' ')
		.toLowerCase()
		.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
