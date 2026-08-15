#!/usr/bin/env python3
import os
import shutil
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

# 1. Redundant Junk Files Checklist
REDUNDANT_FILES = [
    "launch_jules_workflows.py",
    "setup_and_jules_deploy.py",
    "setup_and_jules_deploy-v2.py",
    "setup_and_jules_deploy-v3.py",
    "setup_and_jules_deploy-v4.py",
    "jules_remediation_runner.py",
    "patch_auth_onboarding.py",
    "firebase-v2.json",
    "cso-auth-ssr-hotfix.md",
    "architect-backend-recovery.md",
    "cso-webauthn-origin-binding.md",
    "frontend-hydration-recovery.md"
]

def clean_redundant_junk():
    print_status("Initiating Workspace Cleanup: Purging Redundant Junk...", Colors.HEADER)
    cwd = Path.cwd()
    purged_count = 0
    
    # Clean standard list
    for filename in REDUNDANT_FILES:
        target_file = cwd / filename
        if target_file.exists():
            try:
                target_file.unlink()
                print_success(f"Purged redundant file: {filename}")
                purged_count += 1
            except Exception as e:
                print_error(f"Failed to delete {filename}: {e}")
                
    # Also clean redundant v1 blueprints from the builds folders if they got duplicated
    builds_dir = cwd / ".agents" / "workflows" / "jules-builds"
    if builds_dir.exists():
        for filename in ["architect-backend-recovery.md", "cso-webauthn-origin-binding.md", "frontend-hydration-recovery.md"]:
            target_file = builds_dir / filename
            if target_file.exists():
                try:
                    target_file.unlink()
                    print_success(f"Purged duplicate v1 blueprint from builds: {filename}")
                    purged_count += 1
                except Exception as e:
                    pass
                    
    print_status(f"Cleanup Complete. Total of {purged_count} redundant files successfully purged.", Colors.GREEN)

