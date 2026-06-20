/** Bottom-edge swipe detector for field-mode AppMenuSheet (Option D polish). */

export const FIELD_MENU_SWIPE_THRESHOLD_PX = 44;
export const FIELD_MENU_EDGE_ZONE_PX = 80;

export function createFieldMenuSwipeHandlers(onSwipeUp: () => void) {
	let touchStartY = 0;
	let touchStartX = 0;
	let touchStartInEdge = false;

	function onTouchStart(e: TouchEvent) {
		const t = e.touches[0];
		if (!t || typeof window === 'undefined') return;
		touchStartInEdge = t.clientY >= window.innerHeight - FIELD_MENU_EDGE_ZONE_PX;
		if (!touchStartInEdge) return;
		touchStartY = t.clientY;
		touchStartX = t.clientX;
	}

	function onTouchEnd(e: TouchEvent) {
		if (!touchStartInEdge) return;
		const t = e.changedTouches[0];
		if (!t) return;
		const dy = touchStartY - t.clientY;
		const dx = Math.abs(t.clientX - touchStartX);
		if (dy >= FIELD_MENU_SWIPE_THRESHOLD_PX && dy > dx) onSwipeUp();
		touchStartInEdge = false;
	}

	return { onTouchStart, onTouchEnd };
}
