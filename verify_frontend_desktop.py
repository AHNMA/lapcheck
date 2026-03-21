from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch()
    # Desktop size
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto('http://localhost:3000')
    time.sleep(10)
    page.screenshot(path='desktop_view.png')
    browser.close()