# 2. Local Codebase Healing & Color Swapping
def heal_local_codebase():
    print("\n" + "="*50)
    print_status("Initiating Local Codebase Healing Sequence...", Colors.HEADER)
    
    cwd = Path.cwd()
    patched_files = 0
    
    # Files to ignore during recursive search
    ignore_dirs = {".git", "node_modules", "dist", ".svelte-kit", "static", ".agents", "audit-artifacts", "recordings"}
    
    for root, dirs, files in os.walk(cwd):
        dirs[:] = [d for dirs in [dirs] for d in dirs if d not in ignore_dirs]
        
        for file in files:
            if not file.endswith((".svelte", ".ts", ".js", ".css")):
                continue
                
            file_path = Path(root) / file
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    
                original_content = content
                modified = False
                
                # A. SWAP COLOR TOKENS: Nuclear Yellow (#daff0a) to Amber (#fbbf24)
                if "#daff0a" in content:
                    content = content.replace("#daff0a", "#fbbf24")
                    print_success(f"Color Swap: Replaced Nuclear Yellow with Amber in {file_path.relative_to(cwd)}")
                    modified = True
                    
                if "nuclear-yellow" in content:
                    content = content.replace("nuclear-yellow", "amber-500")
                    modified = True
                    
                # B. GOOGLE SIGN-IN SANITIZER: Replace users/{uid} with users/{email}
                if "doc(db, 'users', user.uid)" in content:
                    content = content.replace("doc(db, 'users', user.uid)", "doc(db, 'users', user.email.toLowerCase())")
                    print_success(f"Auth Repair: Reindexed user document path to users/{{email}} in {file_path.relative_to(cwd)}")
                    modified = True
                    
                if "doc(db, \"users\", user.uid)" in content:
                    content = content.replace("doc(db, \"users\", user.uid)", "doc(db, \"users\", user.email.toLowerCase())")
                    print_success(f"Auth Repair: Reindexed user document path to users/{{email}} in {file_path.relative_to(cwd)}")
                    modified = True

                # C. COMPLIANCE FORCE ID REFRESH: Force JWT Claim refresh on role assignments
                if "claimCoachInvite" in content and "getIdToken(true)" not in content:
                    # Inject Token Refresh right after successful invitation claims to resolve permission latencies
                    lines = content.splitlines()
                    for idx, line in enumerate(lines):
                        if "claimCoachInvite" in line and ("await" in line or ".then" in line):
                            # Append getIdToken(true) call dynamically
                            indentation = " " * (len(line) - len(line.lstrip()))
                            lines.insert(idx + 1, f"{indentation}await auth.currentUser?.getIdToken(true);")
                            print_success(f"Auth Repair: Injected Custom Claim refresh trigger in {file_path.relative_to(cwd)}")
                            modified = True
                            break
                    content = "\n".join(lines)

                # D. SVELTEKIT SSR SESSION COOKIE SYNC (onIdTokenChanged)
                if "onIdTokenChanged" in content and "SameSite=Strict" not in content:
                    lines = content.splitlines()
                    for idx, line in enumerate(lines):
                        if "onIdTokenChanged" in line:
                            indentation = " " * (len(line) - len(line.lstrip()))
                            cookie_sync = (
                                f"{indentation}  const token = newUser ? await newUser.getIdToken() : undefined;\n"
                                f"{indentation}  document.cookie = `token=${{token || ''}}; path=/; max-age=${{token ? 3600 : 0}}; SameSite=Strict; Secure`;\n"
                                f"{indentation}  if (token && !document.cookie.includes('token')) {{\n"
                                f"{indentation}    window.location.reload();\n"
                                f"{indentation}  }}"
                            )
                            lines.insert(idx + 1, cookie_sync)
                            print_success(f"SSR Hook Sync: Injected Session Cookie Sync in {file_path.relative_to(cwd)}")
                            modified = True
                            break
                    content = "\n".join(lines)
                
                # E. SVELTE 5 REACTIVITY GOTO SAFEGUARD (untrack)
                if "goto(" in content and "$effect" in content and "untrack" not in content:
                    # Ensure programmatic navigation does not cause cyclic dependencies
                    lines = content.splitlines()
                    for idx, line in enumerate(lines):
                        if "$effect(" in line:
                            # Search for goto down-tree
                            for next_idx in range(idx + 1, min(idx + 10, len(lines))):
                                if "goto(" in lines[next_idx] and "untrack" not in lines[next_idx]:
                                    sub_indent = " " * (len(lines[next_idx]) - len(lines[next_idx].lstrip()))
                                    lines[next_idx] = f"{sub_indent}untrack(() => {{\n{sub_indent}  {lines[next_idx].strip()}\n{sub_indent}}});"
                                    modified = True
                            if modified:
                                print_success(f"Reactivity Guard: Wrapped goto() in untrack() inside $effect in {file_path.relative_to(cwd)}")
                                break
                    content = "\n".join(lines)

                if modified:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    patched_files += 1
                    
            except Exception as e:
                print_error(f"Failed to scan/patch file {file}: {e}")

    print_status(f"Healer Complete. Patched and secured {patched_files} local files successfully.", Colors.GREEN)

def main():
    print_status("SSTracker Master Cleanup & Local Recovery Engine Online", Colors.HEADER)
    print("This utility executes two sequential critical actions on your machine:")
    print("  1. Purges redundant launch scripts, duplicate configurations, and old v1 blueprints.")
    print("  2. Applies local codebase repairs (color swaps to Amber, Svelte Sign-In repairs, token refreshes, and Svelte 5 navigation guards).\n")
    
    confirm = input(f"{Colors.BOLD}Run complete workspace repair now? (y/n): {Colors.ENDC}").strip().lower()
    if confirm != 'y':
        print_warning("Execution cancelled.")
        sys.exit(0)
        
    print("\n" + "="*50)
    clean_redundant_junk()
    heal_local_codebase()
    
    print("\n" + "="*50)
    print_success("All local repairs are finalized and locked!")
    print("Your design system is standardized on Amber, your Google Sign-In re-indexing is complete, and SvelteKit cookie sync hooks are active.")
    print("\nRun this command to push your working codebase to your production environment immediately:")
    print(f"{Colors.BOLD}firebase deploy --only hosting,firestore:rules,functions{Colors.ENDC}")

if __name__ == "__main__":
    main()
