<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    let timerInterval: ReturnType<typeof setInterval>;
    let timeLeft = 3600; // 60 minutes in seconds

    let displayTime = '';

    function updateDisplay() {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        displayTime = `${m}:${s}`;
    }

    onMount(() => {
        updateDisplay();
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                clearInterval(timerInterval);
            }
        }, 1000);
    });

    onDestroy(() => {
        if (timerInterval) clearInterval(timerInterval);
    });
</script>

<div class="tw-min-h-[100dvh] tw-bg-amber-100 tw-text-amber-900 tw-flex tw-items-center tw-justify-center tw-rounded-none">
    <div class="tw-p-12 tw-border-4 tw-border-amber-900 tw-rounded-none tw-bg-amber-50 tw-max-w-xl tw-w-full">
        <h1 class="tw-text-4xl tw-font-bold tw-mb-4 tw-uppercase tw-tracking-widest">System Maintenance</h1>

        <div class="tw-h-1 tw-w-full tw-bg-amber-900 tw-mb-8"></div>

        <p class="tw-text-lg tw-mb-8 tw-font-mono">
            SSTracker is currently undergoing scheduled platform maintenance. The Z4 Command Plane and all downstream services are temporarily offline.
        </p>

        <div class="tw-bg-amber-200 tw-p-6 tw-border-2 tw-border-amber-900 tw-rounded-none tw-flex tw-flex-col tw-items-center tw-justify-center">
            <span class="tw-text-sm tw-uppercase tw-font-bold tw-mb-2">Estimated Time Remaining</span>
            <span class="tw-text-6xl tw-font-mono tw-font-bold tw-tabular-nums tracking-tighter">{displayTime}</span>
        </div>

        <div class="tw-mt-8 tw-text-sm tw-font-mono tw-opacity-80">
            > Error Code: 307 TEMPORARY_MAINTENANCE<br>
            > Stand by for automatic reconnection...
        </div>
    </div>
</div>
