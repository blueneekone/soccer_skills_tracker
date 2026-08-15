<script lang="ts">
    import { untrack } from 'svelte';
    import { db } from '$lib/firebase/config';
    import { authStore } from '$lib/stores/auth.svelte.js';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    import { httpsCallable } from 'firebase/functions';
    import { functions } from '$lib/firebase/config';

    // Svelte 5 Reactive States
    let tutors = $state<any[]>([]);
    let isLoading = $state(true);
    let searchSkill = $state("");

    async function handleBookSession(tutor: any) {
        if (!functions) return;
        try {
            const bookTutoringSession = httpsCallable(functions, 'bookTutoringSession');
            const res = await bookTutoringSession({ tutorEmail: tutor.email, hours: 1 });
            // In a real app we'd redirect to Stripe, but for this blueprint we just alert or log
            console.log('Booking successful, clientSecret:', (res.data as any).clientSecret);
            alert('Session booking initiated successfully!');
        } catch (err: any) {
            console.error('Failed to book session:', err);
            alert(`Failed to book session: ${err.message}`);
        }
    }

    // B815 Hydration-Guarded Query Block
    $effect(() => {
        // Hydration Guard: Kill execution if auth state or DB isn't mounted yet
        if (!db || !authStore.isAuthenticated) return;

        // Perform safe fetch
        async function fetchSportTutors() {
            try {
                // Ensure sport containment matching the logged-in user's profile
                const userSport = authStore.userProfile.sport;
                const tutorsRef = collection(db, 'users');
                const q = query(
                    tutorsRef,
                    where('role', '==', 'tutor'),
                    where('sport', '==', userSport),
                    where('tutorProfile.isListingActive', '==', true)
                );

                const snapshot = await getDocs(q);
                tutors = snapshot.docs.map(doc => doc.data());
            } catch (err) {
                console.error("Directory query blocked:", err);
            } finally {
                isLoading = false;
            }
        }

        fetchSportTutors();
    });

    // Svelte 5 Derived Filter for Skills Search
    let filteredTutors = $derived(
        tutors.filter(t =>
            searchSkill === "" ||
            (t.tutorProfile?.skills && t.tutorProfile.skills.some((s: string) => s.toLowerCase().includes(searchSkill.toLowerCase())))
        )
    );
</script>

<!-- 12-Column Bento Directory Layout -->
<div class="grid grid-cols-12 gap-6 p-6">
    <!-- Search Banner (Span 12) -->
    <div class="col-span-12 bg-gray-900 border border-teal-500/20 p-6 rounded-xl flex items-center justify-between">
        <h1 class="text-2xl font-bold text-white">Sport Tutoring Marketplace</h1>
        <input
            type="text"
            bind:value={searchSkill}
            placeholder="Search by skill (e.g. Shooting, Agility)..."
            class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 w-1/3"
        />
    </div>

    <!-- Tutor Card Loop -->
    {#if isLoading}
        <div class="col-span-12 text-center text-gray-500 py-12">Loading Marketplace Listings...</div>
    {:else}
        {#each filteredTutors as tutor}
            <!-- Individual Bento Card (Span 4 on large screens, Span 12 on mobile) -->
            <div class="col-span-12 md:col-span-4 bg-gray-900 border border-gray-800 hover:border-teal-500/50 transition p-6 rounded-xl flex flex-col justify-between h-64">
                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="text-lg font-bold text-white">{tutor.displayName}</h3>
                        <!-- Nuclear Lime styling for active rates -->
                        <span class="text-[#daff0a] font-mono font-bold text-lg">${tutor.tutorProfile.ratePerHour}/hr</span>
                    </div>
                    <!-- Data Cyan typography tokens for sports tag -->
                    <span class="text-[#14b8a6] text-xs font-semibold uppercase tracking-wider block mt-1">{tutor.sport} Specialist</span>

                    <!-- Skills Badge Container -->
                    <div class="flex flex-wrap gap-2 mt-4">
                        {#each tutor.tutorProfile.skills as skill}
                            <span class="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-md">{skill}</span>
                        {/each}
                    </div>
                </div>

                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                    <!-- Amber caution/warning token if background check is pending -->
                    {#if tutor.tutorProfile.backgroundCheckStatus !== 'clear'}
                        <span class="text-[#fbbf24] text-xs flex items-center gap-1 font-semibold">
                            ⚠ Background Check Pending
                        </span>
                    {:else}
                        <span class="text-teal-400 text-xs flex items-center gap-1 font-semibold">
                            ✔ Background Clear
                        </span>
                    {/if}
                    <button class="bg-[#14b8a6] hover:bg-[#0d9488] text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition" onclick={() => handleBookSession(tutor)}>
                        Book Session
                    </button>
                </div>
            </div>
        {/each}
    {/if}
</div>