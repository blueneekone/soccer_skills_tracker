git checkout src/routes/\(app\)/player/dashboard/__tests__/playerDashboard.layout.test.ts
git checkout src/routes/\(app\)/player/dashboard/__tests__/playerDashboard.hud.test.ts

sed -i 's/:global(\.player-dossier-root \.bento-card)\\s\*{\([^}]+\)}/:global(\\.player-dossier-root \\.bento-card),\\s*\\.bento-card\\s*{([^}]+)}/g' src/routes/\(app\)/player/dashboard/__tests__/playerDashboard.layout.test.ts
