/**
 * Global alerts/notifications drawer store.
 * Consumed by EnterpriseConsoleShell (bell button) and AlertsDrawer.
 */
function createAlertsDrawer() {
	let open = $state(false);

	/** Count of unread alerts. Drives the badge on the bell icon. */
	let unreadCount = $state(0);

	return {
		get open() {
			return open;
		},
		get unreadCount() {
			return unreadCount;
		},
		toggle() {
			open = !open;
		},
		show() {
			open = true;
		},
		hide() {
			open = false;
		},
		/** Called by AlertsDrawer when the Firestore snapshot resolves. */
		setUnread(n) {
			unreadCount = Math.max(0, Math.floor(n));
		},
	};
}

export const alertsDrawer = createAlertsDrawer();
