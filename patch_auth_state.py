import json

with open('playwright/.auth/parent.json', 'w') as f:
    json.dump({
      "cookies": [],
      "origins": [
        {
          "origin": "http://localhost:5173",
          "localStorage": [
            {
              "name": "sstracker_e2e_bypass",
              "value": "true"
            },
            {
              "name": "auth_state",
              "value": "{\"isAuthenticated\": true, \"role\": \"parent\", \"userProfile\": {\"isCleared\": true, \"householdId\": \"test_household\", \"role\": \"parent\"}}"
            }
          ]
        }
      ]
    }, f, indent=2)
