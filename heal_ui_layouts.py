#!/usr/bin/env python3
import os
import re
import pathlib

# Unified UI Styles & Tokens Mapping
DATA_CYAN = "#14b8a6"
ACTION_GOLD = "#fbbf24"
ATOMPUNK_AMBER = "#f59e0b"
STRUCTURAL_GREY = "#334155"
NAVY_SLATE = "#0f172a"
VOID_BLACK = "#000000"

# Anti-Squish Grid Template
ANTI_SQUISH_STYLE = 'style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"'

# Atompunk Chamfered Clip Path for Parent OS
ATOMPUNK_CLIP_PATH = 'style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"'

def print_status(msg):
    print(f"\033[94m>>> {msg}\033[0m")

def print_success(msg):
    print(f"\033[92m✔ {msg}\033[0m")

def heal_admin_dashboard():
    print_status("Auditing and healing Admin OS UI/UX layout...")
    # Targets for Admin UI Overview & Dashboards
    admin_root = pathlib.Path("src/routes/(app)/admin")
    if not admin_root.exists():
        print_status("Admin directory not found locally. Skipping local Admin file manipulation.")
        return

    for page in admin_root.glob("**/+page.svelte"):
        content = page.read_text(encoding="utf-8")
        original = content

        # 1. Enforce Anti-Squish Math on KPI and Threat Matrix grids
        # Locate grid wrappers and replace with clamp() styling
        content = re.sub(
            r'class="[^"]*tw-grid[^"]*"(?!.*grid-template-columns)',
            f'class="tw-grid" {ANTI_SQUISH_STYLE}',
            content
        )

        # 2. Swap out "Nuclear Yellow" (#daff0a) for Data Cyan (#14b8a6) or Action Gold (#fbbf24)
        content = content.replace("tw-text-[#daff0a]", f"tw-text-[{DATA_CYAN}]")
        content = content.replace("tw-bg-[#daff0a]", f"tw-bg-[{ACTION_GOLD}]")
        content = content.replace("tw-border-[#daff0a]", f"tw-border-[{DATA_CYAN}]")

        # 3. Standardize Data Tables (Edge-to-Edge, Structural Grey borders, Geist Mono stats)
        # Wrap tables in Z2 panels with Structural Grey borders
        if "<table" in content and "tw-border" not in content:
            content = content.replace(
                "<table",
                f'<div class="tw-border tw-border-slate-800 tw-bg-[{NAVY_SLATE}] tw-p-4 tw-min-w-0" style="border-color: {STRUCTURAL_GREY};"><table class="tw-w-full tw-font-mono"'
            )
            content = content.replace("</table>", "</table></div>")

        if content != original:
            page.write_text(content, encoding="utf-8")
            print_success(f"Healed layout parameters in {page.relative_to(os.getcwd())}")

def heal_parent_dashboard():
    print_status("Auditing and healing Parent OS UI/UX layout...")
    parent_root = pathlib.Path("src/routes/(app)/parent")
    if not parent_root.exists():
        print_status("Parent directory not found locally. Skipping local Parent file manipulation.")
        return

    for page in parent_root.glob("**/+page.svelte"):
        content = page.read_text(encoding="utf-8")
        original = content

        # 1. Purge Zombie Firebase SDK imports that bypass B815 Hydration
        content = re.sub(
            r"import\s+.*?(doc|onSnapshot).*?\s+from\s+['\"]firebase/firestore['\"];?",
            "",
            content,
            flags=re.MULTILINE
        )

        # 2. Enforce Atompunk Chamfered Clip Paths on panels instead of rounded classes
        content = re.sub(
            r'class="[^"]*tw-rounded-(?:premium|24px|lg|md)[^"]*"',
            f'class="tw-min-w-0" {ATOMPUNK_CLIP_PATH}',
            content
        )

        # 3. Restructure lockout display with Atompunk Amber token for the 15-minute countdown
        if "lockout" in content or "countdown" in content or "timer" in content:
            content = re.sub(
                r'class="[^"]*text-(?:red|yellow)-\d+[^"]*"',
                f'class="tw-font-mono tw-text-[{ATOMPUNK_AMBER}]"',
                content
            )

        # 4. Remove lingering raw yellow classes
        content = content.replace("tw-text-[#daff0a]", f"tw-text-[{ATOMPUNK_AMBER}]")
        content = content.replace("tw-bg-[#daff0a]", f"tw-bg-[{ATOMPUNK_AMBER}]")

        if content != original:
            page.write_text(content, encoding="utf-8")
            print_success(f"Healed layout parameters in {page.relative_to(os.getcwd())}")

if __name__ == "__main__":
    print_status("SSTracker Automated UI/UX Healer Booting Up...")
    heal_admin_dashboard()
    heal_parent_dashboard()
    print_success("UI/UX layout corrections successfully finalized locally!")
