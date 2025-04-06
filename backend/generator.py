import openai

def generate_content(parsed_resume, job_description):
    """Generate cover letter and follow-up email based on the job description and resume."""
    if not isinstance(parsed_resume, dict):
        raise ValueError("Parsed resume should be a dictionary, not a string.")
    
    prompt = f"""
    You are an AI career assistant helping write a job application for a software development position.

    Here is the candidate's resume:
    \"\"\"{parsed_resume}\"\"\"  # Ensure this is a dictionary

    Here is the job posting:
    \"\"\"{job_description}\"\"\"  

    **Important Instructions:**
    - Do not include any inaccurate or fabricated qualifications like skills, technologies, or roles that are not present in the candidate's resume.
    - The candidate does not have experience with Ruby on Rails or other technologies not listed in their resume.
    - Only include skills, experiences, or qualifications that appear in the resume.
    - If the job description mentions technologies or skills the candidate doesn’t have, omit them or find skills that are more closely related.
    - Tailor the content based on the job description, focusing on skills that overlap or align with the candidate’s experience.
    - Format everything clearly and professionally.
    - Do **not** include placeholders like [Company Name], [Recipient's Name], or [City, State, ZIP] in the cover letter or follow-up email. If the information is missing or unavailable, omit it entirely.
    - Treat the cover letter as part of an email. Do not include the formal letter formatting (e.g., "Dear Hiring Manager" at the top with brackets).
    - The cover letter should flow naturally within the email, directly addressing the hiring manager and expressing interest in the role.
    - If any details like the hiring manager's name or company name are not present, do not add placeholders or use brackets. Simply omit that part from the text.
    - Make sure the email remains professional and addresses all the relevant details based on the job description and the candidate's resume.
    - Please clearly separate the cover letter and follow-up email by adding a unique delimiter between them. The delimiter is: ===END OF COVER LETTER===
    - I do not have a bachelors or masters or assciates degree in computer science or any other field. I have a high school diploma and a few certifications and experience.

    Write the email including:
    1. A concise, tailored cover letter within the body of the email.
    2. A brief follow-up email after the cover letter.
    """

    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "You are a helpful AI writing assistant that strictly adheres to resume facts."},
                  {"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1200
    )

    # Extract and return only the cover letter and follow-up email from the response
    response_content = response.choices[0].message.content.strip()
    
    # Split by sections (if present) and assign to variables
    # Split by the delimiter "===END OF COVER LETTER==="
    content_split = response_content.split("===END OF COVER LETTER===")
    
    # Check if we have both parts
    if len(content_split) == 2:
        cover_letter = content_split[0].strip()
        follow_up = content_split[1].strip()
        return cover_letter, follow_up
    else:
        # If not two parts, return the whole response
        return response_content, ""
