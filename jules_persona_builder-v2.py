#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(message, color=Colors.BLUE):
    print(f"{color}{Colors.BOLD}>>> {message}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}{Colors.BOLD}✔ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.WARNING}{Colors.BOLD}⚠ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.FAIL}{Colors.BOLD}✘ {message}{Colors.ENDC}")

def load_roadmap():
    cwd = Path.cwd()
    roadmap_paths = [cwd / "@ROADMAP-v2.md", cwd / "@ROADMAP.md", Path("/workspace/artifacts/@ROADMAP-v2.md")]
    for path in roadmap_paths:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return path, f.read()
            except Exception:
                pass
    return None, None

def parse_roadmap_items(content):
    if not content:
        return {}, []
    
    checked = []
    unchecked = []
    
    # Simple regex parsing for markdown checkboxes
    lines = content.splitlines()
    for line in lines:
        match = re.match(r'^\s*-\s*\[([xX\s])\]\s*(.*)$', line)
        if match:
            state = match.group(1).strip().lower()
            text = match.group(2).strip()
            if state == 'x':
                checked.append(text)
            else:
                unchecked.append(text)
                
    # Also parse persona readiness
    persona_statuses = {}
    persona_matches = re.findall(r'(\d+)\.\s+\*\*([^*]+)\*\*:\s*(?:🟢|🔴|🟡)\s+\*\*([^*]+)\*\*', content)
    for p_num, p_name, p_status in persona_matches:
        persona_statuses[p_num.strip()] = {
            "name": p_name.strip(),
            "status": p_status.strip()
        }
        
    return persona_statuses, checked, unchecked

