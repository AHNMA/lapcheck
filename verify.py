from playwright.sync_api import sync_playwright

def verify_app_loads(page):
    page.goto("http://localhost:3000/")

    # Warte darauf, dass die Telemetrie-App geladen wird und kein Loading-Spinner mehr da ist
    # Wir erwarten "Initializing" im Startbildschirm (sobald die Daten noch laden),
    # aber wir warten stattdessen lieber auf den Text "Awaiting Telemetry Input" oder "Live Analysis"
    page.wait_for_timeout(5000) # Grobe Zeit, um die App zu initialisieren

    # Erstelle Screenshot
    page.screenshot(path="verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_app_loads(page)
        finally:
            browser.close()