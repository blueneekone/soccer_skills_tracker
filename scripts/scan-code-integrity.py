#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path

# Color codes for terminal output
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Patterns to scan for
PATTERNS = {
    "faked_comments": {
        "regex": re.compile(r"<!--\s*(HUD|Arena|Glass|Shell|BountyRow|questTerminalCmd)\s*-->", re.IGNORECASE),
        "description": "Faked HTML comments used to bypass regex matchers",
        "severity": "CRITICAL (P0 Violation)"
    },
    "skipped_tests": {
        "regex": re.compile(r"\b(it|test|describe)\.skip\b"),
        "description": "Explicitly skipped tests",
        "severity": "WARNING (P1)"
    },
    "test_tampering_scripts": {
        "regex": re.compile(r"fix_.*\.cjs|bypass_.*\.js"),
        "description": "Leftover hacky patch/regex-replacement scripts",
        "severity": "CRITICAL (P0 Violation)"
    }
}

def scan_file(file_path):
    violations = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            for name, meta in PATTERNS.items():
                if name == "test_tampering_scripts":
                    continue  # Handled in file name scan
                for match in meta["regex"].finditer(content):
                    line_no = content.count("\n", 0, match.start()) + 1
                    matched_text = match.group(0)
                    violations.append({
                        "file": str(file_path),
                        "line": line_no,
                        "type": name,
                        "description": meta["description"],
                        "severity": meta["severity"],
                        "match": matched_text
                    })
    except Exception as e:
         pass
    return violations

def main():
    print(f"{BOLD}{CYAN}=== SSTracker Codebase Integrity Scanner ==={RESET}\n")
    
    root_dir = Path(".")
    total_violations = 0
    file_count = 0
    
    # Check for tampering script names first
    for path in root_dir.rglob("*"):
        if path.is_file():
            # Skip node_modules, .git, etc.
            if any(part in path.parts for part in ["node_modules", ".git", ".svelte-kit", "dist", "build"]):
                continue
                
            file_count += 1
            
            # File name check
            filename = path.name
            if PATTERNS["test_tampering_scripts"]["regex"].match(filename):
                total_violations += 1
                print(f"{RED}[{PATTERNS['test_tampering_scripts']['severity']}] File Name Match: '{filename}'")
                print(f"  Path: {path}")
                print(f"  Desc: {PATTERNS['test_tampering_scripts']['description']}{RESET}\n")
                
            # Content checks
            if path.suffix in [".svelte", ".ts", ".js", ".cjs", ".mjs"]:
                file_violations = scan_file(path)
                if file_violations:
                    total_violations += len(file_violations)
                    for v in file_violations:
                        color = RED if "CRITICAL" in v["severity"] else YELLOW
                        print(f"{color}[{v['severity']}] {v['description']}{RESET}")
                        print(f"  File: {v['file']}:{v['line']}")
                        print(f"  Code: {BOLD}{v['match']}{RESET}\n")
                        
    print(f"{CYAN}Scan complete. Checked {file_count} files.{RESET}")
    if total_violations > 0:
        print(f"{RED}{BOLD}ALERT: Found {total_violations} integrity violation(s). Fix these immediately to enforce the Pessimistic Definition of Done.{RESET}")
        sys.exit(1)
    else:
        print(f"{GREEN}{BOLD}SUCCESS: No code integrity violations or faked comments found! The codebase is authentically compliant.{RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main()
