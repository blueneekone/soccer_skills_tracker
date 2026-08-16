#!/usr/bin/env python3
import os
import sys

def swap_colors_to_amber(directory):
    print(">>> Starting Visual Color Migration: Nuclear Yellow -> Atompunk Amber...")
    
    # Target color codes:
    # Old: #daff0a (Nuclear Yellow/Lime)
    # New: #fbbf24 (Action Gold / Amber) or #f59e0b (Atompunk Amber)
    # Let's standardize on #fbbf24 for primary dashboard items and #f59e0b for warning/lockout highlights.
    
    replacements = {
        "#daff0a": "#fbbf24",
        "nuclear-yellow": "amber-500",
        "text-nuclear-yellow": "text-amber-400",
        "bg-nuclear-yellow": "bg-amber-400",
        "border-nuclear-yellow": "border-amber-400",
        "shadow-neon-nuclear": "shadow-neon-amber"
    }
    
    modified_files = 0
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules, .git, and .svelte-kit directories
        if any(skip in root for skip in ["node_modules", ".git", ".svelte-kit"]):
            continue
            
        for file in files:
            if file.endswith((".svelte", ".ts", ".js", ".css")):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    original_content = content
                    for old_val, new_val in replacements.items():
                        content = content.replace(old_val, new_val)
                    
                    if content != original_content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(content)
                        print(f"✔ Standardized visual theme: {os.path.relpath(file_path)}")
                        modified_files += 1
                except Exception as e:
                    # Fail silently or print non-blocking warning
                    pass

    print(f"\n✔ Visual Migration Complete. Updated {modified_files} files to Amber theme.")

if __name__ == "__main__":
    # Scan from current working directory
    target_dir = os.getcwd()
    swap_colors_to_amber(target_dir)
