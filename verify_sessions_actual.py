from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:3000/")

        # Wait for data to load
        page.wait_for_selector('text="02. Grand Prix"', state='visible', timeout=15000)
        page.wait_for_timeout(3000)

        # Open Session Dropdown to verify clipping issue is fixed
        # Need to click the actual dropdown button for Session
        page.locator('button:has-text("Race")').first.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="verification_sessions_list_actual.png")

        browser.close()

if __name__ == "__main__":
    run()
