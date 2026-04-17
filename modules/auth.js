import { auth, db } from '../firebase-config.js';
import {
	signInWithPopup,
	getRedirectResult,
	GoogleAuthProvider,
	signOut,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export const showAuthError = (msg) => {
	const errEl = document.getElementById('authErrorMsg');
	if (errEl) {
		errEl.classList.remove('d-none');
		errEl.innerText = msg;
	} else {
		alert(msg);
	}
};

export const handleGoogleLogin = async () => {
	const provider = new GoogleAuthProvider();
	try {
		await signInWithPopup(auth, provider);
	} catch (error) {
		showAuthError('Google Login Failed: ' + error.message);
	}
};

export const checkMobileRedirect = () => {
	getRedirectResult(auth)
		.then((result) => {
			if (result) console.log('Mobile redirect successful!');
		})
		.catch((e) => {
			showAuthError('Google Login Failed: ' + e.message);
		});
};

export const handleEmailLogin = () => {
	const e = document.getElementById('authEmail')?.value;
	const p = document.getElementById('authPassword')?.value;
	if (!e || !p) return showAuthError('Please enter both an email and password.');
	signInWithEmailAndPassword(auth, e, p).catch((err) => showAuthError(err.message));
};

export const handleEmailSignup = () => {
	const e = document.getElementById('authEmail')?.value;
	const p = document.getElementById('authPassword')?.value;
	if (!e || !p) return showAuthError('Please enter an email and a password to sign up.');
	createUserWithEmailAndPassword(auth, e, p).catch((err) => showAuthError(err.message));
};

export const handleLogout = async () => {
	try {
		await signOut(auth);
		window.location.replace(window.location.pathname);
	} catch (error) {
		alert('Logout Failed: ' + error.message);
	}
};

export const initSetupDropdowns = (clubs, teams) => {
	const clubSelect = document.getElementById('setupClubSelect');
	const teamSelect = document.getElementById('setupTeamSelect');
	const playerSelect = document.getElementById('setupPlayerDropdown');
	const manualEntry = document.getElementById('setupManualEntry');

	if (!clubSelect || !teamSelect || !playerSelect) return;

	clubSelect.innerHTML = '<option value="">Select your club...</option>';
	(clubs || []).forEach((club) => {
		const option = document.createElement('option');
		option.value = club.id;
		option.textContent = club.name || club.id;
		clubSelect.appendChild(option);
	});

	clubSelect.onchange = () => {
		const cid = clubSelect.value;
		teamSelect.innerHTML = '<option value="">Select your team...</option>';
		teamSelect.disabled = !cid;
		playerSelect.innerHTML = '<option value="">Select a team first...</option>';
		playerSelect.disabled = true;
		if (manualEntry) manualEntry.classList.add('d-none');
		if (!cid) return;
		const filteredTeams = (teams || []).filter((t) => t.clubId === cid);
		filteredTeams.forEach((team) => {
			const o = document.createElement('option');
			o.value = team.id;
			o.textContent = team.name || team.id;
			teamSelect.appendChild(o);
		});
	};

	teamSelect.onchange = async () => {
		const tid = teamSelect.value;
		playerSelect.innerHTML = '<option value="">Loading players...</option>';
		playerSelect.disabled = !tid;
		if (manualEntry) manualEntry.classList.add('d-none');
		if (!tid) return;
		try {
			const rosterRef = doc(db, 'rosters', tid);
			const snap = await getDoc(rosterRef);
			playerSelect.innerHTML = '<option value="">Select your name...</option>';
			let players = [];
			if (snap.exists && snap.data().players) {
				players = [...snap.data().players];
			}
			players.sort();
			players.forEach((p) => {
				const o = document.createElement('option');
				o.value = p;
				o.textContent = p;
				playerSelect.appendChild(o);
			});
			const manualOpt = document.createElement('option');
			manualOpt.value = 'manual';
			manualOpt.textContent = "My name isn't listed (manual entry)";
			playerSelect.appendChild(manualOpt);
		} catch (e) {
			console.error(e);
			playerSelect.innerHTML = '<option value="">Error loading roster</option>';
		}
	};

	playerSelect.onchange = () => {
		if (playerSelect.value === 'manual' && manualEntry) {
			manualEntry.classList.remove('d-none');
		} else if (manualEntry) {
			manualEntry.classList.add('d-none');
		}
	};
};

export const completeUserSetup = async () => {
	const clubSelect = document.getElementById('setupClubSelect');
	const teamSelect = document.getElementById('setupTeamSelect');
	const playerSelect = document.getElementById('setupPlayerDropdown');
	const manualEntry = document.getElementById('setupPlayerManual');

	const clubId = clubSelect?.value || null;
	const teamId = teamSelect?.value || null;
	const playerDropVal = playerSelect?.value || null;
	const manualName = manualEntry?.value.trim() || '';

	const finalName = playerDropVal === 'manual' ? manualName : playerDropVal;

	if (!clubId || !teamId || !finalName) {
		return showAuthError('Please select a club, team, and player name.');
	}

	const btn = document.getElementById('completeSetupBtn');
	if (btn) {
		btn.innerText = 'Saving Profile...';
		btn.disabled = true;
	}

	try {
		const userEmail = auth.currentUser.email.toLowerCase();
		const userRef = doc(db, 'users', userEmail);

		const newProfileData = {
			clubId: clubId,
			teamId: teamId,
			playerName: finalName,
			joinedAt: new Date(),
			privacyProfile: 'strict_minor_defaults',
			telemetryOptIn: false,
			biometricOrVideoConsentAt: null,
			consentPolicyVersion: '2026-04'
		};

		await setDoc(userRef, newProfileData, { merge: true });

		window.dispatchEvent(new CustomEvent('profileSetupComplete', { detail: newProfileData }));
	} catch (error) {
		console.error('Setup Error:', error);
		showAuthError('Error saving profile: ' + error.message);
		if (btn) {
			btn.innerText = 'Complete Setup';
			btn.disabled = false;
		}
	}
};
