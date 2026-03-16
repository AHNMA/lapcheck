from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # 1. Arrange: Go to the local dev server
            page.goto("http://localhost:3000/")

            # Wait for main UI to render (Year dropdown is a good indicator)
            page.wait_for_selector('text="01. Year"')

            # Since the OpenF1 API might not be available or might take time,
            # we just wait a bit to let any initial render settle, then take a screenshot
            # to verify ECharts canvas elements don't crash the page and base layout is fine.
            page.wait_for_timeout(3000)

            page.screenshot(path="verification.png", full_page=True)
            print("Screenshot saved to verification.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification_error.png", full_page=True)
            print("Error screenshot saved to verification_error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
