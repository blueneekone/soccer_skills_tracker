import { authStore as baseAuthStore, createAuthFacade as baseCreateAuthFacade } from '$lib/stores/auth/facade.svelte.js';
export { getSessionItemSafe } from '$lib/stores/auth/storage.js';
import { untrack } from 'svelte';

/**
 * Enhanced Auth store public entry — adds multi-persona dual-role state.
 * @type {'parent' | 'coach' | 'director' | 'player' | 'admin' | null}
 */
let activeContext = $state(null);

/**
 * @param {Record<string, any>} target
 * @param {string} targetRole
 */
function handleSwitchContext(target, targetRole) {
    untrack(() => {
        const profile = target.userProfile;
        if (!profile) return;
        
        const hasRole = profile.role === targetRole || 
            (Array.isArray(profile.roles) && profile.roles.includes(targetRole));
        
        if (hasRole) {
            activeContext = /** @type {'parent' | 'coach' | 'director' | 'player' | 'admin'} */ (targetRole);
        }
    });
}

const authProxyHandler = {
    get(target, prop) {
        if (prop === 'activeContext') return activeContext;
        if (prop === 'switchContext') return /** @param {string} role */ (role) => handleSwitchContext(target, role);
        return Reflect.get(target, prop);
    }
};

export function createAuthFacade() {
    const facade = baseCreateAuthFacade();
    return new Proxy(facade, authProxyHandler);
}

export const authStore = new Proxy(baseAuthStore, authProxyHandler);
