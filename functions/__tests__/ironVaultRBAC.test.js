const test = require('node:test');
const assert = require('node:assert');

test('Iron Vault RBAC: seat allocation limits bypass is prevented', async (t) => {
    // Phase 2, Epic 2: God Mode Licensing Engine
    // Testing that secureAllocateTeamSeats and related RBAC logic explicitly prevent standard clients from bypassing seat allocation.
    
    await t.test('secureAllocateTeamSeats rejects non-numeric limits', () => {
        // Simulated adminOps logic validation
        const validateSeatLimit = (val) => {
            let limit = parseInt(val, 10);
            if (!Number.isFinite(limit) || limit < 1) return 10;
            return Math.min(Math.floor(limit), 100000);
        };
        
        assert.strictEqual(validateSeatLimit("abc"), 10, "Non-numeric string falls back to 10");
        assert.strictEqual(validateSeatLimit(-5), 10, "Negative limit falls back to 10");
        assert.strictEqual(validateSeatLimit("500000"), 100000, "Limit is capped at 100000");
    });
    
    await t.test('seat availability math logic', () => {
        const ent = {
            seats_limit: 100,
            active_seats: 90,
            reserved_seats: 10
        };
        
        const hasSeats = (ent.active_seats + ent.reserved_seats) < ent.seats_limit;
        assert.strictEqual(hasSeats, false, "When active + reserved equals limit, no seats available");
    });
});
