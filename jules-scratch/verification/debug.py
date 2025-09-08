from playwright.sync_api import sync_playwright, Page, expect
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the login page.
        page.goto("http://localhost:5173/login")

        # 2. Enter the credentials provided by the user.
        page.get_by_label("Email").fill("thiagopascotto94@outlook.com")
        page.get_by_label("Senha").fill("88221521ps")

        # 3. Click the login button.
        page.get_by_role("button", name="Entrar").click()

        # Wait for navigation to the main page (which is the root)
        expect(page).to_have_url("http://localhost:5173/")

        # 4. Click the "biblioteca" icon/button.
        page.get_by_role("button", name="Biblioteca").click()

        # Wait for navigation to the library page
        expect(page).to_have_url("http://localhost:5173/library")

        # 5. Click the "marluvas" button.
        page.get_by_text("Marluvas").click()

        # Wait for navigation to the library detail page
        expect(page).to_have_url(re.compile(r".*/library/.+"))

        # Wait for the loading message to disappear.
        expect(page.get_by_text("Carregando...")).to_be_hidden(timeout=15000)

        print("Loading message is hidden.")

        # Take a screenshot of the library detail page
        page.screenshot(path="jules-scratch/verification/library_detail_final.png")
        print("Final library detail screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
