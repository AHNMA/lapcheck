from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Gehe zur App
        page.goto("http://localhost:3000/")

        # Warte, bis die App geladen ist und zumindest die Year-Auswahl sichtbar ist
        page.wait_for_selector("text=01. Year", timeout=15000)

        # Warte einen Moment, damit die Daten geladen werden und das Layout sich anpasst
        page.wait_for_timeout(3000)

        # Mache einen Screenshot
        page.screenshot(path="verification.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    verify_frontend()
