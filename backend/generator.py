import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_content(job_info):
    prompt = f"""
Generate a professional cover letter for the following job:

Title: {job_info['title']}
Company: {job_info['company']}
Description: {job_info['description']}

Make it friendly but formal.

Also generate a short and polite follow-up email to be sent one week after the application.
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )

    output = response.choices[0].message.content
    parts = output.split("Follow-Up Email:")
    cover_letter = parts[0].strip()
    follow_up = parts[1].strip() if len(parts) > 1 else "Could not generate follow-up."

    return cover_letter, follow_up
