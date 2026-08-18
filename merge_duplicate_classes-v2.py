#!/usr/bin/env python3
import os
import re
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

def print_status(message):
    print(f"{Colors.BLUE}{Colors.BOLD}>>> {message}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}{Colors.BOLD}✔ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.WARNING}{Colors.BOLD}⚠ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.FAIL}{Colors.BOLD}✘ {message}{Colors.ENDC}")

def parse_svelte_tags(content):
    tags = []
    i = 0
    n = len(content)
    while i < n:
        if content[i] == '<':
            # Check if it's a closing tag or a Svelte block or comment
            if i + 1 < n and (content[i+1] in ['#', '/', '@', ':', '!', ' ']):
                i += 1
                continue
            
            # Check if it is a valid tag name start
            tag_name_match = re.match(r'^<([a-zA-Z0-9:-]+)', content[i:])
            if not tag_name_match:
                i += 1
                continue
            
            tag_name = tag_name_match.group(1)
            start_idx = i
            i += len(tag_name) + 1 # skip '<' + tag_name
            
            in_double_quote = False
            in_single_quote = False
            brace_depth = 0
            tag_ended = False
            
            while i < n:
                char = content[i]
                if char == '"' and not in_single_quote:
                    in_double_quote = not in_double_quote
                elif char == "'" and not in_double_quote:
                    in_single_quote = not in_single_quote
                elif char == '{' and not in_double_quote and not in_single_quote:
                    brace_depth += 1
                elif char == '}' and not in_double_quote and not in_single_quote:
                    brace_depth = max(0, brace_depth - 1)
                elif char == '>' and not in_double_quote and not in_single_quote and brace_depth == 0:
                    end_idx = i
                    tag_ended = True
                    break
                i += 1
            
            if tag_ended:
                tags.append((start_idx, end_idx + 1, tag_name))
                i = end_idx
        else:
            i += 1
    return tags

def merge_duplicate_classes_in_tag(tag_content):
    class_attr_pattern = re.compile(r'\bclass=["\']([^"\']*)["\']')
    class_matches = class_attr_pattern.findall(tag_content)
    
    if len(class_matches) <= 1:
        return tag_content, False
        
    merged_classes = []
    for class_str in class_matches:
        for cls in class_str.split():
            if cls not in merged_classes:
                merged_classes.append(cls)
                
    merged_class_value = " ".join(merged_classes)
    stripped_content = class_attr_pattern.sub('', tag_content)
    
    tag_name_match = re.match(r'^<([a-zA-Z0-9:-]+)', tag_content)
    if not tag_name_match:
        return tag_content, False
    tag_name = tag_name_match.group(1)
    
    inner_body = stripped_content[len(tag_name)+1 : -1].strip()
    inner_body = re.sub(r'\s+', ' ', inner_body)
    
    new_tag_content = f'<{tag_name} class="{merged_class_value}"'
    if inner_body:
        new_tag_content += f' {inner_body}'
    new_tag_content += '>'
    
    return new_tag_content, True

def process_file_content(content):
    tags = parse_svelte_tags(content)
    if not tags:
        return content, 0
        
    healed_count = 0
    modified_content = content
    for start, end, name in reversed(tags):
        tag_content = content[start:end]
        new_tag_content, merged = merge_duplicate_classes_in_tag(tag_content)
        if merged:
            modified_content = modified_content[:start] + new_tag_content + modified_content[end:]
            healed_count += 1
            
    return modified_content, healed_count

def find_repo_root():
    # Automatically locate the repository root containing src/ or package.json
    curr = Path.cwd().resolve()
    for _ in range(10):
        if (curr / "package.json").exists() or (curr / "src").exists():
            return curr
        if curr.parent == curr:
            break
        curr = curr.parent
    return Path.cwd().resolve()

def main():
    print_status("SSTracker Global Svelte Attribute Healing Engine (v2.0)")
    print("This utility recursively audits Svelte templates to find and resolve duplicate 'class' attributes.")
    print("Specifically optimized to bypass Svelte comparisons (like disabled={count > 5}) and quote inclusions.\n")
    
    repo_root = find_repo_root()
    print_status(f"Repository Root Located: {repo_root}")
    print_status(f"Starting recursive sweep inside: {repo_root / 'src' if (repo_root / 'src').exists() else repo_root}")
    
    ignore_dirs = {".git", "node_modules", "dist", ".svelte-kit", "static", ".agents", "audit-artifacts", "recordings"}
    patched_files = 0
    total_tags_healed = 0
    scanned_files_count = 0
    
    target_dir = repo_root / "src" if (repo_root / "src").exists() else repo_root
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if not file.endswith(".svelte"):
                continue
            
            scanned_files_count += 1
            file_path = Path(root) / file
            try:
                # Read content safely
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                
                healed_content, tags_count = process_file_content(content)
                
                if tags_count > 0:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(healed_content)
                    print_success(f"Healed {tags_count} duplicate class attribute(s) in: {file_path.relative_to(repo_root)}")
                    patched_files += 1
                    total_tags_healed += tags_count
                    
            except Exception as e:
                print_error(f"Failed to scan/patch file {file_path}: {e}")
                
    print("\n" + "="*60)
    print_status(f"Total Svelte files scanned: {scanned_files_count}")
    if patched_files > 0:
        print_success(f"Remediation Complete! Successfully healed {total_tags_healed} duplicate tag(s) across {patched_files} Svelte file(s).")
    else:
        print_warning("No duplicate class attributes detected. Your markup is completely unique and compliant!")
    print("Run Svelte type-checking and a production build test to verify:")
    print(f"  {Colors.BOLD}pnpm run check && pnpm run build{Colors.ENDC}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
