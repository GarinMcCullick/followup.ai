# resume_parser.py
import fitz  # PyMuPDF
import re

def extract_text_from_pdf(file_stream):
    """Extracts and returns plain text from a PDF file stream."""
    doc = fitz.open(stream=file_stream.read(), filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text.strip()

def parse_resume(resume_text):
    """Parse extracted resume text into structured data."""
    resume_data = {
        'name': extract_name(resume_text),
        'email': extract_email(resume_text),
        'phone': extract_phone(resume_text),
        'skills': extract_skills(resume_text),
        'education': extract_education(resume_text),
        'experience': extract_experience(resume_text),
    }
    return resume_data

def extract_name(resume_text):
    """Extract the name from the resume text."""
    name_pattern = r"(\b[A-Z][a-z]*\b(?: \b[A-Z][a-z]*\b)*)"
    match = re.search(name_pattern, resume_text)
    return match.group(0).strip() if match else "Name Not Provided"

def extract_email(resume_text):
    """Extract email address from resume text."""
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    match = re.search(email_pattern, resume_text)
    return match.group(0) if match else "Email Not Provided"

def extract_phone(resume_text):
    """Extract phone number from resume text."""
    phone_pattern = r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    match = re.search(phone_pattern, resume_text)
    return match.group(0) if match else "Phone Not Provided"

def extract_skills(resume_text):
    """Extract skills from the resume text."""
    skills_pattern = r"(Skills|Technical Skills|Key Skills)(.*?)(Education|Experience|Other)"
    match = re.search(skills_pattern, resume_text, re.DOTALL)
    if match:
        skills_section = match.group(2)
        return [skill.strip() for skill in re.split(r",|\n", skills_section) if skill]
    return []

def extract_education(resume_text):
    """Extract education details from resume text."""
    education_pattern = r"(Education|Academic Background)(.*?)(Experience|Skills|Work History|$)"
    match = re.search(education_pattern, resume_text, re.DOTALL)
    return match.group(2).strip() if match else "Education Not Provided"

def extract_experience(resume_text):
    """Extract experience details from resume text."""
    experience_pattern = r"(Experience|Work History)(.*?)(Skills|Education|References|$)"
    match = re.search(experience_pattern, resume_text, re.DOTALL)
    return match.group(2).strip() if match else "Experience Not Provided"
