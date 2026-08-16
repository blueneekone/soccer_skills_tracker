#!/usr/bin/env python3
import os
import json
import sys
import urllib.request
import urllib.error

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93'
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
    except Exception:
        return None

def main():
    print_status("SSTracker Advanced Workflow Orchestrator [v2] Initializing...", Colors.HEADER)
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
        print_error("No workflow files detected.")
        sys.exit(1)
        
    print_success(f"Detected {total_found} active launch workflows in your directories!")
    
    # 3. Filtering Mode
    print("\n" + "="*50)
    print_status("Orchestration Routing Menu:", Colors.HEADER)
    print(" [1] Execute ALL workflows (Dangerous - Rate limit warning!)")
    print(" [2] Filter and execute workflows by keyword (e.g. 'admin', 'compliance', 'sprint-ui')")
    print(" [3] Exit")
    
    mode = input(f"\n{Colors.BOLD}Select Orchestration Mode (1/2/3): {Colors.ENDC}").strip()
    if mode == '3':
        print_warning("Execution aborted.")
        sys.exit(0)
    elif mode == '2':
        keyword = input(f"{Colors.BOLD}Enter keyword to filter filenames (case-insensitive): {Colors.ENDC}").strip().lower()
        workflows = [w for w in workflows if keyword in os.path.basename(w).lower()]
        print_success(f"Filtered down to {len(workflows)} active target workflows.")
        if not workflows:
            print_error("No workflows matched the keyword.")
            sys.exit(1)
            
    # 4. Limit verification
    print("\n" + "="*50)
    print_status("Determining Concurrency Bounds:", Colors.HEADER)
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
    
    if len(workflows) > concurrency_limit:
        print_warning(f"Your target pool ({len(workflows)} tasks) exceeds your active concurrent limit ({concurrency_limit} tasks)!")
        print("We will batch execution. The orchestrator will trigger the first batch and provide tracking links.")
        
    print("\n" + "="*50)
    confirm = input(f"{Colors.BOLD}Authorize the execution of these {len(workflows)} workflows? (y/n): {Colors.ENDC}").strip().lower()
    if confirm != 'y':
        print_warning("Execution cancelled.")
        sys.exit(0)
        
    print("\n" + "="*50)
    print_status("Spawning Batched Google Cloud VM Sessions...", Colors.HEADER)
    
    triggered_count = 0
    failed_count = 0
    
    for i, w in enumerate(workflows):
        # Enforce local batch pacing warning to prevent connection exhaustion
        if triggered_count >= concurrency_limit:
            print_warning(f"\n⚠ Concurrency limit reached ({concurrency_limit}). Batching remains active.")
            print(f"Skipping remaining {len(workflows) - i} tasks to prevent Google API rate-limiting crashes.")
            break
            
        name, _ = parse_frontmatter(w)
        try:
            with open(w, 'r', encoding='utf-8') as f:
                content = f.read()
            rel_path = os.path.relpath(w)
            
            print_status(f"[{i+1}/{len(workflows)}] Provisioning isolated Cloud VM for: {name}...")
            session_id = trigger_jules_session(api_key, repo_id, name, rel_path, content, branch)
            
            if session_id:
                print_success(f"   - VM Booted Successfully. Session ID: {session_id}")
                print(f"   - Track: https://jules.google.com/session/{session_id}")
                triggered_count += 1
            else:
                print_error(f"   - Failed to launch session. (API rejection or rate limit)")
                failed_count += 1
        except Exception as e:
            print_error(f"   - Read/API Error: {e}")
            failed_count += 1
        print("-" * 50)
        
    print("\n" + "="*50)
    if triggered_count > 0:
        print_success(f"Orchestration cycle complete! Launched {triggered_count} concurrent cloud pipelines.")
        if failed_count > 0:
            print_warning(f"Note: {failed_count} VM launches were rejected or failed.")
        print("Breathe easy, CEO. Your parallel workflows are being executed by Google Jules in the cloud.")
    else:
        print_error("Failed to initialize any active cloud sessions. Please check your API key and repository links.")

if __name__ == "__main__":
    main()
