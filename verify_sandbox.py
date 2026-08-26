from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:5173/coach/sandbox")
    page.wait_for_timeout(2000)

    # Take screenshot at the key moment
    page.screenshot(path="verification.png")
    page.wait_for_timeout(1000)  # Hold final state for the video

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="."
        )
        page = context.new_page()
        # Fake auth state to allow bypass for the sandbox
        page.add_init_script("localStorage.setItem('sstracker_e2e_bypass', 'true');")
        page.add_init_script("localStorage.setItem('auth_state', JSON.stringify({ role: 'coach', isProfileComplete: true, userProfile: { role: 'coach' } }));")
        try:
            run_cuj(page)
        finally:
            context.close()  # MUST close context to save the video
            browser.close()
