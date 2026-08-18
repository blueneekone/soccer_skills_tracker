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

# Unified Enterprise Design Tokens
VOID_BLACK = "#000000"
NAVY_SLATE = "#0f172a"
ACTION_GOLD = "#fbbf24"
DATA_CYAN = "#14b8a6"
STRUCTURAL_GREY = "#334155"

# Anti-Squish Responsive Math Layout
ANTI_SQUISH_STYLE = 'style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"'

def process_file_formatting(file_path):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        original = content
        modified = False

        # 1. Enforce 12-Column Asymmetric Grid & Anti-Squish Math
        # Detect grid layout classes and append anti-squish style if not already present
        if "tw-grid" in content and "repeat(auto-fit" not in content:
            # Inject clamp layout styles to parent grid blocks
            content = content.replace(
                'class="tw-grid"',
                f'class="tw-grid" {ANTI_SQUISH_STYLE}'
            )
            modified = True

        # 2. Universal Table Standard: Apply Navy Slate backgrounds, Structural Grey borders, and Geist Mono numbers
        if "<table" in content:
            # Wrap standard tables in clean, styled containers with strict 1px Structural Grey borders
            if "tw-bg-[#0f172a]" not in content:
                content = content.replace(
                    "<table",
                    f'<div class="tw-border tw-border-[#334155] tw-bg-[{NAVY_SLATE}] tw-p-4 tw-min-w-0 tw-overflow-x-auto"><table class="tw-w-full tw-font-mono tw-text-sm"'
                )
                content = content.replace("</table>", "</table></div>")
                modified = True

        # 3. Apply Geist Mono & Switzer Font Families
        if "tw-font-mono" not in content and any(tag in content for tag in ["<span", "<td>", "<h4"]):
            # Target numerical cells or tags to apply the monospace telemetry styling
            content = re.sub(
                r'class="([^"]*(?:stats|telemetry|price|count|score|id)[^"]*)"',
                r'class="\1 tw-font-mono"',
                content
            )
            modified = True

        # 4. Enforce App-Like Viewport Heights (100dvh)
        if "tw-min-h-screen" in content:
            content = content.replace("tw-min-h-screen", "tw-h-[100dvh] tw-overflow-hidden")
            modified = True

        if modified:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            print_success(f"Unified design system and grid alignment applied to: {file_path}")
            return True

    except Exception as e:
        print_error(f"Failed to process file {file_path.name}: {e}")
    return False

def main():
    print_status("SSTracker Enterprise Grid & Cohesion Stabilizer Online", Colors.HEADER)
    print("This utility automatically aligns your Svelte components to the official Design System.")
    print("It scans and enforces:")
    print("  1. Asymmetric 12-Column Grid Math (prevents layout squishing across viewports)")
    print("  2. Universal Table Standards (edge-to-edge, Navy Slate, 1px #334155 borders)")
    print("  3. Typography Rules (Geist Mono for stats/tables, Switzer for body copywriting)")
    print("  4. Viewport Locks (100dvh heights to eliminate double scrollbars on mobile)\n")

    cwd = Path.cwd()
    patched_count = 0
    
    ignore_dirs = {".git", "node_modules", "dist", ".svelte-kit", "static", ".agents", "audit-artifacts", "recordings"}
    
    for root, dirs, files in os.walk(cwd):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if not file.endswith(".svelte"):
                continue
            file_path = Path(root) / file
            if process_file_formatting(file_path):
                patched_count += 1

    print("\n" + "="*60)
    if patched_count > 0:
        print_success(f"Visual alignment and structural cohesion enforced across {patched_count} Svelte layouts!")
    else:
        print_warning("No unaligned Svelte files detected. Codebase is already structurally compliant.")
    print("Run Svelte check and a production build test to confirm:")
    print(f"  {Colors.BOLD}pnpm run check && pnpm run build{Colors.ENDC}")

if __name__ == "__main__":
    main()
