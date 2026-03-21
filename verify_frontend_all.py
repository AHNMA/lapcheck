from playwright.sync_api import sync_playwright
import time

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # iPhone 12 Pro dimensions
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()
        page.goto('http://localhost:3000')

        # Wait for data to load
        page.wait_for_selector('text=Chinese Grand Prix', timeout=60000)
        page.wait_for_selector('text=SPEED', timeout=60000)

        # Click the 'ALL' button
        page.click('text=ALL')

        time.sleep(3) # Wait for animation/render

        page.screenshot(path='mobile_view_all.png', full_page=True)
        browser.close()

if __name__ == '__main__':
    verify()
