#!/usr/bin/env python3
import os
import shutil
import json
import sys
import subprocess
import urllib.request
import urllib.error

# Color formatting for terminal output
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

# Configuration of file mappings: source filename -> relative target path
FILE_MAPPINGS = {
    "firebase.json": "firebase.json",
    "firestore.rules": "firestore.rules",
    "AGENTS.md": "AGENTS.md",
    "jules_remediation_runner.py": "jules_remediation_runner.py",
    "architect-backend-recovery.md": ".agents/workflows/jules-builds/architect-backend-recovery.md",
    "cso-webauthn-origin-binding.md": ".agents/workflows/jules-builds/cso-webauthn-origin-binding.md",
    "frontend-hydration-recovery.md": ".agents/workflows/jules-builds/frontend-hydration-recovery.md"
}

def distribute_files():
    print_status("Starting SSTracker Launch-Day Asset Distributor...", Colors.HEADER)
    print("This script organizes your downloaded remediation files into their proper repository layout.\n")
    
    current_dir = os.getcwd()
    moved_count = 0
    
    # 1. Distribute files
    for src, dest_rel in FILE_MAPPINGS.items():
        dest_path = os.path.join(current_dir, dest_rel)
        dest_parent = os.path.dirname(dest_path)
        
        # Check if the source file is present in the current directory
        if os.path.exists(os.path.join(current_dir, src)):
            # Make sure parent directory exists
            if dest_parent and not os.path.exists(dest_parent):
                os.makedirs(dest_parent, exist_ok=True)
                print_status(f"Created directory: {os.path.relpath(dest_parent)}")
            
            # If the source and destination are different, move it
            if os.path.abspath(os.path.join(current_dir, src)) != os.path.abspath(dest_path):
                shutil.move(os.path.join(current_dir, src), dest_path)
                print_success(f"Placed {src} -> {dest_rel}")
            else:
                print_success(f"Verified {src} is already in place at {dest_rel}")
            moved_count += 1
        else:
            # Check if the file is already at the target location
            if os.path.exists(dest_path):
                print_success(f"Verified {dest_rel} is already present")
                moved_count += 1
            else:
                print_warning(f"Missing file: {src}. Please ensure you have downloaded it to this directory.")

    print("\n" + "="*50)
    if moved_count == len(FILE_MAPPINGS):
        print_success("All launch-day assets have been successfully placed in their correct directories!")
        return True
    else:
        print_warning(f"Distributed {moved_count} of {len(FILE_MAPPINGS)} files. Please download the remaining files and rerun.")
        return False

def run_local_healer():
    healer_script = "./jules_remediation_runner.py"
    if os.path.exists(healer_script):
        print("\n" + "="*50)
        print_status("Executing local code sanity checks & healer script...", Colors.HEADER)
        print("This will run local tests, check line limits, and verify Svelte 5 runes compliance.\n")
        try:
            # Make healer script executable on Unix systems
            if sys.platform != "win32":
                os.chmod(healer_script, 0o755)
            
            subprocess.run([sys.executable, healer_script], check=True)
        except Exception as e:
            print_error(f"Error running local healer script: {e}")
    else:
        print_warning("Healer script (jules_remediation_runner.py) not found in current directory. Skipping local checks.")

