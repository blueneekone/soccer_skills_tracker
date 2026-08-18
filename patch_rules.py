import re

with open('firestore.rules', 'r') as f:
    content = f.read()

# Add missing match blocks to firestore.rules if not present

missing_blocks = [
    ("match /team_broadcasts/{broadcastId}", "    match /team_broadcasts/{broadcastId} {\n      allow read: if isAuthenticated();\n      allow write: if isGlobalAdmin();\n    }\n"),
    ("match /message_incidents/{incidentId}", "    match /message_incidents/{incidentId} {\n      allow read: if isAuthenticated();\n      allow write: if isGlobalAdmin();\n    }\n"),
    ("match /attendance_sessions/{sessionId}", "    match /attendance_sessions/{sessionId} {\n      allow read, write: if isAuthenticated();\n    }\n"),
    ("match /parent_voice_sessions/{sessionId}", "    match /parent_voice_sessions/{sessionId} {\n      allow read: if isAuthenticated();\n      allow write: if isGlobalAdmin();\n    }\n"),
    ("match /completion_verifications/{verificationId}", "    match /completion_verifications/{verificationId} {\n      allow read: if isAuthenticated();\n      allow create, update, delete: if false;\n    }\n")
]

for block_id, block_content in missing_blocks:
    if block_id not in content:
        # Insert before the default match
        content = content.replace("    // Default match", f"{block_content}\n    // Default match")

with open('firestore.rules', 'w') as f:
    f.write(content)
