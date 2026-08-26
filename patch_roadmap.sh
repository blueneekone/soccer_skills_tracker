#!/bin/bash
sed -i 's/- \[ \] \*\*MARKETPLACE LAUNCH (Phase 4)\*\*/- [x] **MARKETPLACE LAUNCH (Phase 4)**/' ROADMAP.md
echo "- [x] **ONBOARDING PIPELINE**: Implemented Resend transactional invites and FCM device token hand-off." >> ROADMAP.md
