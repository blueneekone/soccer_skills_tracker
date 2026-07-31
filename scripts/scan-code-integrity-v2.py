#!/usr/bin/env python3
import os
import re
import sys

# Folders to completely ignore during the structural scan
IGNORE_FOLDERS = {
    'node_modules', 
    '.svelte-kit', 
    '.firebase', 
    '.git', 
    '.github',
    'dist', 
    'build', 
    '.cache', 
    'audit-artifacts', 
    'marketing'
}

# File extensions that contain developer-authored logic/markup
TARGET_EXTENSIONS = {'.svelte', '.ts', '.js', '.jsx', '.tsx', '.cjs', '.mjs'}

# Regex patterns for codebase violations (gating proxy template hacks and skipped tests)
VIOLATIONS = {
    'fake_template_comment': re.compile(r'<!--\s*(HUD|Arena|Shell|Brain|Bounty|Bento|War\s*Room)\s*-->', re.IGNORECASE),
    'bypassed_test': re.compile(r'\bit\.skip\b|\bdescribe\.skip\b|\btest\.skip\b'),
}

def scan_directory(root_dir):
    print("🚀 Initializing codebase integrity scan...")
    print(f"Skipping dependency & build directories: {', '.join(sorted(IGNORE_FOLDERS))}\n")
    
    total_files_scanned = 0
    total_violations = 0
    violations_found = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prune ignored folders in-place so os.walk does not traverse or index them
        dirnames[:] = [d for d in dirnames if d not in IGNORE_FOLDERS]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1]
            if ext not in TARGET_EXTENSIONS:
                continue
                
            file_path = os.path.join(dirpath, filename)
            total_files_scanned += 1
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                # Scan for each structured violation type
                for name, pattern in VIOLATIONS.items():
                    if pattern.search(content):
                        lines = content.splitlines()
                        for i, line in enumerate(lines):
                            if pattern.search(line):
                                total_violations += 1
                                violations_found.append({
                                    'file': file_path,
                                    'line_num': i + 1,
                                    'type': name,
                                    'snippet': line.strip()
                                })
            except Exception as e:
                # Silently skip unreadable files or lockups
                pass

    print(f"Scan complete. Scanned {total_files_scanned} user-authored files.")
    if total_violations > 0:
        print(f"🛑 Found {total_violations} code integrity violations:\n")
        # List up to first 50 violations cleanly without flooding
        for violation in violations_found[:50]:
            print(f"  [{violation['type'].upper()}] {violation['file']}:{violation['line_num']}")
            print(f"    Line: {violation['snippet']}")
        if len(violations_found) > 50:
            print(f"\n  ...and {len(violations_found) - 50} more. Filter your directories or resolve local bypass flags.")
    else:
        print("🟢 No code integrity violations found! Your authored codebase conforms perfectly to strict guidelines.")
        
    return total_violations

if __name__ == '__main__':
    # Execute scan from local current working directory
    violations = scan_directory('.')
    if violations > 0:
        sys.exit(1)
    sys.exit(0)