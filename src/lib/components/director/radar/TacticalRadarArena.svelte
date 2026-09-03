<script>
  import { browser } from '$app/environment';
  import { untrack } from 'svelte';
  import { ensureGoogleMapsLoaded, getGoogleMapsApiKey, getGoogleMapsMapId } from '$lib/maps/ensureGoogleMaps.js';
  import { getToken } from 'firebase/app-check';
  import { appCheck } from '$lib/firebase/config';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { strikes = [] } = $props();

  const apiKey = getGoogleMapsApiKey();
  const mapsMapId = getGoogleMapsMapId();

  let mapRoot = $state(null);
  let loadError = $state(false);

  $effect(() => {
    if (!browser || !mapRoot || !apiKey || !mapsMapId) return;

    loadError = false;

    let cancelled = false;
    let map = null;

    (async () => {
      try {
        if (appCheck) {
          await getToken(appCheck);
        }

        const g = await ensureGoogleMapsLoaded();
        if (cancelled || !mapRoot) return;

        if (!g?.maps) {
          loadError = true;
          return;
        }

        map = new g.maps.Map(mapRoot, {
          mapId: mapsMapId,
          center: { lat: 39.8283, lng: -98.5795 },
          zoom: 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
      } catch (e) {
        console.error('[TacticalRadarArena]', e);
        loadError = true;
      }
    })();

    return () => {
      cancelled = true;
      if (map && globalThis.google?.maps?.event) {
        globalThis.google.maps.event.clearInstanceListeners(map);
      }
      map = null;
    };
  });
</script>

{#if !apiKey || !mapsMapId || loadError}
  <div class="tw-bg-[#0a0a0a] tw-border tw-border-[#334155] tw-h-full tw-w-full tw-flex tw-items-center tw-justify-center">
    <Icon name="sys.map-pin" class="tw-text-[#334155]" size={36} />
  </div>
{:else}
  <div bind:this={mapRoot} class="tw-w-full tw-h-full tw-bg-[#0a0a0a]"></div>
{/if}
