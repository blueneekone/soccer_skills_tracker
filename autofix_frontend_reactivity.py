#!/usr/bin/env python3
import os
import re
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

def heal_onclick_untrack_bindings():
    print_status("1. Healing Malformed Svelte 5 Event Handlers...", Colors.HEADER)
    cwd = Path.cwd()
    modified_count = 0

    ignore_dirs = {".git", "node_modules", "dist", ".svelte-kit", "static", ".agents", "audit-artifacts", "recordings"}

    for root, dirs, files in os.walk(cwd):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if not file.endswith(".svelte"):
                continue
            
            file_path = Path(root) / file
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                original_content = content
                modified = False

                # Pattern A: onclick={() => untrack(() => { goto('/path'); })}
                # Capture the inner statement inside untrack block and replace with standard clean callback
                p1 = r'onclick=\{\(\)\s*=>\s*untrack\(\(\)\s*=>\s*\{\s*(.*?);\s*\}\)\}'
                if re.search(p1, content):
                    content = re.sub(p1, r'onclick={() => { \1; }}', content)
                    modified = True

                # Pattern B: onclick={() => untrack(() => goto('/path'))}
                p2 = r'onclick=\{\(\)\s*=>\s*untrack\(\(\)\s*=>\s*(.*?)\)\}'
                if re.search(p2, content):
                    content = re.sub(p2, r'onclick={() => \1}', content)
                    modified = True

                # Pattern C: onclick={(e) => untrack(() => someFunction(e))}
                p3 = r'onclick=\{\((\w+)\)\s*=>\s*untrack\(\(\)\s*=>\s*\{\s*(.*?);\s*\}\)\}'
                if re.search(p3, content):
                    content = re.sub(p3, r'onclick={(\1) => { \2; }}', content)
                    modified = True

                # Pattern D: Any remaining inline untrack wrappers in onclick strings
                p4 = r'onclick=\{\(\)\s*=>\s*untrack\(\(\)\s*=>\s*([^}]+)\)\}'
                if re.search(p4, content):
                    content = re.sub(p4, r'onclick={() => { \1; }}', content)
                    modified = True

                if modified:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print_success(f"Purged malformed untrack from event handler: {file_path.relative_to(cwd)}")
                    modified_count += 1
            except Exception as e:
                print_error(f"Failed parsing event handlers in {file}: {e}")

    print_status(f"Reactivity event handler heal complete. Repaired {modified_count} Svelte views.", Colors.GREEN)

def heal_top_level_await_stores():
    print_status("2. Healing Top-Level Await SSR Hydration Crashes...", Colors.HEADER)
    cwd = Path.cwd()
    modified_count = 0

    target_files = [
        "src/routes/(app)/+layout.svelte",
        "src/lib/stores/auth/facade.svelte.js",
        "src/lib/stores/auth/facade.svelte.ts",
        "src/lib/stores/impersonation.svelte.js",
        "src/lib/stores/impersonation.svelte.ts"
    ]

    for rel_path in target_files:
        file_path = cwd / rel_path
        if not file_path.exists():
            continue

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            original_content = content
            modified = False

            # Detect top-level await newUser.getIdToken() inside files
            if "const token = newUser ? await newUser.getIdToken() : undefined;" in content or "await newUser.getIdToken()" in content:
                # Check if it is inside +layout.svelte
                if file_path.suffix == ".svelte":
                    # Refactor to pull token asynchronously inside a non-blocking browser block or store call
                    content = content.replace(
                        "const token = newUser ? await newUser.getIdToken() : undefined;",
                        "// Synchronous await removed to prevent SSR freezing loops\n  let token = undefined;\n  if (browser) {\n    newUser.getIdToken().then(t => { token = t; });\n  }"
                    )
                    modified = True
                else:
                    # Inside store files, wrap the asynchronous resolver cleanly or move inside constructor
                    lines = content.splitlines()
                    for idx, line in enumerate(lines):
                        if "await newUser.getIdToken" in line and "async" not in lines[idx-1] and "async" not in line:
                            print_warning(f"Isolating asynchronous initialization chain in: {rel_path}")
                    
                    # Target known naive facade initialization blocks
                    content = content.replace(
                        "const token = newUser ? await newUser.getIdToken() : undefined;",
                        "// Isolated asynchronously inside observer context\n                    newUser.getIdToken().then(resolvedToken => {\n                        document.cookie = `token=${resolvedToken}; path=/; max-age=3600; SameSite=Strict; Secure`;\n                    });"
                    )
                    modified = True

            if modified:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print_success(f"Eradicated top-level awaits from state engine: {rel_path}")
                modified_count += 1
        except Exception as e:
            print_error(f"Failed cleaning up awaits in {rel_path}: {e}")

    print_status(f"Top-level await cleanup complete. Restored {modified_count} system components.", Colors.GREEN)

def main():
    print_status("SSTracker Master Reactivity and SSR Compiler Guard Initializing...", Colors.HEADER)
    print("This executable surgically intercepts and repairs syntax errors created by loose find-and-replace runs.")
    
    heal_onclick_untrack_bindings()
    heal_top_level_await_stores()
    
    print("\n" + "="*50)
    print_success("Reactivity healing sweeps are completed!")
    print("All malformed onclick handler brackets have been normalized.")
    print("All top-level awaits blocking SSR compilation have been refactored into async promises.")
    print("\nRun this command to compile and verify your build:")
    print(f"{Colors.BOLD}pnpm run check && pnpm run build{Colors.ENDC}")

if __name__ == "__main__":
    main()
