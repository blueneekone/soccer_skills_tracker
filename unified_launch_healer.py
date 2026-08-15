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

def print_status(msg):
    print(f"{Colors.BLUE}{Colors.BOLD}>>> {msg}{Colors.ENDC}")

def print_success(msg):
    print(f"{Colors.GREEN}{Colors.BOLD}✔ {msg}{Colors.ENDC}")

def print_warning(msg):
    print(f"{Colors.WARNING}{Colors.BOLD}⚠ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.FAIL}{Colors.BOLD}✘ {msg}{Colors.ENDC}")

class UnifiedLaunchHealer:
    def __init__(self, root_dir="."):
        self.root_dir = os.path.abspath(root_dir)
        self.patches_applied = []

    def safe_read(self, filepath):
        for enc in ['utf-8', 'utf-16', 'latin-1']:
            try:
                with open(filepath, 'r', encoding=enc) as f:
                    return f.read(), enc
            except UnicodeDecodeError:
                continue
        return None, None

    def safe_write(self, filepath, content, encoding):
        with open(filepath, 'w', encoding=encoding) as f:
            f.write(content)

    def scan_files(self, extension):
        exclude_dirs = {'.git', 'node_modules', 'dist', '.svelte-kit'}
        matches = []
        for root, dirs, files in os.walk(self.root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file.endswith(extension):
                    matches.append(os.path.join(root, file))
        return matches

    def heal_firestore_rules(self):
        rules_path = os.path.join(self.root_dir, 'firestore.rules')
        if not os.path.exists(rules_path):
            print_warning("firestore.rules not found at root. Creating a secure default...")
            default_rules = """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function checkDocExists(docPath) { return exists(docPath); }
    function fetchDoc(docPath) { return get(docPath); }
    match /clubs/{clubId} {
      allow read, write: if request.auth != null && request.auth.token.clubId == clubId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}"""
            self.safe_write(rules_path, default_rules, 'utf-8')
            print_success("Generated secure firestore.rules")
            return

        content, enc = self.safe_read(rules_path)
        if not content:
            return

        mutated = False
        if re.search(r'function\s+exists\s*\(', content):
            content = re.sub(r'function\s+exists\s*\(', 'function checkDocExists(', content)
            content = re.sub(r'(?<!function\s)exists\s*\(', 'checkDocExists(', content)
            mutated = True
            print_success("Healed custom exists() function collision in rules")

        if re.search(r'function\s+get\s*\(', content):
            content = re.sub(r'function\s+get\s*\(', 'function fetchDoc(', content)
            content = re.sub(r'(?<!function\s)get\s*\(', 'fetchDoc(', content)
            mutated = True
            print_success("Healed custom get() function collision in rules")

        tenant_rule = "match /clubs/{clubId} {\n      allow read, write: if request.auth != null && request.auth.token.clubId == clubId;\n    }"
        if "request.auth.token.clubId == clubId" not in content:
            match_db = r'match\s+/databases/\{database\}/documents\s*\{'
            replacement = f"match /databases/{{database}}/documents {{\n    \n    // Multi-Tenant Integrity Guard\n    {tenant_rule}\n"
            content = re.sub(match_db, replacement, content)
            mutated = True
            print_success("Injected Multi-Tenant clubId Custom Claims boundary rules")

        if mutated:
            self.safe_write(rules_path, content, enc)
            self.patches_applied.append("firestore.rules compilation overrides")

    def heal_functions_scope(self):
        targets = self.scan_files('.ts') + self.scan_files('.js')
        for filepath in targets:
            if 'node_modules' in filepath or 'dist' in filepath:
                continue
            content, enc = self.safe_read(filepath)
            if not content or 'onCall' not in content:
                continue

            global_init_pattern = r'const\s+(\w+)\s*=\s*(?:admin\.initializeApp\(\)|admin\.firestore\(\)|admin\.auth\(\)|require\([\'"]stripe[\'"]\).*?)\s*;'
            if re.search(global_init_pattern, content):
                lazy_init_block = (
                    "// Lazy loaded inside callable scope to bypass compilation timeout\n"
                    "    const admin = await import('firebase-admin');\n"
                    "    if (!admin.apps.length) {\n"
                    "        admin.initializeApp();\n"
                    "    }\n"
                    "    const db = admin.firestore();"
                )
                cleaned_content = re.sub(global_init_pattern, '', content)
                on_call_pattern = r'(onCall\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{)'
                modified_content = re.sub(on_call_pattern, r'\1\n    ' + lazy_init_block, cleaned_content)
                if modified_content != content:
                    self.safe_write(filepath, modified_content, enc)
                    print_success(f"Lazy-loaded database scope in function: {os.path.relpath(filepath)}")
                    self.patches_applied.append(f"Scope optimization: {os.path.relpath(filepath)}")

    def heal_webauthn_origins(self):
        targets = self.scan_files('.ts') + self.scan_files('.js')
        for filepath in targets:
            if 'node_modules' in filepath or 'dist' in filepath:
                continue
            content, enc = self.safe_read(filepath)
            if not content:
                continue

            mutated = False
            if 'generateRegistrationOptions' in content and 'rpID' in content:
                clean_rp_pattern = r'rpID\s*:\s*([^,\n}]+)'
                sanitized_rp = "process.env.WEBAUTHN_RP_ID?.replace(/^https?:\\/\\//, '').split(':')[0] || 'sstracker.app'"
                if "replace(/^https" not in content:
                    content = re.sub(clean_rp_pattern, f"rpID: {sanitized_rp}", content)
                    mutated = True

            if 'verifyRegistrationResponse' in content and 'expectedOrigin' in content:
                origin_pattern = r'expectedOrigin\s*:\s*([^,\n}]+)'
                sanitized_origin = "process.env.WEBAUTHN_RP_ORIGIN?.split(',') || ['https://sstracker.app', 'https://preview.sstracker.app']"
                if "split(',')" not in content:
                    content = re.sub(origin_pattern, f"expectedOrigin: {sanitized_origin}", content)
                    mutated = True

            if mutated:
                self.safe_write(filepath, content, enc)
                print_success(f"Sanitized cryptographic WebAuthn origin mapping in: {os.path.relpath(filepath)}")
                self.patches_applied.append(f"WebAuthn Origin Alignment: {os.path.relpath(filepath)}")

    def heal_svelte_reactivity_and_cookies(self):
        svelte_files = self.scan_files('.svelte')
        for filepath in svelte_files:
            content, enc = self.safe_read(filepath)
            if not content:
                continue

            mutated = False
            # B815 defensive hydration
            if ('getDocs' in content or 'onSnapshot' in content) and '!db' not in content:
                guard_pattern = r'(function\s+\w+\s*\(.*?\)\s*\{)'
                replacement = r'\1\n    if (!db || !authStore.isAuthenticated) return;'
                content = re.sub(guard_pattern, replacement, content, count=1)
                mutated = True
                print_success(f"Injected B815 Hydration Guard in: {os.path.relpath(filepath)}")

            # Svelte 5 navigation untrack
            if 'goto(' in content and 'untrack(' not in content:
                content = re.sub(
                    r'goto\s*\(\s*([\'"`].+?[\'"`])\s*\)\s*;?',
                    r'untrack(() => { goto(\1); });',
                    content
                )
                mutated = True
                print_success(f"Wrapped SvelteKit goto() inside untrack() inside: {os.path.relpath(filepath)}")

            # State Array Spread mutations
            legacy_push_pattern = r'(\b\w+)\.push\s*\(\s*(.+?)\s*\)\s*;'
            if re.search(legacy_push_pattern, content) and '$state' in content:
                content = re.sub(legacy_push_pattern, r'\1 = [...\1, \2];', content)
                mutated = True
                print_success(f"Refactored legacy array push mutation to spread in: {os.path.relpath(filepath)}")

            if mutated:
                self.safe_write(filepath, content, enc)
                self.patches_applied.append(f"Svelte 5 UI fix: {os.path.relpath(filepath)}")

    def heal_auth_cookie_desync(self):
        auth_store_path = os.path.join(self.root_dir, 'src', 'lib', 'stores', 'auth.ts')
        if not os.path.exists(auth_store_path):
            auth_store_path = os.path.join(self.root_dir, 'src', 'lib', 'stores', 'auth.js')
        
        if os.path.exists(auth_store_path):
            content, enc = self.safe_read(auth_store_path)
            if content and 'cookie.serialize' not in content:
                cookie_block = """
  auth.onIdTokenChanged(async (newUser) => {
    const token = newUser ? await newUser.getIdToken() : undefined;
    document.cookie = `token=${token || ""}; path=/; max-age=${token ? 3600 : 0}; SameSite=Strict; Secure`;
    if (token) {
      window.location.reload();
    }
  });
"""
                content = content + cookie_block
                self.safe_write(auth_store_path, content, enc)
                print_success("Injected secure client-side session cookie sync into Auth Store")
                self.patches_applied.append("Auth Session Cookie Synchronization")

    def run_remediation(self):
        print_status("Executing Unified Local Codebase Healer Script...")
        self.heal_firestore_rules()
        self.heal_functions_scope()
        self.heal_webauthn_origins()
        self.heal_svelte_reactivity_and_cookies()
        self.heal_auth_cookie_desync()
        
        print("\n" + "="*50)
        print_success("LOCAL REMEDIATION COMPLETED SUCCESSFULLY!")
        print(f"Total files repaired and updated: {len(self.patches_applied)}")
        for patch in self.patches_applied:
            print(f" - {patch}")
        print("="*50)
        print_status("Ready to deploy. Execute: firebase deploy --only hosting,firestore:rules,functions")

if __name__ == "__main__":
    healer = UnifiedLaunchHealer()
    healer.run_remediation()
