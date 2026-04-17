/**
 * Universal date normalizer for Firestore Timestamps, ISO strings, and epoch objects.
 * Always call this before rendering or comparing dates from Firestore documents.
 * @param {any} l - A log/doc object or raw timestamp value
 * @returns {Date}
 */
export const safeGetDate = (l) => {
	if (!l) return new Date();
	if (l instanceof Date) return l;
	// Firestore Timestamp object with toDate()
	if (l.toDate && typeof l.toDate === 'function') return l.toDate();
	// Firestore Timestamp-shaped object {seconds, nanoseconds}
	if (l.seconds !== undefined) return new Date(l.seconds * 1000);
	// Log object with .timestamp field
	if (l.timestamp) {
		if (l.timestamp.toDate) return l.timestamp.toDate();
		if (l.timestamp.seconds) return new Date(l.timestamp.seconds * 1000);
		if (typeof l.timestamp === 'string') {
			const p = new Date(l.timestamp);
			if (!isNaN(p.getTime())) return p;
		}
	}
	// Log object with .date field
	if (l.date) {
		const p = new Date(l.date);
		if (!isNaN(p.getTime())) return p;
	}
	// Log object with .createdAt field
	if (l.createdAt) {
		if (l.createdAt.seconds) return new Date(l.createdAt.seconds * 1000);
		if (l.createdAt.toDate) return l.createdAt.toDate();
	}
	// Raw numeric epoch
	if (typeof l === 'number') return new Date(l);
	return new Date();
};

/**
 * Format a date for display.
 * @param {any} dateOrLog
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export const formatDate = (dateOrLog, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => {
	return safeGetDate(dateOrLog).toLocaleDateString('en-US', opts);
};