# Define Persona specifications
PERSONAS = {
    "1": {
        "title": "Global Admin OS (The Command Plane)",
        "slug": "admin",
        "route": "src/routes/(app)/admin/",
        "test": "pnpm test functions/admin",
        "description": "Orchestrates multi-tenant control and absolute visibility. Secures impersonation JWT creation and PII shredders.",
        "blueprint_content": """---
name: jules-audit-admin-os
description: Structured, zero-looping blueprint to audit, secure, and stabilize the Global Admin Console.
---

# SSTracker Zero-Looping Audit: Global Admin Console (Z4)

@jules, act as our Principal Backend Architect and Chief Security Officer. Execute this targeted, non-deterministic audit and code repair.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract complex parsing or logic into 'src/lib/utils/adminHelpers.ts'.
2. **Defensive Hydration (B815)**: Wrap all raw Firestore 'getDocs' and 'onSnapshot' queries in:
   `if (!db || !authStore.isAuthenticated) return;`
3. **Pessimistic Definition of Done**: Run our local tests before submitting. The build must compile with exactly 0 Svelte compiler warnings and 0 TypeScript violations.

### 🛠️ Execution Sequence & Targets
- **Task 1: Secure Account Impersonation**
  * Target: 'functions-platform/src/domains/adminOps.js'
  * Action: Verify that 'admin.auth().createCustomToken(uid)' is securely wired. Ensure unauthenticated clients are blocked with a 401.
- **Task 2: PII Shredding Cascade**
  * Target: 'scripts/triggerRightToBeForgotten.cjs'
  * Action: Enforce CCPA/GDPR compliance. Securely execute a cascading writeBatch deletion of users and sub-collections, EXCEPT for 'consent_logs' and 'consent_records' (COPPA 2.0 legal audit trails).
- **Task 3: Prevent Client Role Mutations**
  * Target: 'firestore.rules'
  * Action: Enforce a secure map-diffing rule to prevent client-side updateDoc mutations from setting the 'role' field directly.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test functions/admin'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    },
    "2": {
        "title": "Commissioner OS (State Federation Command)",
        "slug": "commissioner",
        "route": "src/routes/(app)/commissioner/",
        "test": "pnpm test components/commissioner",
        "description": "Secures tournament operations, federation compliance grids, and ODP talent telemetry data flows.",
        "blueprint_content": """---
name: jules-audit-commissioner-os
description: Structured, zero-looping blueprint to audit, secure, and stabilize the Commissioner Federation Command.
---

# SSTracker Zero-Looping Audit: Commissioner OS (Federation Command)

@jules, act as our Principal Backend Architect and Lead UI/UX Architect. Execute this targeted audit and design system lock.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract complex routing or lookup tables into utilities.
2. **Defensive Hydration (B815)**: Wrap all multi-tenant federation aggregation queries in:
   `if (!db || !authStore.isAuthenticated) return;`
3. **SIEM Aesthetics**: Apply strict 90-degree corners, Navy Slate (#0f172a) panels, and Geist Mono numbers. Absolutely NO gamification chamfers or Action Gold (#fbbf24) elements are permitted.

### 🛠️ Execution Sequence & Targets
- **Task 1: Secure God-Mode Queries**
  * Target: 'src/lib/services/federation.svelte.ts'
  * Action: Ensure queries reading rosters across different 'clubIds' are strictly read-only and bounded by the commissioner's master 'tenantId'.
- **Task 2: ODP Talent Pipeline Telemetry**
  * Target: 'src/lib/components/commissioner/VanguardPrism.svelte'
  * Action: Confirm physical telemetry (1000Hz metrics) is correctly mapped to the 6-axis array in the exact order: [PACE, ACCEL, AGILITY, STAMINA, POWER, COMP].
- **Task 3: Empty States & Loading Feedback**
  * Target: 'src/lib/components/commissioner/FederationComplianceMatrix.svelte'
  * Action: Inject clean loading fallback wrappers to prevent visual layouts shifting during initial hydration.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test components/commissioner'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    },
    "3": {
        "title": "Director OS (B2B Revenue Engine)",
        "slug": "director",
        "route": "src/routes/(app)/director/",
        "test": "pnpm test functions/vampire",
        "description": "Secures 'The Vampire Importer' CSV parser, Stripe webhook entitlements, and active seat billing metrics.",
        "blueprint_content": """---
name: jules-audit-director-os
description: Structured, zero-looping blueprint to audit, secure, and stabilize the Director B2B Revenue Engine.
---

# SSTracker Zero-Looping Audit: Director OS (B2B Revenue Engine)

@jules, act as our Principal Backend Architect and Chief Technical Officer. Execute this targeted audit and Stripe payment lock.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract CSV chunking or subscription mapping to helpers.
2. **Batched Mutations**: Limit database writes to a maximum of 500 operations per Firestore transaction to prevent quota exhaustion.
3. **No Client-Side Calculation**: Stripe connect seats and payments must strictly use server-side triggers. Client-side math is banned.

### 🛠️ Execution Sequence & Targets
- **Task 1: The Vampire Importer CSV Parser**
  * Target: 'functions/src/domains/interoperabilityOps.js'
  * Action: Audit CSV ingestion. Enforce writeBatch limits of 500, chunking N+1 queries up to 30 items with the 'in' operator.
- **Task 2: Stripe Connect & Entitlement Hooks**
  * Target: 'functions/subscription.js' and 'functions-commerce/'
  * Action: Verify active seat calculations occur on Stripe webhook triggers. Update 'subscriptionStatus' on the canonical organization collection.
- **Task 3: Role-Verification Sanitizer**
  * Target: All Director callable functions.
  * Action: Ensure every entry point utilizes 'assertDirectorOrSuper' or 'assertDirectorClubOrSuper' from auth middleware.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test functions/vampire'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    },
    "4": {
        "title": "Coach OS (The Sideline SIEM)",
        "slug": "coach",
        "route": "src/routes/(app)/coach/",
        "test": "pnpm test functions/shadow-cc",
        "description": "Enforces legally mandated SafeSport Shadow CC channels, Tomorrow.io weather locks, and SVGs.",
        "blueprint_content": """---
name: jules-audit-coach-os
description: Structured, zero-looping blueprint to audit, secure, and stabilize the Coach OS Sideline SIEM.
---

# SSTracker Zero-Looping Audit: Coach OS (The Sideline SIEM)

@jules, act as our Principal Backend Architect and Lead UX Architect. Execute this targeted audit and SafeSport security lock.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract spatial math or roster parsers to helper files.
2. **Legally Mandated SafeSport Shadow CC**: The client is un-trusted. Client-side retrieval of parent emails is banned. All adult-to-minor channels must automatically resolve parents server-side.
3. **SIEM Aesthetics**: Enforce flat 90-degree panels, Navy Slate (#0f172a) canvases, and Geist Mono numbers.

### 🛠️ Execution Sequence & Targets
- **Task 1: SafeSport Shadow CC Firestore Trigger**
  * Target: 'functions/src/domains/commsOps.js'
  * Action: On 'onChannelCreated', initialize chat channels with 'BLOCKED_VPC_PENDING'. If the player is a minor, resolve linked guardian emails and write them to 'ccParentEmails'. Only then promote the status to 'ACTIVE'.
- **Task 2: Tomorrow.io Weather Lockout webhook**
  * Target: 'functions-integrations/src/domains/'
  * Action: Configure weather webhooks to write 'facility_weather_locks' and trigger immediate SvelteKit reactive route locks.
- **Task 3: Spatial Coordinate Canvas Math**
  * Target: 'src/lib/components/coach/tactical/TacticalArena.svelte'
  * Action: Enforce standard coordinate math: 'matrixTransform(getScreenCTM().inverse())' to prevent cursor offsets.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test functions/shadow-cc'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    },
    "5": {
        "title": "Player OS (The Dopamine Engine)",
        "slug": "player",
        "route": "src/routes/(app)/player/",
        "test": "pnpm test components/player",
        "description": "Secures verified database-commit confetti, 2% daily scoutsSix skill decay, and streak freeze tokens.",
        "blueprint_content": """---
name: jules-audit-player-os
description: Structured, zero-looping blueprint to audit, secure, and stabilize the Gamified Player HUD.
---

# SSTracker Zero-Looping Audit: Player OS (The Dopamine Engine)

@jules, act as our Principal Backend Architect and Chief Product Officer. Execute this targeted audit and gamification lock.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract XP progression or math decay algorithms to 'src/lib/utils/gamificationMath.ts'.
2. **Commit-Bound Celebration**: Never trigger visual rewards (confetti) optimistically. Confetti must strictly execute in the '.then()' or 'try/catch' success blocks of verified Firestore writes.
3. **Gaming HUD Design**: Override panels to use 40% Void Black (#000000) layouts and chamfered visual clip-paths.

### 🛠️ Execution Sequence & Targets
- **Task 1: 2% Daily Skill Decay (Loss Avoidance)**
  * Target: 'functions/src/domains/skillDecayOps.js' and 'src/lib/utils/gamificationMath.ts'
  * Action: Implement the 2% daily scoutsSix stats decrement after 24 hours of inactivity. Ensure it checks for and consumes 'streakFreeze' tokens. Must mutate the nested armory map inside the canonical 'users/{email}' doc (never isolated collections).
- **Task 2: Strip Svelte 5 Proxies ($state.snapshot)**
  * Target: 'src/lib/components/player/VanguardPrism.svelte'
  * Action: Use '$state.snapshot()' to serialize and strip proxies before passing telemetry dataset vectors to Chart.js.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test components/player'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    },
    "6": {
        "title": "Parent OS (Compliance Shield)",
        "slug": "parent",
        "route": "src/routes/(app)/parent/",
        "test": "pnpm test services/parent-vault",
        "description": "Secures COPPA 2.0 parental consent enforcers, WebAuthn biometric vaults, and 'The Car Ride Home Protocol' countdown.",
        "blueprint_content": """---
name: jules-audit-parent-os
description: Structured, zero-looping blueprint to audit, secure, and stabilize the Parent Compliance Vault.
---

# SSTracker Zero-Looping Audit: Parent OS (Compliance Vault)

@jules, act as our Principal Backend Architect and Chief Security Officer. Execute this targeted audit and compliance lock.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract household graph lookups to isolated modules.
2. **COPPA 2.0 Compliance**: Player telemetry and biometric ingestion must remain fully paused and blocked until the parent's biometric Verifiable Parental Consent (VPC) token is authenticated.
3. **Aesthetic Boundaries**: Use standard 24px border radii for the outer panels to establish visual trust.

### 🛠️ Execution Sequence & Targets
- **Task 1: The Car Ride Home Protocol Gating**
  * Target: 'src/lib/services/compliance.svelte.ts' and 'src/routes/(app)/parent/dashboard/+page.svelte'
  * Action: Mathematically enforce a strict 15-minute embargo on youth match metrics post-game. Style the countdown timer exclusively in Atompunk Amber (tw-text-[#f59e0b]).
- **Task 2: WebAuthn Biometric VPC Enclaves**
  * Target: 'functions-compliance/src/domains/webauthnOps.js'
  * Action: Securely bind parental consent options to TouchID/FaceID credentials. Strip port/protocol values from Relying Party IDs during verification.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test services/parent-vault'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    },
    "7": {
        "title": "Fan & Recruiter OS (Broadcast & Recruitment Gateways)",
        "slug": "recruiter",
        "route": "src/routes/(app)/recruiter/",
        "test": "pnpm test components/recruiter",
        "description": "Secures the Recruiter Search Checkr background clearance gate and server-side ticketing campaigns.",
        "blueprint_content": """---
name: jules-audit-recruiter-os
description: Structured, zero-looping blueprint to audit, secure, and stabilize the Recruiter Clearance Gateway.
---

# SSTracker Zero-Looping Audit: Recruiter & Fan Gateways

@jules, act as our Principal Backend Architect and Chief Security Officer. Execute this targeted audit and recruitment gate.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract search pagination or webhook checks to helper files.
2. **Checkr Background Enforcement**: National Criminal Database clearance is legally mandated under COPPA. Scouts have 0 access to minor player profiles unless 'checkr_status' strictly equals 'clear'.
3. **No client-side DB writes**: Billing packages, subscription tiers, and superdraw tickets must exclusively write server-side via Cloud Functions.

### 🛠️ Execution Sequence & Targets
- **Task 1: Recruiter Search Engine Gate (Checkr API)**
  * Target: 'src/lib/components/recruiter/RecruiterSearchEngine.svelte'
  * Action: Inject the B815 defensive hydration guard and a strict checkr status return check at the top of the search trigger. If the recruiter's 'checkrStatus' is not 'clear', return an empty array.
  * Optimization: Apply cursor-based pagination using startAfter and limit(20) to enforce performance targets.
- **Task 2: Fan Superdraw Fundraising campaigns**
  * Target: 'functions-commerce/'
  * Action: Ensure 60-minute fundraising campaigns authenticate and mutate data server-side using read-only structures.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test components/recruiter'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    },
    "8": {
        "title": "Tutoring Marketplace (Direct-to-Parent Network)",
        "slug": "tutoring",
        "route": "src/routes/(app)/tutoring-marketplace/",
        "test": "pnpm test components/tutoring",
        "description": "Builds and deploys Svelte 5 Bento-grid views and bookTutoringSession callable Stripe handlers on functions-commerce.",
        "blueprint_content": """---
name: jules-build-tutoring-marketplace
description: Comprehensive zero-looping blueprint to build, secure, and deploy the Tutoring Marketplace launch features.
---

# SSTracker Zero-Looping Build: Tutoring Marketplace (Phase 4)

@jules, act as our Chief Software Architect and Lead Frontend & UX Architect. Execute the full implementation of the Tutoring Directory Lookup and Stripe payment flows.

### 🛡️ Critical Architectural Constraints (Non-Negotiable)
1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract booking math or directory query building to smaller utilities.
2. **SafeSport Privacy Boundaries**: This directory must be completely hidden from Players, Admins, and Commissioners (Direct-to-Parent Network). Only Directors, Coaches, and Parents can access or search tutors.
3. **Stripe Connect Destination Charges**: Process secure credit card payments via Stripe Connect Destination Charges. Collect a microcharge application fee per booking. Calculations must remain server-side.

### 🛠️ Execution Sequence & Targets
- **Task 1: Svelte 5 Bento-grid View & B815 Hydration**
  * Target: 'src/routes/(app)/tutoring-marketplace/+page.svelte'
  * Action: Build the responsive 12-column Bento-grid lookup display. Enforce the strict B815 defensive hydration check:
    `if (!db || !authStore.isAuthenticated) return;`
  * Filter: Restrict lookup results to matching active sport branch (e.g. only basketball/soccer matching user's branch).
- **Task 2: Deploy bookTutoringSession Callable**
  * Target: 'functions-commerce/src/domains/tutoringOps.js'
  * Action: Implement 'bookTutoringSession' lazy loading 'firebase-admin' and the Stripe SDK inside the execution block. Compute application fees server-side.
- **Task 3: Prevent Player Read Access Rules**
  * Target: 'firestore.rules'
  * Action: Enforce security rules blocking Players, Admins, and Commissioners from reading from 'tutors' or 'tutor_profiles'.

### 🚦 Test & Handover
1. Run local compilation check: 'pnpm run check && pnpm run build'
2. Run targeted tests: 'pnpm test components/tutoring'
3. Confirm 100% green exit codes and open a detailed Pull Request.
"""
    }
}

def generate_blueprint(choice, active_roadmap_item=None):
    if choice not in PERSONAS:
        print_error("Invalid selection. Exiting.")
        sys.exit(1)
        
    persona = PERSONAS[choice]
    print_status(f"Generating workflow blueprint for: {persona['title']}...", Colors.HEADER)
    
    # Target file path inside the workspace's out box
    out_dir = Path("/workspace/out")
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"jules-audit-{persona['slug']}.md" if choice != "8" else f"jules-build-{persona['slug']}.md"
    target_path = out_dir / filename
    
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(persona["blueprint_content"])
        
    print_success(f"Successfully generated and locked downloadable workflow artifact!")
    print(f"File published: {filename} inside Svelte outbox.")
    print("\n" + "="*60)
    print_status("🚀 NEXT STEPS TO ORCHESTRATE JULES IN YOUR TERMINAL:", Colors.HEADER)
    print(f" 1. Copy the generated blueprint file from '/workspace/out/' to your local project's active workflows folder:")
    print(f"    {Colors.BOLD}mkdir -p .agents/workflows/jules && cp /path/to/{filename} .agents/workflows/jules/{Colors.ENDC}")
    print(f"\n 2. Force the local environment to align and standardise aesthetics (Amber highlights):")
    print(f"    {Colors.BOLD}python3 ceo_rapid_launchpad.py{Colors.ENDC}")
    print(f"\n 3. To run this specific build immediately, invoke the local advanced orchestrator v2 script:")
    print(f"    {Colors.BOLD}python3 launch_jules_workflows_v2.py{Colors.ENDC}")
    if choice == "8":
        print(f"    *(Select Option [2] and type 'tutoring' to build the new Tutoring Marketplace immediately!)*")
    else:
        print(f"    *(Select Option [2] and type '{persona['slug']}' to isolate the run and completely prevent VM looping!)*")
    print("="*60 + "\n")

def main():
    print_status("SSTracker Launch-Day Persona Workflow Generator v2.0", Colors.HEADER)
    print("This utility dynamically reviews the active launch roadmap to track")
    print("which features are already verified and which are pending, then generates")
    print("strict execution specifications with ZERO looping or hallucinations.")
    
    # 1. Load and parse the active roadmap
    roadmap_path, roadmap_content = load_roadmap()
    if roadmap_path:
        print_success(f"Active launch roadmap located: {roadmap_path.name}")
        persona_statuses, checked, unchecked = parse_roadmap_items(roadmap_content)
        
        print("\n" + "-"*50)
        print_status("📋 ACTIVE ROADMAP PROGRESS REPORT", Colors.HEADER)
        print(f"  {Colors.BOLD}Checked Off (Verified & Deployed):{Colors.ENDC}")
        for item in checked:
            print(f"    ✔ [x] {item}")
        
        print(f"\n  {Colors.BOLD}Pending Construction (Active Launch Bottlenecks):{Colors.ENDC}")
        for item in unchecked:
            print(f"    ⚠ [ ] {Colors.FAIL}{item}{Colors.ENDC}")
        print("-"*50 + "\n")
    else:
        print_warning("No active roadmap (@ROADMAP-v2.md) detected in this directory. Defaulting to full catalog.")
        checked, unchecked = [], []

    print("Choose target persona to generate its strict execution specification:")
    
    for key, p in PERSONAS.items():
        # Determine readiness indicator based on choice
        status_indicator = "🟢 [READY]"
        if key == "8":
            status_indicator = f"🟡 [ACTIVE BOTTLENECK - UNCHECKED]"
            
        print(f" [{key}] {status_indicator} {p['title']}")
        print(f"     - Route: {p['route']} | Test: {p['test']}")
        print(f"     - {p['description']}")
        
    choice = input(f"\n{Colors.BOLD}Select Persona / Epic (1-8): {Colors.ENDC}").strip()
    generate_blueprint(choice)

if __name__ == "__main__":
    main()
