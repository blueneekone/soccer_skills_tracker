<script lang="ts">
  import { browser } from '$app/environment';
  import { auth } from '$lib/firebase.js';
  import { signInWithCustomToken } from 'firebase/auth';
  import { onMount } from 'svelte';
  
  let errorMsg = $state('');

  onMount(async () => {
    if (browser) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
          await signInWithCustomToken(auth, token);
          window.location.href = '/';
        } else {
          errorMsg = 'No token provided in URL';
        }
      } catch (err: any) {
        errorMsg = err.message || String(err);
      }
    }
  });
</script>
<h1>Audit Login in progress...</h1>
{#if errorMsg}
  <p style="color: red;">Error: {errorMsg}</p>
{/if}
