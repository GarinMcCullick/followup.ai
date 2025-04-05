import requests
from bs4 import BeautifulSoup

def scrape_job_posting(url):
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")

    # Dummy data – you’ll need to upgrade this later for real sites
    return {
        "title": soup.title.text if soup.title else "Job Title",
        "company": "Company Name (placeholder)",
        "description": "Job description goes here. Placeholder text."
    }
