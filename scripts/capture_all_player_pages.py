import asyncio
from playwright.async_api import async_playwright
import os

async def capture_all():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Target base URL
        base_url = "http://localhost:5173"

        # First navigate to origin to allow setting localStorage
        await page.goto(f"{base_url}/", wait_until="domcontentloaded")

        # Inject bypass and mock user profile in localStorage
        mock_profile = {
            "uid": "mock-player-123",
            "email": "player@sstracker.test",
            "role": "player",
            "clubId": "mock-club-123",
            "teamId": "mock-team-123",
            "playerName": "Alex Mercer",
            "totalXp": 4250,
            "currentStreak": 5,
            "longestStreak": 12,
            "householdId": "mock-household-123",
            "vpcStatus": "verified",
            "isConsented": True,
            "medicalSignatureVerified": True,
            "liabilityWaiverVerified": True,
            "sportId": "soccer",
            "ageBand": "U16"
        }

        await page.evaluate("""(profile) => {
            window.localStorage.setItem('auth_token', JSON.stringify({
                uid: profile.uid,
                email: profile.email,
                role: profile.role
            }));
            window.localStorage.setItem('user_profile', JSON.stringify(profile));
            window.localStorage.setItem('auth_state', JSON.stringify(profile));
            window.localStorage.setItem('sstracker_e2e_bypass', 'true');
        }""", mock_profile)

        routes = [
            ("dashboard", "/player/dashboard"),
            ("armory", "/player/armory"),
            ("workout", "/player/workout"),
            ("media", "/player/media"),
            ("skill-tree", "/player/skill-tree"),
            ("proving-grounds", "/player/proving-grounds")
        ]

        out_dir_1 = "audit-artifacts/player"
        out_dir_2 = "/home/jules/verification/screenshots"
        os.makedirs(out_dir_1, exist_ok=True)
        os.makedirs(out_dir_2, exist_ok=True)

        for name, route in routes:
            print(f"Navigating to {route}...")
            try:
                await page.goto(f"{base_url}{route}", wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(3000)

                path_1 = os.path.join(out_dir_1, f"{name}.png")
                path_2 = os.path.join(out_dir_2, f"player_{name}.png")

                await page.screenshot(path=path_1, full_page=True)
                await page.screenshot(path=path_2, full_page=True)
                print(f"Successfully captured {name} to {path_1} and {path_2}")
            except Exception as e:
                print(f"Error capturing {name}: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture_all())
