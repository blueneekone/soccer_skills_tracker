#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import urllib.error
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler

# 🛰️ Google Jules REST API Auto-Healing Daemon & Webhook Listener
# Enforced by: Joint Task Force: Chief Technical Officer (CTO) & Chief Software Architect (CSA)
# Standardized on: Agent Development Kit (ADK 2.0) and Google Cloud Run [cite: 786]

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(msg):
    print(f"{Colors.BLUE}{Colors.BOLD}>>> {msg}{Colors.ENDC}")

def print_success(msg):
    print(f"{Colors.GREEN}{Colors.BOLD}✔ {msg}{Colors.ENDC}")

def print_warn(msg):
    print(f"{Colors.WARNING}{Colors.BOLD}⚠ {msg}{Colors.ENDC}")

def print_err(msg):
    print(f"{Colors.FAIL}{Colors.BOLD}✘ {msg}{Colors.ENDC}")

# Load configuration and API credentials from environment variables
JULES_API_KEY = os.getenv("JULES_API_KEY")
REPO_NAME = "soccer_skills_tracker"
API_BASE_URL = "https://jules.googleapis.com/v1alpha"

if not JULES_API_KEY:
    print_err("JULES_API_KEY environment variable is not defined.")
    print_warn("Please export your credential: export JULES_API_KEY='your_goog_api_key_here'")

# Secure header injection
HEADERS = {
    "X-Goog-Api-Key": JULES_API_KEY if JULES_API_KEY else "",
    "Content-Type": "application/json"
}

def list_connected_sources():
    """Queries connected GitHub repositories on Jules API."""
    url = f"{API_BASE_URL}/sources"
    req = urllib.request.Request(url, headers=HEADERS, method="GET")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            sources = res_data.get("sources", [])
            for src in sources:
                if REPO_NAME in src.get("name", ""):
                    return src.get("name")
            print_err(f"No connected source found matching repository: {REPO_NAME}")
    except Exception as e:
        print_err(f"Failed to fetch connected sources from Jules: {e}")
    return None

def trigger_autoheal_session(error_log, branch="dev"):
    """Submits a self-healing request to the Jules API REST gateway."""
    source_id = list_connected_sources()
    if not source_id:
        print_err("Aborting auto-heal: Unable to resolve Jules Source ID.")
        return False

    session_title = f"Auto-Heal: Build Remediation"
    prompt_text = (
        f"A deployment rollout failed in our Firebase App Hosting pipeline on branch '{branch}'.\n\n"
        f"=== RAW ERROR DIAGNOSTICS ===\n"
        f"{error_log}\n"
        f"=============================\n\n"
        f"Instructions:\n"
        f"1. Audit the error logs to identify the root cause (e.g., missing secrets, configuration mismatch, "
        f"or Svelte compilation loops).\n"
        f"2. Apply the necessary patches in functions or client code strictly adhering to our Engineering Protocols:\n"
        f"   - Keep functions under the 80-line limit.\n"
        f"   - Wrap Svelte 5 $effect mutations in untrack() closures to prevent loops.\n"
        f"   - Wrap Firestore queries in B815 Defensive Hydration guards.\n"
        f"3. Run 'pnpm run check && pnpm run build' inside the cloud container to verify.\n"
        f"4. Once tests are 100% green, automatically open a Pull Request to fix the rollout."
    )

    payload = {
        "prompt": prompt_text,
        "sourceContext": {
            "source": source_id,
            "githubRepoContext": {
                "startingBranch": branch
            }
        },
        "automationMode": "AUTO_CREATE_PR",
        "title": session_title
    }

    url = f"{API_BASE_URL}/sessions"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=HEADERS, method="POST")

    try:
        print_status(f"Connecting to Google Jules API Gateway...")
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            session_id = res_data.get("id")
            print_success(f"Successfully triggered self-healing session!")
            print(f"   - Session ID: {session_id}")
            print(f"   - Monitor Progress: Visit https://jules.google.com/session/{session_id}")
            return True
    except urllib.error.HTTPError as e:
        print_err(f"Jules API rejected payload. HTTP Error {e.code}: {e.reason}")
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            print(f"   - Error Details: {json.dumps(err_body, indent=2)}")
        except Exception:
            pass
    except Exception as e:
        print_err(f"Failed to submit auto-heal request: {e}")
    return False

# Webhook request handler to process real-time failure events
class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Mute standard HTTP logging to keep output clean
        return

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            payload = json.loads(post_data)
        except Exception:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Invalid JSON payload")
            return

        # Support Google Cloud Build or custom GitHub Webhook schemas
        error_msg = ""
        branch = "dev"

        # Check for GitHub Actions workflow failure event
        if "workflow_run" in payload:
            run = payload["workflow_run"]
            if run.get("status") == "completed" and run.get("conclusion") == "failure":
                error_msg = f"GitHub Actions Run Failed: {run.get('html_url')}\nWorkflow: {run.get('name')}"
                branch = run.get("head_branch", "dev")
        # Check for Google Cloud Build failure pub/sub payload
        elif "build" in payload:
            build = payload["build"]
            if build.get("status") == "FAILURE":
                error_msg = f"GCP Cloud Build Failed.\nBuild ID: {build.get('id')}\nLog URL: {build.get('logUrl')}"
                subst = build.get("substitutions", {})
                branch = subst.get("BRANCH_NAME", "dev")
        else:
            # Fallback to direct generic payload format: {"error": "...", "branch": "..."}
            error_msg = payload.get("error", "Unknown pipeline failure detected.")
            branch = payload.get("branch", "dev")

        if error_msg:
            print_warn(f"[{self.date_time_string()}] Detected Rollout Failure on branch '{branch}'. Booting Jules...")
            success = trigger_autoheal_session(error_msg, branch)
            if success:
                self.send_response(202)
                self.end_headers()
                self.wfile.write(b"Auto-healing loop triggered.")
                return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Event received and logged.")

def run_server(port):
    server = HTTPServer(('0.0.0.0', port), WebhookHandler)
    print_status(f"SSTracker Launch-Day Failure Watcher Active on port {port}")
    print("   - Listening for Google Cloud Build and GitHub failure webhooks...")
    print("   - Press Ctrl+C to terminate...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print_warn("\nDaemon terminated by commander.")

def main():
    parser = argparse.ArgumentParser(description="Google Jules CI/CD Auto-Healing Bridge")
    parser.add_argument("--listen", type=int, help="Run as an active webhook listener on the specified port.")
    parser.add_argument("--simulate-fail", type=str, help="Simulate a pipeline failure string and trigger Jules immediately.")
    parser.add_argument("--branch", type=str, default="dev", help="Branch name for simulated failure (default: 'dev').")

    args = parser.parse_args()

    if not JULES_API_KEY:
        print_err("JULES_API_KEY must be defined in your environment before running.")
        sys.exit(1)

    print_status("SSTracker Launch-Ready Auto-Healer Daemon v2.0")

    if args.listen:
        run_server(args.listen)
    elif args.simulate_fail:
        print_status(f"Simulating rollout failure on branch '{args.branch}'...")
        trigger_autoheal_session(args.simulate_fail, args.branch)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
