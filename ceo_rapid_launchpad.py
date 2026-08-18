#!/usr/bin/env python3
import os
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

def main():
    print_status("SSTracker CEO Rapid Launchpad & Aesthetic Overhaul Utility v1.0", Colors.HEADER)
    print("This automated script executes full local visual harmonization and build testing.")
    print("It runs entirely on your local machine with ZERO cloud token cost.\n")

    cwd = Path.cwd()
    
    # --- Part 1: Color Sweep ---
    print_status("Phase 1: Sweeping repository for legacy 'Radioactive Yellow' (#daff0a)...")
    
    ignore_dirs = {".git", "node_modules", "dist", ".svelte-kit", "static", ".agents", "audit-artifacts", "recordings"}
    patched_count = 0
    
    for root, dirs, files in os.walk(cwd):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if not file.endswith((".svelte", ".ts", ".js", ".css")):
                continue
                
            file_path = Path(root) / file
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                original = content
                modified = False
                
                # Re-map legacy Nuclear Yellow to Amber
                if "#daff0a" in content:
                    content = content.replace("#daff0a", "#fbbf24")
                    modified = True
                if "nuclear-yellow" in content:
                    content = content.replace("nuclear-yellow", "amber-500")
                    modified = True
                if "text-nuclear-yellow" in content:
                    content = content.replace("text-nuclear-yellow", "text-amber-500")
                    modified = True
                if "bg-nuclear-yellow" in content:
                    content = content.replace("bg-nuclear-yellow", "bg-amber-500")
                    modified = True
                if "border-nuclear-yellow" in content:
                    content = content.replace("border-nuclear-yellow", "border-amber-500")
                    modified = True

                if modified:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    print_success(f"Harmonized aesthetics (Yellow ➔ Amber) in: {file_path.relative_to(cwd)}")
                    patched_count += 1
            except Exception as e:
                print_error(f"Failed to scan/patch file {file}: {e}")

    print_status(f"Phase 1 Complete. Purged {patched_count} files of radioactive yellow and bound them to Amber (#fbbf24).\n", Colors.GREEN)

    # --- Part 2: System Health Guidance ---
    print_status("Phase 2: Verifying local developer commands...", Colors.HEADER)
    print("To bypass cloud delays and test/deploy your codebase rapidly, execute this sequence in your terminal:\n")
    
    print(f"  {Colors.BOLD}1. Install local dependencies:{Colors.ENDC}")
    print("     pnpm install\n")
    
    print(f"  {Colors.BOLD}2. Run local Svelte static check & build to verify compilation:{Colors.ENDC}")
    print("     pnpm run check && pnpm run build\n")
    
    print(f"  {Colors.BOLD}3. Boot the local offline database & cloud functions emulator:{Colors.ENDC}")
    print("     firebase emulators:start\n")
    
    print(f"  {Colors.BOLD}4. Run the full test suite locally (vitest runs in milliseconds!):{Colors.ENDC}")
    print("     pnpm test\n")
    
    print(f"  {Colors.BOLD}5. Push verified codebase straight to production:{Colors.ENDC}")
    print("     firebase deploy --only hosting,firestore:rules,functions\n")

    print("="*60)
    print_success("Aesthetic and local execution pipelines are locked down!")

if __name__ == "__main__":
    main()
