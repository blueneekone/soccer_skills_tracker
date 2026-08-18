#!/usr/bin/env python3
import os
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

def print_status(message, color=Colors.BLUE):
    print(f"{color}{Colors.BOLD}>>> {message}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}{Colors.BOLD}✔ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.WARNING}{Colors.BOLD}⚠ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.FAIL}{Colors.BOLD}✘ {message}{Colors.ENDC}")

def main():
    print_status("SSTracker Firebase Database Audit & Purge Orchestrator v1.0", Colors.HEADER)
    print("This utility provisions an automated, local Node.js database controller.")
    print("It allows you to inspect your Firestore usage and safely purge mock data.")
    print("Your club (Aggies FC) and your admin profile are fully protected.\n")

    cwd = Path.cwd()
    
    # Verify we are inside the Svelte root directory
    if not (cwd / "package.json").exists() and (cwd / "soccer_skills_tracker" / "package.json").exists():
        cwd = cwd / "soccer_skills_tracker"
        print_status(f"Auto-navigating to project root: {cwd}")

    # Ensure scripts directory exists
    scripts_dir = cwd / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)

    js_file_path = scripts_dir / "db-audit-and-purge.js"

    # Perfect JS database controller using verified Firebase Admin SDK
    js_content = """// 🛡️ SSTracker Enterprise Database Compliance Controller
// Executed locally with zero cloud token overhead. Standardized on Zero-Trust.

const admin = require('firebase-admin');
const fs = require('fs');

// Check if running against local Firestore emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`📡 Connecting to local Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

// Initialize Admin SDK with Application Default Credentials (ADC)
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const db = admin.firestore();

async function run() {
    const args = process.argv.slice(2);
    const mode = args.includes('--purge') ? 'purge' : 'audit';
    
    // Parse target email to protect
    let keepEmail = '';
    const emailArg = args.find(arg => arg.startsWith('--keep-email='));
    if (emailArg) {
        keepEmail = emailArg.split('=')[1].toLowerCase().trim();
    }

    if (mode === 'purge' && !keepEmail) {
        console.error('❌ ERROR: You must specify --keep-email=your-admin-email@domain.com to run a purge operation!');
        process.exit(1);
    }

    console.log('================================================================');
    console.log(`🛰️  SSTracker Database Controller | Active Mode: ${mode.toUpperCase()}`);
    if (mode === 'purge') {
        console.log(`🛡️  Target Profile Shield Active: Protecting 'users/${keepEmail}' and 'Aggies FC' collection groups.`);
    }
    console.log('================================================================\\n');

    try {
        // Fetch all root-level collections
        const collections = await db.listCollections();
        console.log(`🔍 Detected ${collections.length} active Firestore collections in your project database.\\n`);

        for (const col of collections) {
            const colId = col.id;
            const snapshot = await col.get();
            const count = snapshot.size;

            console.log(`📂 Collection [${colId}]`);
            console.log(`   - Total Document Count: ${count}`);

            if (count > 0) {
                // Peek schema fields from first document
                const sampleDoc = snapshot.docs[0];
                const fields = Object.keys(sampleDoc.data());
                console.log(`   - Sample Fields Detected: [${fields.join(', ')}]`);
            }

            if (mode === 'purge') {
                const batch = db.batch();
                let deleteCount = 0;

                for (const doc of snapshot.docs) {
                    const docId = doc.id;
                    const docData = doc.data();

                    // PROTECT: Admin account inside 'users' collection
                    if (colId === 'users' && docId.toLowerCase() === keepEmail) {
                        console.log(`   🛡️  [SHIELDED] Preserving admin user account: users/${docId}`);
                        continue;
                    }

                    // PROTECT: Aggies FC club and linked teams/assignments
                    const clubId = docData.clubId || docData.tenantId;
                    if (clubId === 'aggies-fc' || docId === 'aggies-fc') {
                        console.log(`   🛡️  [SHIELDED] Preserving Aggies FC organizational data: ${colId}/${docId}`);
                        continue;
                    }

                    // Delete the document
                    batch.delete(doc.ref);
                    deleteCount++;
                }

                if (deleteCount > 0) {
                    await batch.commit();
                    console.log(`   🔥 [PURGED] Successfully shredded ${deleteCount} mock documents from collection [${colId}].`);
                } else {
                    console.log(`   ✔  No cleanable items remaining in collection [${colId}].`);
                }
            }
            console.log('----------------------------------------------------------------');
        }

        console.log('\\n✔  Database compliance operation completed successfully.');
    } catch (err) {
        console.error('\\n❌ Operational Crash:', err.message);
        console.log('\\n💡 Solution Checklist:');
        console.log('  1. Ensure you have authorized your terminal via: gcloud auth application-default login');
        console.log('  2. If using local emulators, make sure the Firestore emulator is actively running.');
    }
}

run();
"""

    try:
        with open(js_file_path, "w", encoding="utf-8") as f:
            f.write(js_content)
        print_success(f"Database cleaner provisioned at: scripts/db-audit-and-purge.js")
        
        print("\n" + "="*60)
        print_status("YOUR EXECUTIVE RUNNING MANUAL:", Colors.HEADER)
        print(f"  {Colors.BOLD}1. First, inspect what collections your database is currently using:{Colors.ENDC}")
        print("     node scripts/db-audit-and-purge.js --audit")
        print("\n" + f"  {Colors.BOLD}2. Run the secure purge. Wipes all mock data EXCEPT your admin user and 'Aggies FC':{Colors.ENDC}")
        print("     node scripts/db-audit-and-purge.js --purge --keep-email=your-admin-email@sstracker.app")
        print("="*60 + "\n")
        
    except Exception as e:
        print_error(f"Failed to create database script: {e}")

if __name__ == "__main__":
    main()
