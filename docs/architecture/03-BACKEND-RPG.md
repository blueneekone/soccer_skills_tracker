# GAMIFICATION & THE RPG ENGINE
- **The Operative Theme:** Players are treated as "Operatives." They have Armories, Skill Radars, and Levels.
- **XP Bounties:** Workouts and Tactical Plays carry mathematical XP weights. 
- **Cloud Function Authority:** The frontend DOES NOT award XP. The frontend submits a completion payload; the Firebase Cloud Function (`gamificationWorkoutXp.js`) calculates and awards the XP securely to prevent client-side spoofing.
- **Skill Trees:** Players possess RPG stats. Predictive "Success Probabilities" are calculated by comparing a Player's base stats against assigned Route/Drill Difficulty.