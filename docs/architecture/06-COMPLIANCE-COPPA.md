# LEGAL COMPLIANCE & PRIVACY (COPPA)
You are building an application utilized by youth sports leagues. You MUST adhere to COPPA laws.

## 1. VPC (VERIFIABLE PARENTAL CONSENT)
- **The Gate:** Players under 13 cannot use biometric trackers or upload profile images without a `vpc_approved: true` flag on their user document.
- **The Flow:** Player initiates request -> Queues in Director/Parent dashboard -> Parent digitally signs -> Player unlocks features.

## 2. PII & COMMUNICATIONS
- **Anonymization:** Public/Team leaderboards must obfuscate minor PII (e.g., "Evan W.") unless viewed by an authorized `DIRECTOR` or `COACH`.
- **Restricted Messaging:** Asymmetric communication only. Coaches broadcast; minors cannot initiate unmonitored DMs.