#!/bin/bash
set -e
cp functions/.env.sports-skill-tracker-dev functions-compliance/.env
echo "Copied functions/.env.sports-skill-tracker-dev to functions-compliance/.env"
echo "WEBAUTHN_RP_ID=sstracker.app" >> functions-compliance/.env
echo "WEBAUTHN_RP_ORIGIN=https://sstracker.app,https://preview.sstracker.app" >> functions-compliance/.env
