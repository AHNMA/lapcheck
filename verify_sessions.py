from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:3000/")

        # Wait for data to load
        page.wait_for_selector('text="02. Grand Prix"', state='visible', timeout=15000)
        page.wait_for_timeout(3000) # Give it a bit more time to fetch results and sessions

        # Click the Year dropdown to make sure it exists
        page.click('text="2026"', force=True)
        page.wait_for_timeout(500)
        page.screenshot(path="verification_2026.png")

        # Open Grand Prix Dropdown
        page.click('text="02. Grand Prix"', force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path="verification_gp.png")
        page.click('text="Chinese Grand Prix"', force=True) # Select second past GP
        page.wait_for_timeout(3000)

        # Open Session Dropdown
        page.click('text="03. Session"', force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path="verification_sessions.png")

        browser.close()

if __name__ == "__main__":
    run()
