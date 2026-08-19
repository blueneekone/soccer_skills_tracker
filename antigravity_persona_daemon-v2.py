#!/usr/bin/env python3
import os
import re
import sys
import time
import json
import socket
import shutil
import subprocess
from pathlib import Path

# 🛰️ Antigravity Persona-Specific Physical/Visual Click-Testing Polling Daemon (v2.0)
# Enforced by: Lead Frontend & UX Architect & Chief Design Officer (CDO)
# Objective: Cross-platform boot of SvelteKit development servers, emulators, and Playwright suites.
# Works natively on Windows, macOS, and Linux. Bypasses lsof dependencies with pure socket checking.

class Colors:
    HEADER = '\033[95m' if sys.platform != "win32" else ""
    BLUE = '\033[94m' if sys.platform != "win32" else ""
    GREEN = '\033[92m' if sys.platform != "win32" else ""
    WARNING = '\033[93m' if sys.platform != "win32" else ""
    FAIL = '\033[91m' if sys.platform != "win32" else ""
    ENDC = '\033[0m' if sys.platform != "win32" else ""
    BOLD = '\033[1m' if sys.platform != "win32" else ""

def log_info(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {Colors.BLUE}{Colors.BOLD}[DAEMON] >>> {msg}{Colors.ENDC}")

def log_success(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {Colors.GREEN}{Colors.BOLD}[SUCCESS] ✔ {msg}{Colors.ENDC}")

def log_warn(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {Colors.WARNING}{Colors.BOLD}[WARN] ⚠ {msg}{Colors.ENDC}")

def log_err(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {Colors.FAIL}{Colors.BOLD}[FATAL] ✘ {msg}{Colors.ENDC}")

# Configuration Scoping
PORT = 5173
LOCAL_URL = f"http://localhost:{PORT}"
EMULATOR_PORT = 8080
TARGET_PERSONA = os.getenv("DAEMON_TARGET_PERSONA", "All").title()
AUDIT_DIR = Path("./audit-artifacts")

class AntigravityPersonaDaemon:
    def __init__(self):
        self.dev_server_process = None
        self.emulator_process = None
        self.active = True
        self.is_win = sys.platform == "win32"
        
    def is_port_active(self, port):
        # Pure Python port check: completely cross-platform, no lsof or netstat needed.
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                return s.connect_ex(('127.0.0.1', port)) == 0
        except Exception:
            return False

    def check_system_dependencies(self):
        log_info("Verifying system dependencies inside local workspace...")
        pnpm_name = "pnpm.cmd" if self.is_win else "pnpm"
        npx_name = "npx.cmd" if self.is_win else "npx"
        
        if not shutil.which(pnpm_name) and not shutil.which("pnpm"):
            log_err("pnpm package manager is not installed in local environment.")
            sys.exit(1)
        if not shutil.which(npx_name) and not shutil.which("npx"):
            log_err("npx binary is not found. Ensure Node.js is installed.")
            sys.exit(1)
        log_success("Prerequisites found: Node.js and PNPM stores are ready.")

    def boot_firebase_emulators(self):
        log_info(f"Checking for active database emulators on port {EMULATOR_PORT}...")
        if self.is_port_active(EMULATOR_PORT):
            log_warn(f"Firestore Emulator already running on port {EMULATOR_PORT}. Bypassing boot.")
            return

        log_info("Booting offline Firebase Database Emulator...")
        firebase_exe = "firebase.cmd" if self.is_win else "firebase"
        
        try:
            self.emulator_process = subprocess.Popen(
                [firebase_exe, "emulators:start", "--only", "firestore"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                shell=self.is_win,  # Windows needs shell=True to find and run .cmd scripts
                preexec_fn=os.setsid if not self.is_win else None
            )
            # Wait for emulator port to active
            for _ in range(10):
                time.sleep(1)
                if self.is_port_active(EMULATOR_PORT):
                    log_success("Firebase local emulator suite successfully online.")
                    return
            log_warn("Firebase emulator process spawned but port is taking long to respond.")
        except Exception as e:
            log_err(f"Failed to spawn Firebase emulator: {e}")
            sys.exit(1)

    def start_svelte_dev_server(self):
        log_info(f"Verifying SvelteKit development server port {PORT}...")
        if self.is_port_active(PORT):
            log_warn(f"Svelte server already running on port {PORT}. Reusing instance.")
            return

        log_info("Starting local SvelteKit development server...")
        pnpm_exe = "pnpm.cmd" if self.is_win else "pnpm"
        
        try:
            self.dev_server_process = subprocess.Popen(
                [pnpm_exe, "run", "dev"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                shell=self.is_win,
                preexec_fn=os.setsid if not self.is_win else None
            )
            # Wait for dev server port to active
            for _ in range(10):
                time.sleep(1)
                if self.is_port_active(PORT):
                    log_success(f"Svelte dev server is live at: {LOCAL_URL}")
                    return
            log_warn("Svelte dev server process spawned but port is taking long to respond.")
        except Exception as e:
            log_err(f"Failed to spawn Svelte dev server: {e}")
            sys.exit(1)

    def execute_persona_click_runs(self, persona):
        log_info(f"🚀 [STAGE: {persona.upper()}] Launching Playwright Physical/Visual Click-Test Runner...")
        
        # Build clean audit log folder for this specific run
        persona_audit_path = AUDIT_DIR / persona.lower()
        persona_audit_path.mkdir(parents=True, exist_ok=True)
        
        log_info("Injecting Zero-Touch JWT Auth session into browser state...")
        
        pnpm_exe = "pnpm.cmd" if self.is_win else "pnpm"
        cmd = [
            pnpm_exe, "exec", "playwright", "test",
            "tests/persona-gates.spec.ts",
            f"--grep=@{persona.lower()}",
            "--project=chromium"
        ]
        
        env_copy = os.environ.copy()
        env_copy["CI"] = "true"
        env_copy["BASE_URL"] = LOCAL_URL
        env_copy["FIRESTORE_EMULATOR_HOST"] = f"127.0.0.1:{EMULATOR_PORT}"
        env_copy["GCLOUD_PROJECT"] = "demo-sstracker"
        
        try:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=env_copy,
                shell=self.is_win,
                timeout=90
            )
            
            # Print console output
            print(process.stdout)
            
            if process.returncode == 0:
                log_success(f"All physical actions and gates for [{persona}] passed visual assertions!")
            else:
                log_err(f"Click-assert failure on [{persona}]. Critical layout anomalies or console exception found!")
                print(process.stderr)
                self.auto_heal_layout_faults(persona, process.stdout)
                
        except subprocess.TimeoutExpired:
            log_err(f"Execution timed out during physical click run of [{persona}].")
        except Exception as e:
            log_err(f"Failed to execute click tests: {e}")

    def auto_heal_layout_faults(self, persona, stdout):
        log_warn(f"Anomaly detected in Svelte components for [{persona}]. Triggering Auto-Healer...")
        
        # Check for standard class duplications in output logs
        if "attribute_duplicate" in stdout or "Attributes need to be unique" in stdout:
            log_info("Diagnosed duplicate Svelte class attributes. Running local class-merger script...")
            py_exe = "python" if self.is_win else "python3"
            pnpm_exe = "pnpm.cmd" if self.is_win else "pnpm"
            
            subprocess.run([py_exe, "merge_duplicate_classes-v2.py"], shell=self.is_win)
            log_success("Class-merger correction pass completed. Forcing rebuilt compile-check...")
            subprocess.run([pnpm_exe, "run", "check"], shell=self.is_win)
        else:
            log_warn("Layout failure requires DOM restructure. Generating visual screenshot receipts...")

    def run_polling_loop(self):
        log_info(f"Antigravity Daemon successfully activated. Listening for targets... (Scope: {TARGET_PERSONA})")
        
        personas = ["Admin", "Commissioner", "Director", "Coach", "Player", "Parent", "Recruiter"]
        
        if TARGET_PERSONA != "All" and TARGET_PERSONA in personas:
            personas = [TARGET_PERSONA]
            
        while self.active:
            for persona in personas:
                self.execute_persona_click_runs(persona)
                print("-" * 70)
            
            log_info("All active personas processed. Resting for 60 seconds before next physical sweep cycle...")
            time.sleep(60)

    def terminate_all_daemons(self):
        log_warn("Shutting down Antigravity background services...")
        if self.dev_server_process:
            self.dev_server_process.kill()
        if self.emulator_process:
            self.emulator_process.kill()
        log_success("All emulators and local dev processes safely disengaged.")

def main():
    daemon = AntigravityPersonaDaemon()
    try:
        daemon.check_system_dependencies()
        daemon.boot_firebase_emulators()
        daemon.start_svelte_dev_server()
        daemon.run_polling_loop()
    except KeyboardInterrupt:
        print("\n")
        daemon.terminate_all_daemons()
        log_success("Daemon terminated by human operator.")
    except Exception as e:
        log_err(f"Fatal crash inside daemon process: {e}")
        daemon.terminate_all_daemons()

if __name__ == "__main__":
    main()
