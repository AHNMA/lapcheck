from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Wir können ein größeres Fenster setzen, um sicherzustellen, dass es wie auf einem Desktop aussieht
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        page.goto("http://localhost:3000/")

        # Warte, bis die App geladen ist und zumindest die Year-Auswahl sichtbar ist
        page.wait_for_selector("text=01. Year", timeout=30000)

        # Warte, bis die Fahrer-Liste da ist
        page.wait_for_selector("text=04. Drivers", timeout=30000)

        # Warte bis die Laps nicht mehr laden (d.h. "Loading laps..." verschwindet, oder ein L1 - taucht auf)
        # Da wir die "ANT" und "RUS" default selektiert haben, müsste bald ein L(Zahl) - auftauchen
        try:
            page.wait_for_selector("text=L1 -", timeout=45000)
        except Exception:
            pass # Wenn es fehlschlägt, mache trotzdem einen Screenshot

        # Warte noch 2 Sekunden
        page.wait_for_timeout(2000)

        page.screenshot(path="verification2.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    verify_frontend()
