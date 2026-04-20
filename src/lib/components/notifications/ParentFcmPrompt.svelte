<script>
	import { browser } from '$app/environment';
	import Swal from 'sweetalert2';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		registerFcmTokenWithBackend,
		requestNotificationPermission
	} from '$lib/fcm/client.js';

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		if (authStore.role !== 'parent') return;
		if (typeof sessionStorage === 'undefined') return;
		if (sessionStorage.getItem('sst_fcm_parent_prompt')) return;

		const id = window.setTimeout(async () => {
			if (sessionStorage.getItem('sst_fcm_parent_prompt')) return;
			if (typeof Notification === 'undefined') return;

			if (Notification.permission === 'granted') {
				sessionStorage.setItem('sst_fcm_parent_prompt', '1');
				await registerFcmTokenWithBackend();
				return;
			}

			if (Notification.permission === 'denied') {
				sessionStorage.setItem('sst_fcm_parent_prompt', '1');
				return;
			}

			const r = await Swal.fire({
				title: 'Real-time player updates',
				text: 'Enable notifications to track your player\'s progress in real-time.',
				icon: 'info',
				showCancelButton: true,
				confirmButtonText: 'Enable notifications',
				cancelButtonText: 'Not now',
				confirmButtonColor: '#0f172a',
				customClass: { popup: 'card' }
			});

			sessionStorage.setItem('sst_fcm_parent_prompt', '1');

			if (!r.isConfirmed) return;

			const perm = await requestNotificationPermission();
			if (perm !== 'granted') return;

			const res = await registerFcmTokenWithBackend();
			if (!res.ok && res.reason === 'no-vapid') {
				await Swal.fire({
					title: 'Notifications unavailable',
					text: 'Push is not configured for this build (missing VAPID key).',
					icon: 'warning',
					confirmButtonColor: '#0f172a'
				});
			}
		}, 2800);

		return () => window.clearTimeout(id);
	});
</script>
