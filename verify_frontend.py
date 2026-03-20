from playwright.sync_api import sync_playwright

def verify_sessions_list():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # The dropdown for session seems to open downwards but we can't see it well in the screenshot.
        # It's an absolute div with z-index 100. Let's scroll the div or adjust the script to capture it explicitly.
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # Navigate to the app
        page.goto("http://localhost:3000")

        # Wait for the initial loading overlay to disappear
        page.wait_for_selector('text="INITIALIZING"', state='hidden', timeout=15000)
        page.wait_for_selector('text="01. Year"')

        page.wait_for_timeout(3000)

        # Switch to 2024
        page.locator('button', has_text='2026').click()
        page.wait_for_timeout(500)
        page.locator('button:has-text("2024")').click()
        page.wait_for_timeout(3000)

        # Open Grand Prix
        meeting_label = page.locator('text="02. Grand Prix"')
        meeting_button = meeting_label.locator('xpath=../following-sibling::button')
        meeting_button.click()
        page.wait_for_timeout(1000)

        page.locator('button:has-text("Bahrain Grand Prix")').click()
        page.wait_for_timeout(3000)

        # Now click on Session to open the dropdown list!
        session_label = page.locator('text="03. Session"')
        session_button = session_label.locator('xpath=../following-sibling::button')
        session_button.click()

        page.wait_for_timeout(1500)

        # The dropdown menu is an animated div. Let's just find all buttons with text 'Practice 1', 'Qualifying' to prove they exist
        practice_1_exists = page.locator('button:has-text("Practice 1")').count() > 0
        practice_2_exists = page.locator('button:has-text("Practice 2")').count() > 0
        practice_3_exists = page.locator('button:has-text("Practice 3")').count() > 0
        qualifying_exists = page.locator('button:has-text("Qualifying")').count() > 0
        race_exists = page.locator('button:has-text("Race")').count() > 0

        print(f"Practice 1 exists: {practice_1_exists}")
        print(f"Practice 2 exists: {practice_2_exists}")
        print(f"Practice 3 exists: {practice_3_exists}")
        print(f"Qualifying exists: {qualifying_exists}")
        print(f"Race exists: {race_exists}")

        page.screenshot(path="verification_sessions_dropdown_list.png")

        browser.close()

if __name__ == "__main__":
    verify_sessions_list()
