# WORKSPACE TOPOLOGY
The application is siloed into 5 distinct workspaces. Do NOT mix concerns or UI components between these silos.

1. **Admin (`/admin`):** Global system settings, Organization/Club provisioning, cross-tenant audit logs.
2. **Director (`/director`):** Club OS. Roster management, Deployment Calendars, VPC Approval Queues, and Branding.
3. **Coach (`/coach`):** The War Room. Tactical Builder, Drill Designer, Match Logger, and Squad Telemetry/Readiness.
4. **Parent (`/parent`):** Household management, Verifiable Parental Consent (VPC) signature flows, and minor account provisioning.
5. **Player/Operative (`/player` or `/operative`):** The Edge. Workout execution, Armory (customization), Skill Radars, and Leaderboards. Read-only access to Tactical plays.