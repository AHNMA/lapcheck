from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch()
    # iPhone 12 Pro size (390 x 844)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.goto('http://localhost:3000')
    time.sleep(10)
    page.screenshot(path='mobile_view.png', full_page=True)
    browser.close()
