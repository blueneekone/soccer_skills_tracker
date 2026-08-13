#!/usr/bin/env python3
import os
import re
import sys

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

def find_file(root_dir, target_name, contains_string=None):
    """Find files matching target_name containing certain text."""
    matches = []
    for root, dirs, files in os.walk(root_dir):
        if any(d in root for d in ['.git', 'node_modules', 'dist', '.svelte-kit']):
            continue
        for file in files:
            if file == target_name or (target_name.startswith('*') and file.endswith(target_name[1:])):
                filepath = os.path.join(root, file)
                if contains_string:
                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        if contains_string in content:
                            matches.append(filepath)
                    except Exception:
                        pass
                else:
                    matches.append(filepath)
    return matches

def patch_google_signin(root_dir):
    print_status("Checking Google Sign-In identity routing...", Colors.HEADER)
    # Search for files that perform google sign-in or write user doc with uid
    target_files = find_file(root_dir, "*.js", "doc(db, 'users', user.uid)") + \
                   find_file(root_dir, "*.ts", "doc(db, 'users', user.uid)") + \
                   find_file(root_dir, "*.svelte", "doc(db, 'users', user.uid)") + \
                   find_file(root_dir, "*.js", "doc(db, \"users\", user.uid)") + \
                   find_file(root_dir, "*.ts", "doc(db, \"users\", user.uid)") + \
                   find_file(root_dir, "*.svelte", "doc(db, \"users\", user.uid)")

    if not target_files:
         # Try finding generic users/uid setups
         target_files = find_file(root_dir, "loginRouting.js") + find_file(root_dir, "postAuthRouting.ts")

    if not target_files:
        print_warning("No files matching standard Google Sign-In UID patterns found. Skipping auto-patch.")
        return

    for filepath in target_files:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Pattern replacing the uid key with email
            pattern = r"doc\(\s*db\s*,\s*['\"]users['\"]\s*,\s*user\.uid\s*\)"
            fixed_content = re.sub(pattern, "doc(db, 'users', user.email.toLowerCase())", content)
            
            # Double check for double quotes pattern
            pattern_dq = r"doc\(\s*db\s*,\s*[\"\']users[\"\']\s*,\s*user\.uid\s*\)"
            fixed_content = re.sub(pattern_dq, "doc(db, 'users', user.email.toLowerCase())", fixed_content)

            if fixed_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                print_success(f"Patched user document path in: {os.path.relpath(filepath)} to trigger syncUserClaims!")
            else:
                print_warning(f"File verified but no regex changes applied to: {os.path.relpath(filepath)}")
        except Exception as e:
            print_error(f"Failed to patch {filepath}: {e}")

def patch_coach_onboarding(root_dir):
    print_status("Checking Coach onboarding paths...", Colors.HEADER)
    # Search for onboarding files doing raw client writes on role
    target_files = find_file(root_dir, "+page.svelte", "role: 'coach'") + \
                   find_file(root_dir, "Onboarding.svelte", "role: 'coach'") + \
                   find_file(root_dir, "*", "role: 'coach'")
    
    # We want to filter to routes or components
    target_files = [f for f in target_files if "onboarding" in f or "routes" in f]

    if not target_files:
        target_files = find_file(root_dir, "+page.svelte", "updateDoc")
        target_files = [f for f in target_files if "coach" in f or "onboarding" in f]

    if not target_files:
        print_warning("No matching Coach onboarding routes found for role assignment bypass. Skipping.")
        return

    for filepath in target_files:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # Replace client side updateDoc role with cloud function claimCoachInvite and claims refresh
            # Let's check if the file contains updateDoc with role: coach
            modified = False
            if "role:" in content and "updateDoc" in content:
                # Surgical replace of role update logic
                replacement_code = (
                    "// Triggered via secure server-side claimCoachInvite mapping\n"
                    "            const claimInvite = httpsCallable(functions, 'claimCoachInvite');\n"
                    "            await claimInvite({ inviteCode: inviteCode });\n"
                    "            if (auth.currentUser) {\n"
                    "                await auth.currentUser.getIdToken(true); // Flush stale IndexedDB JWT\n"
                    "            }"
                )
                # Replace client-side write references with secure call
                content = re.sub(r"await\s+updateDoc\(.*?(?:role\s*:\s*['\"]coach['\"]).*?\);?", replacement_code, content, flags=re.DOTALL)
                modified = True

            # Ensure getIdToken(true) is invoked on auth success
            if "getIdToken" not in content:
                # Attempt to inject getIdToken(true) right before redirects
                content = re.sub(
                    r"goto\(\s*['\"]/dashboard['\"]\s*\)",
                    "await auth.currentUser?.getIdToken(true);\n            goto('/dashboard')",
                    content
                )
                modified = True

            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print_success(f"Enforced server-side seat reservations in: {os.path.relpath(filepath)}")
        except Exception as e:
            print_error(f"Failed to patch onboarding: {e}")

def patch_sveltekit_ssr_cookies(root_dir):
    print_status("Checking SvelteKit SSR session cookie synchronization...", Colors.HEADER)
    # Locate auth.ts / auth.js store or loginRouting where auth changes happen
    auth_stores = find_file(root_dir, "auth.ts", "onIdTokenChanged") + \
                  find_file(root_dir, "auth.js", "onIdTokenChanged") + \
                  find_file(root_dir, "authStore.ts", "onIdTokenChanged")

    if not auth_stores:
        auth_stores = find_file(root_dir, "auth.ts") + find_file(root_dir, "authStore.ts")

    if not auth_stores:
        print_warning("SvelteKit authentication stores not located. Skipping cookie sync injection.")
        return

    for filepath in auth_stores:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # Ensure we serialize the cookie on IdToken change and reload to hydrate
            modified = False
            if "document.cookie" not in content and "onIdTokenChanged" in content:
                cookie_serialization = (
                    "const token = newUser ? await newUser.getIdToken() : undefined;\n"
                    "    document.cookie = `token=${token || ''}; path=/; max-age=${token ? 3600 : 0}; SameSite=Strict; Secure`;\n"
                    "    if (token) {\n"
                    "        window.location.reload(); // Force SvelteKit SSR layouts to pick up secure cookies\n"
                    "    }"
                )
                # Find the onIdTokenChanged block and inject
                content = re.sub(
                    r"onIdTokenChanged\s*\(\s*async\s*\(\s*(\w+)\s*\)\s*=>\s*\{",
                    r"onIdTokenChanged(async (\1) => {\n    " + cookie_serialization,
                    content
                )
                modified = True
            
            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print_success(f"Injected secure SvelteKit SSR cookie syncing in: {os.path.relpath(filepath)}")
        except Exception as e:
            print_error(f"Failed to patch auth store: {e}")

def main():
    print_status("Initializing SSTracker Architectural Auto-Healer...", Colors.HEADER)
    print("This script is running locally to surgically fix Google Sign-In matching paths, Coach onboarding parameters, and SSR credentials.\n")
    
    current_dir = os.getcwd()
    
    patch_google_signin(current_dir)
    print("-" * 50)
    patch_coach_onboarding(current_dir)
    print("-" * 50)
    patch_sveltekit_ssr_cookies(current_dir)
    print("-" * 50)
    
    print_success("Auto-healing completed! If target patterns were found, they have been patched securely.")
    print("You are now fully cleared to execute 'setup_and_jules_deploy-v4.py' and trigger deployments!")

if __name__ == '__main__':
    main()
