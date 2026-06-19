/**
 * Coach intent deploy — Epic 8 Intent Engine module.
 * Route: `/coach/forge` · legacy redirect: `/coach/assignments`
 */

export { IntentEngine, type DeployPhase, type RosterEntry } from './IntentEngine.svelte.js';
export { default as IntentArena } from './IntentArena.svelte';
export { default as ForgeDeployPanel } from './ForgeDeployPanel.svelte';
/** @deprecated Use ForgeDeployPanel — fixed overlay removed VS-3-Forge */
export { default as IntentHUD } from './ForgeDeployPanel.svelte';
export { default as CoachIntentEngineView } from './CoachIntentEngineView.svelte';
