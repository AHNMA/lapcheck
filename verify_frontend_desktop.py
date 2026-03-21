from playwright.sync_api import sync_playwright
import time

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Desktop dimensions
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        page.goto('http://localhost:3000')

        # Wait for data to load
        page.wait_for_selector('text=Chinese Grand Prix', timeout=60000)
        page.wait_for_selector('text=SPEED', timeout=60000)

        time.sleep(3) # Wait for animation/render

        page.screenshot(path='desktop_view.png', full_page=True)
        browser.close()

if __name__ == '__main__':
    verify()
