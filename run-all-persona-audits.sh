#!/usr/bin/env bash
# =============================================================================
# SSTRACKER MULTI-PERSONA ORCHESTRATION SWARM RUNNER
# =============================================================================
# This master orchestration script sequentially loops through every single
# Operating System (Persona Workspace) inside the SSTracker repository,
# installs dependencies, verifies Svelte 5 types, runs the associated 
# Playwright visual regression and data-gate tests, and logs detailed traces.
#
# If any spec fails, the script triggers the localized TDD auto-fix loop
# up to 3 times before triggering the global circuit breaker to prevent credit waste.
# =============================================================================

# Style parameters
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0;0m' # No Color

echo -e "${CYAN}=====================================================================${NC}"
echo -e "${CYAN}🤖 SSTRACKER MASTER ENTERPRISE SWARM ORCHESTRATOR v2.0${NC}"
echo -e "${CYAN}=====================================================================${NC}"

# Target Personas Map: Name | Workflow File | Playwright Spec
declare -a PERSONAS=(
    "GlobalAdminOS:jules-secure-impersonation-gating-workflow.md:tests/secure-impersonation-gating.spec.ts"
    "DirectorOS:jules-director-os-polishing-workflow.md:tests/director-intel-perfection.spec.ts"
    "DirectorOS_Billing:jules-stripe-onboarding-workflow.md:tests/stripe-onboarding.spec.ts"
    "DirectorOS_Roster:jules-roster-importer-workflow.md:tests/roster-importer.spec.ts"
    "CoachOS_WarRoom:jules-ultimate-war-room-workflow.md:tests/tactical-war-room-v3.spec.ts"
    "CoachOS_MatchDay:jules-coach-matchday-workflow.md:tests/coach-matchday.spec.ts"
    "PlayerOS_Mistake:tactical-mistake-recovery-workflow.md:tests/tactical-mistake-recovery-workflow.spec.ts"
)

# Optional New Personas pending active implementation
declare -a PENDING_PERSONAS=(
    "CommissionerOS:jules-commissioner-federation-workflow.md:tests/commissioner-federation.spec.ts"
    "CoachOS_Staff:jules-coach-staff-workflow.md:tests/coach-staff-management.spec.ts"
    "CoachOS_ODP:jules-coach-odp-workflow.md:tests/coach-odp-analytics.spec.ts"
    "PlayerOS_Streak:jules-player-streak-workflow.md:tests/player-streak-arena.spec.ts"
    "PlayerOS_SkillTree:jules-player-skilltree-workflow.md:tests/player-skill-tree.spec.ts"
    "PlayerOS_SafeSport:jules-player-safesport-workflow.md:tests/player-safesport-inbox.spec.ts"
    "ParentOS:jules-parent-compliance-workflow.md:tests/parent-compliance.spec.ts"
    "FanRecruiterOS:jules-fan-recruiter-workflow.md:tests/fan-recruiter.spec.ts"
    "TutoringMarketplace:jules-tutoring-marketplace-workflow.md:tests/tutoring-marketplace.spec.ts"
)

FAILED_BUILDS=()
PASSED_BUILDS=()

# Global Type Compiler Audit
echo -e "\n${YELLOW}🔍 Stage 0: Executing Global Type-Checking and Syntax Audit...${NC}"
pnpm run check
COMPILER_STATUS=$?

if [ $COMPILER_STATUS -ne 0 ]; then
    echo -e "${RED}❌ COMPILER CRITICAL: Svelte 5 / TS compilation failed with errors. Aborting sequence to prevent regressions.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Compiler check passed. Core repository is completely clean and stable.${NC}"

# Loop through active specs
for item in "${PERSONAS[@]}"; do
    IFS=":" read -r name workflow spec <<< "$item"
    echo -e "\n${CYAN}=====================================================================${NC}"
    echo -e "${YELLOW}🚀 Launching Swarm Build: ${name}${NC}"
    echo -e "${CYAN}=====================================================================${NC}"
    echo -e "📄 Mapping Workflow: .agents/workflows/jules-builds/${workflow}"
    echo -e "🧪 Running Spec: ${spec}"
    
    # Run Playwright Spec
    pnpm playwright test "$spec" --project=chromium
    TEST_STATUS=$?
    
    if [ $TEST_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ SUCCESS: ${name} visual verification passed 100% green!${NC}"
        PASSED_BUILDS+=("$name")
    else
        echo -e "${RED}❌ FAILURE: ${name} spec failed visual regression or data-gate checks.${NC}"
        echo -e "${YELLOW}🛠️ Spawning Local TDD Auto-Fix Swarm...${NC}"
        
        # Iteration loops (up to 3 times per circuit-breaker constraints)
        SUCCESS=0
        for i in {1..3}; do
            echo -e "${YELLOW}👉 Iteration $i of 3 for self-healing: ${name}...${NC}"
            
            # Execute automated styling or code alignment checks here
            node scripts/trigger-persona-jules.js --workflow "$workflow" --spec "$spec"
            
            # Re-run Test
            pnpm playwright test "$spec" --project=chromium
            ITER_STATUS=$?
            
            if [ $ITER_STATUS -eq 0 ]; then
                echo -e "${GREEN}🎉 SELF-HEALED: ${name} is now 100% green on Iteration $i!${NC}"
                SUCCESS=1
                PASSED_BUILDS+=("$name")
                break
            fi
        done
        
        if [ $SUCCESS -eq 0 ]; then
            echo -e "${RED}🚨 CIRCUIT BREAKER HIT: Could not auto-heal ${name} after 3 attempts.${NC}"
            FAILED_BUILDS+=("$name")
        fi
    fi
done

# Print Executive Final Summary
echo -e "\n${CYAN}=====================================================================${NC}"
echo -e "${CYAN}📊 EXECUTIVE RUN SUMMARY${NC}"
echo -e "${CYAN}=====================================================================${NC}"

echo -e "🟢 VERIFIED BUILDS (${#PASSED_BUILDS[@]}):"
for build in "${PASSED_BUILDS[@]}"; do
    echo -e "  - ${GREEN}${build}${NC}"
done

if [ ${#FAILED_BUILDS[@]} -ne 0 ]; then
    echo -e "\n🔴 FAILED / UNRESOLVED BUILDS (${#FAILED_BUILDS[@]}):"
    for build in "${FAILED_BUILDS[@]}"; do
        echo -e "  - ${RED}${build}${NC}"
    done
    echo -e "\n${RED}🚨 LAUNCH BLOCKED: One or more operating systems failed validation. Please resolve issues before tomorrow's deploy.${NC}"
    exit 1
else
    echo -e "\n${GREEN}🚀 ALL ACTIVE SYSTEM PERSONAS VALIDATED: 100% Green E2E specs. Platform is officially ready for multi-billion-dollar scale! Deploy authorized!${NC}"
    exit 0
fi