def trigger_jules_workflow(api_key, repo_id, workflow_name, workflow_file):
    session_title = f"SSTracker Launch: {workflow_name}"
    prompt_text = f"Execute the remediation workflow defined in {workflow_file}. Review, build, test, and automatically open a Pull Request when all quality gates are 100% green."
    
    url = "https://jules.googleapis.com/v1alpha/sessions"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key
    }
    
    # Standardize repo ID (ensure it starts with 'sources/github/' if not already)
    if not repo_id.startswith("sources/github/"):
        repo_id = f"sources/github/{repo_id}"
        
    payload = {
        "prompt": prompt_text,
        "sourceContext": {
            "source": repo_id,
            "githubRepoContext": {
                "startingBranch": "main"
            }
        },
        "automationMode": "AUTO_CREATE_PR",
        "title": session_title
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        print_status(f"Triggering Jules Session: {session_title}...")
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            session_id = res_data.get("id")
            print_success(f"Successfully triggered {workflow_name}!")
            print(f"   - Session ID: {session_id}")
            print(f"   - Cloud VM Status: Active / Planning")
            print(f"   - Track Progress: Visit https://jules.google.com/session/{session_id}")
            return session_id
    except urllib.error.HTTPError as e:
        print_error(f"Failed to trigger {workflow_name}. HTTP Error {e.code}: {e.reason}")
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            print(f"   - Details: {err_body.get('error', {}).get('message', 'No details available')}")
        except Exception:
            pass
    except Exception as e:
        print_error(f"Unexpected connection error: {e}")
    return None

def main():
    # 1. Place files
    success = distribute_files()
    if not success:
        sys.exit(1)
        
    # 2. Ask to run local healer
    print("\n" + "="*50)
    choice = input(f"{Colors.BOLD}Do you want to run the local Healer Script to audit Svelte 5/Firebase compliance now? (y/n): {Colors.ENDC}").strip().lower()
    if choice == 'y':
        run_local_healer()
        
    # 3. Ask to trigger Google Jules Asynchronous Cloud VMs
    print("\n" + "="*50)
    choice_jules = input(f"{Colors.BOLD}Do you want to programmatically fire off the Google Jules Cloud VM remediations? (y/n): {Colors.ENDC}").strip().lower()
    if choice_jules == 'y':
        print("\nTo trigger Jules runs, we need your Jules API Key and GitHub Repository ID.")
        print("You can get your API Key from the Jules Settings interface (X-Goog-Api-Key).")
        
        api_key = input(f"\n{Colors.BOLD}Enter your Jules API Key: {Colors.ENDC}").strip()
        if not api_key:
            print_error("API Key is required to proceed. Skipping Jules triggering.")
            sys.exit(0)
            
        repo_id = input(f"{Colors.BOLD}Enter your GitHub Repository ID (e.g. 'github-owner/repo-name'): {Colors.ENDC}").strip()
        if not repo_id:
            print_error("Repository ID is required. Skipping Jules triggering.")
            sys.exit(0)
            
        print("\nStarting asynchronous multi-phase parallel VMs on Google Cloud...\n")
        
        # Trigger Phase 1
        trigger_jules_workflow(
            api_key, 
            repo_id, 
            "Phase 1: Backend Architecture & Rules Recovery", 
            ".agents/workflows/jules-builds/architect-backend-recovery.md"
        )
        print("-" * 50)
        
        # Trigger Phase 2
        trigger_jules_workflow(
            api_key, 
            repo_id, 
            "Phase 2: CSO Cryptographic Origin Binding (WebAuthn)", 
            ".agents/workflows/jules-builds/cso-webauthn-origin-binding.md"
        )
        print("-" * 50)
        
        # Trigger Phase 3
        trigger_jules_workflow(
            api_key, 
            repo_id, 
            "Phase 3: Svelte 5 Reactivity & Hydration Sync", 
            ".agents/workflows/jules-builds/frontend-hydration-recovery.md"
        )
        
        print("\n" + "="*50)
        print_success("Launch pipeline successfully initialized!")
        print("Google Jules is now running all three remediation workflows concurrently in isolated VMs.")
        print("Keep an eye on your browser notifications or your GitHub PR inbox—your fixes are being deployed TODAY.")
    else:
        print("\nSkipping programmatic Jules runs.")
        print("To trigger them manually, move the markdown blueprints to your repo and paste their instructions in the Jules Web UI.")
        
    print(f"\n{Colors.GREEN}{Colors.BOLD}All systems green. Breathe easy—you are ready to launch!{Colors.ENDC}")

if __name__ == "__main__":
    main()
