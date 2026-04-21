<script>
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase.js';
	import {
		signInWithPopup,
		GoogleAuthProvider,
		signInWithEmailAndPassword,
		createUserWithEmailAndPassword,
		getRedirectResult
	} from 'firebase/auth';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let email = $state('');
	let password = $state('');
	let errorMsg = $state('');
	let showPwaPrompt = $state(false);

	// Redirect if already authed and profile complete
	$effect(() => {
		if (!authStore.isLoading && authStore.isAuthenticated) {
			if (authStore.isProfileComplete) {
				goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
			} else {
				goto('/setup', { replaceState: true });
			}
		}
	});

	onMount(() => {
		// Check for mobile redirect result (fallback only)
		getRedirectResult(auth).catch(() => {});

		// Detect standalone PWA context — iOS Safari blocks popups in standalone
		const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
		const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
		showPwaPrompt = isIos && !isInStandaloneMode && !navigator.userAgent.includes('Chrome');
	});

	const showError = (msg) => { errorMsg = msg; };

	const handleGoogleLogin = async () => {
		errorMsg = '';
		try {
			await signInWithPopup(auth, new GoogleAuthProvider());
		} catch (err) {
			showError('Google Login Failed: ' + err.message);
		}
	};

	const handleEmailLogin = async () => {
		errorMsg = '';
		if (!email || !password) return showError('Please enter both an email and password.');
		try {
			await signInWithEmailAndPassword(auth, email, password);
		} catch (err) {
			showError(err.message);
		}
	};

	const handleEmailSignup = async () => {
		errorMsg = '';
		if (!email || !password) return showError('Please enter an email and a password to sign up.');
		try {
			await createUserWithEmailAndPassword(auth, email, password);
		} catch (err) {
			showError(err.message);
		}
	};

	const dismissPwa = () => { showPwaPrompt = false; };
</script>

<div class="full-screen-center">
	<div class="auth-card">
		<div class="logo-circle">⚽</div>
		<h2 class="auth-title">SSTRACKER</h2>
		<p class="auth-subtitle">Skills &amp; Workout Tracker</p>

		<button class="primary-btn btn-google w-100" onclick={handleGoogleLogin}>
			<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="Google" />
			Continue with Google
		</button>

		<div class="auth-divider">
			<hr class="divider-line" />
			<span class="divider-text">OR</span>
			<hr class="divider-line" />
		</div>

		<input type="email" placeholder="Email Address" bind:value={email} />
		<input type="password" placeholder="Password" bind:value={password} />

		{#if errorMsg}
			<div class="auth-error-msg" role="alert">{errorMsg}</div>
		{/if}

		<button class="primary-btn btn-mb-10 w-100" onclick={handleEmailLogin}>Sign In</button>
		<button class="secondary-btn w-100" onclick={handleEmailSignup}>Create Account</button>
	</div>

	{#if showPwaPrompt}
		<div class="pwa-prompt">
			<h3 class="pwa-title">📲 Install the App!</h3>
			<p class="pwa-text">To login and save your stats securely, install the app to your device.</p>
			<div class="pwa-box">
				<b>iOS / iPhone:</b> Tap the <b>Share</b> icon below, then tap <b>Add to Home Screen</b>.<br /><br />
				<b>Android:</b> Tap the 3 dots menu and select <b>Install App</b>.
			</div>
			<button class="secondary-btn w-100" onclick={dismissPwa}>Continue in Browser (Not Recommended)</button>
		</div>
	{/if}
</div>

<style>
	.btn-mb-10 {
		margin-bottom: 10px;
	}
	input {
		margin-bottom: 12px;
	}
</style>
