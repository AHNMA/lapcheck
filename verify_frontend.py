from playwright.sync_api import sync_playwright
import time

def test_frontend_error_handling():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Intercept and mock the API call to return a 429 error
        def handle_route(route):
            if "meetings" in route.request.url:
                route.fulfill(
                    status=429,
                    content_type="application/json",
                    body='{"message": "Rate limit exceeded"}'
                )
            else:
                route.continue_()

        page.route("**/meetings/**", handle_route)

        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000")

        print("Waiting for error message to appear...")
        # Wait for the error message container
        error_msg = page.locator("text=Live-Datenlimit erreicht. Bitte Archiv (2023-2025) nutzen.")
        error_msg.wait_for(timeout=10000)

        print("Taking screenshot...")
        page.screenshot(path="error_verification.png")
        print("Done.")

        browser.close()

if __name__ == "__main__":
    test_frontend_error_handling()
