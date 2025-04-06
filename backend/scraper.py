




# UNFORTUNATELY, THE FOLLOWING CODE DOES NOT WORK AS INTENDED DUE TO CLOUDFARE PROTECTION ON INDEED.COM.






import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

def scrape_job_posting(url: str):
    # Set up Chrome options (without headless mode)
    chrome_options = Options()
    # Remove the headless argument to allow browser window to open
    chrome_options.add_argument("--disable-gpu")  # Disable GPU to run smoothly on non-headless mode
    chrome_options.add_argument("--no-sandbox")  # Disable sandboxing for some systems

    # Initialize the WebDriver (assuming you're using Chrome)
    driver = webdriver.Chrome(options=chrome_options)

    try:
        # Open the URL
        driver.get(url)
        
        # Wait for Cloudflare challenge (up to 10 seconds or more)
        time.sleep(5)

        # Try to click the checkbox if it's available
        try:
            # Find the checkbox element using its unique CSS selector
            checkbox = driver.find_element(By.CSS_SELECTOR, 'input[type="checkbox"]')
            
            # Click the checkbox to bypass Cloudflare
            checkbox.click()
            print("Cloudflare checkbox clicked successfully.")
            
            # Wait for a bit to ensure the page loads after clicking
            time.sleep(5)
        except Exception as e:
            print("Error clicking Cloudflare checkbox:", e)

        # Once Cloudflare is bypassed, scrape the job title (first h1 element)
        try:
            job_title = driver.find_element(By.TAG_NAME, 'h1').text
            print(f"Job Title: {job_title}")
        except Exception as e:
            print("Error retrieving job title:", e)

        # You can scrape more content here if needed, such as job description, company, etc.

    finally:
        # Keep the browser open for inspection
        input("Press Enter to close the browser...")  # Wait for user input before closing
        # Close the browser after scraping
        driver.quit()

# Example usage
url = "https://www.indeed.com/viewjob?jk=6a2a175f1912a064&tk=1io3e2ffrgnn3862&from=serp&vjs=3"
scrape_job_posting(url)
