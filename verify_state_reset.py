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
        page.click('text="03. Session"', force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path="verification_sessions_list_visible.png")

        browser.close()

if __name__ == "__main__":
    run()
