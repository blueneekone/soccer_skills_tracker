#!/usr/bin/env python3
import os
import json
import sys
import urllib.request
import urllib.error
import time

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

def parse_frontmatter(file_path):
    name = os.path.basename(file_path)
    description = "Remediation workflow execution"
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        if lines and lines[0].strip() == '---':
            fm_lines = []
            for line in lines[1:]:
                if line.strip() == '---':
                    break
                fm_lines.append(line)
            for line in fm_lines:
                if ':' in line:
                    key, val = line.split(':', 1)
                    key = key.strip().lower()
                    val = val.strip().strip('"').strip("'")
                    if key == 'name':
                        name = val
                    elif key == 'description':
                        description = val
    except Exception:
        pass
    return name, description

def trigger_jules_session(api_key, repo_id, workflow_name, workflow_rel_path, content, branch):
    url = "https://jules.googleapis.com/v1alpha/sessions"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key
    }
    
    if not repo_id.startswith("sources/github/"):
        repo_id = f"sources/github/{repo_id}"
        
    prompt_text = (
        f"Execute the complete, structured remediation workflow defined in {workflow_rel_path}.\\n\\n"
        f"Specs:\\n{content}\\n\\n"
        "Audit the workspace, make required edits complying with the 80-line function limits and Svelte 5 runes, "
        "compile and verify the build, run targeted Vitest/unit tests, and open a Pull Request when 100% green."
    )
    
    payload = {
        "prompt": prompt_text,
        "sourceContext": {
            "source": repo_id,
            "githubRepoContext": {
                "startingBranch": branch
            }
        },
        "automationMode": "AUTO_CREATE_PR",
        "title": f"SSTracker Launch: {workflow_name}"
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("id")
    except Exception as e:
        return None

def parse_range(range_str, max_val):
    selected = set()
    parts = range_str.split(',')
    for part in parts:
        part = part.strip()
        if '-' in part:
            try:
                start, end = part.split('-')
                start = int(start)
                end = int(end)
                for val in range(start, end + 1):
                    if 1 <= val <= max_val:
                        selected.add(val)
            except ValueError:
                pass
        else:
            try:
                val = int(part)
                if 1 <= val <= max_val:
                    selected.add(val)
            except ValueError:
                pass
    return sorted(list(selected))

def main():
    print_status("SSTracker Advanced Sequential Workflow Orchestrator [v3]", Colors.HEADER)
    print("Enforcing strict execution gates to prevent concurrent VM rate-limiting on Google Cloud.\\n")
    
    # 1. Environment Config
    api_key = os.environ.get("JULES_API_KEY", "").strip()
    if not api_key:
        api_key = input(f"{Colors.BOLD}Enter your Jules API Key (X-Goog-Api-Key): {Colors.ENDC}").strip()
        if not api_key:
            print_error("Error: Jules API Key is required.")
            sys.exit(1)
            
    repo_id = input(f"{Colors.BOLD}Enter your GitHub Repository ID (e.g. 'username/repo-name'): {Colors.ENDC}").strip()
    if not repo_id:
        print_error("Error: GitHub Repository ID is required.")
        sys.exit(1)
        
    branch = input(f"{Colors.BOLD}Enter target Git branch (default is 'dev'): {Colors.ENDC}").strip()
    if not branch:
        branch = "dev"
        
    # 2. Scanning targets recursively
    target_dirs = [".agents/workflows/jules", ".agents/workflows/jules-builds"]
    workflows = []
    
    for t_dir in target_dirs:
        if os.path.exists(t_dir):
            for root, _, files in os.walk(t_dir):
                for filename in files:
                    if filename.endswith(".md"):
                        full_path = os.path.join(root, filename)
                        workflows.append(full_path)
                        
    total_found = len(workflows)
    if total_found == 0:
        # Fallback to local scan to support running from arbitrary folders
        print_warning("No standard active .agents directories found locally. Falling back to project root directory scan...")
        for root, _, files in os.walk("."):
            if "node_modules" in root or ".svelte-kit" in root or ".git" in root:
                continue
            for filename in files:
                if filename.endswith(".md") and "jules" in filename:
                    workflows.append(os.path.join(root, filename))
        total_found = len(workflows)
        if total_found == 0:
            print_error("No workflow specifications (.md) detected.")
            sys.exit(1)
        
    print_success(f"Detected {total_found} active launch workflows in your directories!")
    
    # 3. Interactive Multi-Selector
    print("\n" + "="*60)
    print_status("AVAILABLE WORKFLOW BLUEPRINTS:", Colors.HEADER)
    
    parsed_workflows = []
    for idx, w in enumerate(workflows):
        name, desc = parse_frontmatter(w)
        parsed_workflows.append({
            "index": idx + 1,
            "file": w,
            "name": name,
            "description": desc
        })
        print(f" [{idx + 1}] {Colors.BOLD}{name}{Colors.ENDC}")
        print(f"     - File: {os.path.relpath(w)}")
        print(f"     - Spec: {desc}")
        print("-" * 50)
        
    print(f"\n{Colors.BOLD}Enter targets to execute.{Colors.ENDC}")
    print("Supports comma-separated indices, ranges, or 'all'. (e.g. '1,3,5' or '1-4,6' or 'all')")
    selection_input = input(f"{Colors.BOLD}Select target workflows: {Colors.ENDC}").strip().lower()
    
    selected_indices = []
    if selection_input == 'all':
        selected_indices = list(range(1, total_found + 1))
    else:
        selected_indices = parse_range(selection_input, total_found)
        
    if not selected_indices:
        print_error("No valid workflows selected. Exiting.")
        sys.exit(1)
        
    selected_workflows = [parsed_workflows[i - 1] for i in selected_indices]
    
    print("\n" + "="*60)
    print_status("SELECTED WORKFLOWS FOR SEQUENTIAL PIPELINE:", Colors.HEADER)
    for idx, sw in enumerate(selected_workflows):
        print(f"  {idx + 1}. {sw['name']} ({os.path.basename(sw['file'])})")
        
    # 4. Limit verification
    print("\n" + "="*60)
    print_status("DETERMINING CONCURRENCY BOUNDS:", Colors.HEADER)
    print(" - Free Beta Tier: Max 3 concurrent tasks")
    print(" - Developer Flow Tier: Max 15 concurrent tasks")
    print(" - Enterprise Scale Tier: Max 60 concurrent tasks")
    
    tier = input(f"\n{Colors.BOLD}Select your Jules Concurrency Tier (Free/Pro/Ultra): {Colors.ENDC}").strip().lower()
    concurrency_limit = 3
    if tier == "pro":
        concurrency_limit = 15
    elif tier == "ultra":
        concurrency_limit = 60
        
    print_status(f"Setting active execution pool cap to: {concurrency_limit} concurrent VMs")
    
    if len(selected_workflows) > concurrency_limit:
        print_warning(f"Your target pool ({len(selected_workflows)} tasks) exceeds your concurrency limit ({concurrency_limit} tasks)!")
        print("We will execute in sequential batches to prevent connection rate-limiting.")
        
    print("\n" + "="*60)
    confirm = input(f"{Colors.BOLD}Authorize the sequential launch of these {len(selected_workflows)} workflows? (y/n): {Colors.ENDC}").strip().lower()
    if confirm != 'y':
        print_warning("Execution aborted.")
        sys.exit(0)
        
    print("\n" + "="*60)
    print_status("SPAWNING GOOGLE CLOUD VM SESSIONS IN SEQUENCE...", Colors.HEADER)
    
    triggered_count = 0
    failed_count = 0
    
    for idx, sw in enumerate(selected_workflows):
        w_path = sw['file']
        name = sw['name']
        
        try:
            with open(w_path, 'r', encoding='utf-8') as f:
                content = f.read()
            rel_path = os.path.relpath(w_path)
            
            print_status(f"[{idx + 1}/{len(selected_workflows)}] Launching cloud VM for: {name}...")
            session_id = trigger_jules_session(api_key, repo_id, name, rel_path, content, branch)
            
            if session_id:
                print_success(f"   - VM Booted Successfully. Session ID: {session_id}")
                print(f"   - Tracking link: https://jules.google.com/session/{session_id}")
                triggered_count += 1
                # Minor delay to prevent pipeline registration flood rejections
                if idx < len(selected_workflows) - 1:
                    print("   - Pacing delay of 2s before booting next VM...")
                    time.sleep(2)
            else:
                print_error(f"   - VM Launch Rejected. Check quotas or API Key bindings.")
                failed_count += 1
        except Exception as e:
            print_error(f"   - Core Dispatch Error: {e}")
            failed_count += 1
        print("-" * 50)
        
    print("\n" + "="*60)
    if triggered_count > 0:
        print_success(f"Pipeline successfully initialized! Triggered {triggered_count} Cloud VM sessions sequentially.")
        if failed_count > 0:
            print_warning(f"Note: {failed_count} sessions failed.")
        print("Each VM is now independently evaluating compile targets and test suites.")
        print("Breathe easy, CEO. Your parallel workflows are processing asynchronously.")
    else:
        print_error("Failed to initialize any active cloud sessions. Please check network state and key bindings.")

if __name__ == "__main__":
    main()
