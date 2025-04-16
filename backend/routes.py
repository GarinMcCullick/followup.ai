from flask import Blueprint, jsonify, request
from firebase import add_document, get_document  # Correct the typo here
from flask_cors import CORS
import datetime
from datetime import datetime, timedelta
from firebase import db  # Assuming 'db' is defined in firebase.py and initialized correctly
import os
import logging
from werkzeug.utils import secure_filename
from resume_parser import extract_text_from_pdf, parse_resume
from generator import generate_content
from firebase_admin import firestore
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import base64
from google.auth.transport.requests import Request

routes = Blueprint('routes', __name__)
CORS(routes, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://www.indeed.com"]}})

import requests
from flask import current_app

GOOGLE_API_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

@routes.route('/api/save-job', methods=['POST', 'OPTIONS'])
def save_job():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight handled'})
        response.status_code = 200
        return response

    try:
        # Debug: Log raw content type and payload
        current_app.logger.debug(f"Content-Type: {request.content_type}")
        current_app.logger.debug(f"Raw data: {request.data}")
        current_app.logger.debug(f"Request JSON: {request.get_json(silent=True)}")

        if not request.is_json:
            current_app.logger.warning("Request content type is not JSON")
            return jsonify({"message": "Expected application/json content type"}), 400

        job_data = request.get_json()
        title = job_data.get('title')
        company = job_data.get('company')
        url = job_data.get('url')
        date = job_data.get('date')
        job_description = job_data.get('jobDescription')
        contact_email = job_data.get('contactEmail')
        print(f"Job data received: {job_data}")
        missing_fields = [field for field in ['title', 'company', 'url', 'jobDescription'] if not job_data.get(field)]
        if missing_fields:
            current_app.logger.warning(f"Missing required fields: {missing_fields}")
            return jsonify({"message": "Missing required fields", "missing": missing_fields}), 400

        # Prepare data for /api/generate
        generate_payload = {
            "job_description": job_description
        }

        # Use a default resume file
        resume_path = './Resume-2025.pdf'
        if not os.path.exists(resume_path):
            current_app.logger.error(f"Resume file not found at path: {resume_path}")
            return jsonify({"message": "Resume file missing on server"}), 500

        with open(resume_path, 'rb') as f:
            files = {'resume': f}
            generate_response = requests.post(
                'http://localhost:5000/api/generate',
                data=generate_payload,
                files=files,
                headers={"X-Extension-API-Key": "true"}
            )

        if generate_response.status_code != 200:
            current_app.logger.error(f"Generate API error [{generate_response.status_code}]: {generate_response.text}")
            return jsonify({"message": "Failed to generate content", "details": generate_response.text}), 500

        generated_content = generate_response.json()
        cover_letter = generated_content.get("cover_letter")
        follow_up = generated_content.get("follow_up")

        job_dict = {
            "date": date,
            "title": title,
            "company": company,
            "url": url,
            "cover_letter": cover_letter,
            "follow_up": follow_up,
            "contact_email": contact_email,
        }

        job_id = add_document(job_dict)
        current_app.logger.info(f"Job saved successfully with ID: {job_id}")

        return jsonify({"message": "Job saved successfully", "job_id": job_id}), 201

    except Exception as e:
        current_app.logger.exception("Unhandled error in /api/save-job")
        return jsonify({"message": "Error saving job", "details": str(e)}), 500


@routes.route('/api/get-jobs', methods=['POST', 'OPTIONS'])
def get_recent_jobs():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight handled'})
        response.status_code = 200
        return response

    try:
        # Calculate date two weeks ago
        two_weeks_ago = datetime.utcnow() - timedelta(weeks=2)

        # Query Firestore for jobs with date >= two_weeks_ago
        jobs_ref = db.collection("jobs")
        query = jobs_ref.where("date", ">=", two_weeks_ago.isoformat())
        docs = query.stream()

        jobs = []
        for doc in docs:
            job_data = doc.to_dict()
            job_data['id'] = doc.id
            jobs.append(job_data)

        return jsonify(jobs), 200

    except Exception as e:
        print(f"Error occurred while retrieving jobs: {e}")
        return jsonify({"message": "Error retrieving jobs", "details": str(e)}), 500

@routes.route("/api/get-job", methods=["POST"])
def get_job():
    data = request.get_json()
    doc_id = data.get("id")

    if not doc_id:
        return jsonify({"error": "Document ID is required"}), 400

    try:
        doc_ref = db.collection("jobs").document(doc_id)
        doc = doc_ref.get()
        if doc.exists:
            job_data = doc.to_dict()
            job_data["id"] = doc.id  # Include the ID back in the response
            return jsonify(job_data), 200
        else:
            return jsonify({"error": "Job not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@routes.route("/api/generate", methods=["POST"])
def generate():
    if request.method == "OPTIONS":
        # Handle preflight CORS requests
        return '', 200

    auth_header = request.headers.get("Authorization")
    extension_key = request.headers.get("X-Extension-API-Key")

    current_app.logger.info(f"Received Authorization header: {auth_header}")
    current_app.logger.info(f"Received Extension API Key: {extension_key}")

    # Step 1: Check if there's an Authorization header
    if auth_header:
        token = auth_header.split(" ")[1]  # Extract token from "Bearer {token}"
        try:
            # Verify the OAuth 2.0 token with Google's API
            id_info = id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)
            current_app.logger.info(f"Decoded token information: {id_info}")
        except Exception as e:
            current_app.logger.warning(f"OAuth token error: {e}")
            return jsonify({"error": "Invalid token"}), 401

    # Step 2: Check for the Extension API Key (for non-OAuth access)
    elif extension_key and (extension_key == "true"):
        current_app.logger.info("Authenticated using extension API key")
        # Continue without OAuth
        pass

    # Step 3: Unauthorized Access (No valid token or API key)
    else:
        current_app.logger.warning("Unauthorized access attempt")
        return jsonify({"error": "Unauthorized"}), 401

    current_app.logger.info(f"Headers: {request.headers}")
    current_app.logger.info(f"Files: {request.files}")
    current_app.logger.info(f"Form Data: {request.form}")

    import os

    if (
        "resume" not in request.files and not os.path.exists("./Resume-2025.pdf")
    ) or (
        "job_description" not in request.form and "jobPosting" not in request.form
    ):
        current_app.logger.warning("Missing resume file or job description")
        return jsonify({"error": "Missing resume file or job description"}), 400

    # Use uploaded resume if present, otherwise fallback to local file
    resume_file = request.files.get("resume")
    if resume_file is None:
        with open("./Resume-2025.pdf", "rb") as f:
            resume_file = f.read()  # Or wrap it in a FileStorage-like object if needed

    job_description = request.form.get("job_description") or request.form.get("jobPosting")

    # Ensure it's a PDF
    filename = secure_filename(resume_file.filename)
    if not filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF resumes are supported"}), 400

    # Extract and parse resume
    try:
        resume_content = extract_text_from_pdf(resume_file)
        parsed_resume = parse_resume(resume_content)
    except Exception as e:
        current_app.logger.error(f"Error processing resume: {e}")
        return jsonify({"error": "Error processing the resume file"}), 500

    # Ensure parsed_resume is a dictionary
    if not isinstance(parsed_resume, dict):
        current_app.logger.warning(f"Expected parsed_resume to be a dictionary, but got {type(parsed_resume)}")
        return jsonify({"error": "Parsed resume should be a dictionary, not a string."}), 400

    # Ensure job_description is not empty
    if not job_description:
        current_app.logger.warning("Missing or empty job description")
        return jsonify({"error": "Job description is required"}), 400

    # Generate content (cover letter and follow-up email)
    try:
        cover_letter, follow_up = generate_content(parsed_resume, job_description)
    except Exception as e:
        current_app.logger.error(f"Error generating content: {e}")
        return jsonify({"error": "Error generating cover letter or follow-up email"}), 500

    return jsonify({
        "cover_letter": cover_letter,
        "follow_up": follow_up
    })

@routes.route("/api/edit-generation", methods=["POST", "OPTIONS"])
def edit_generation():
    if request.method == 'OPTIONS':
        print("[OPTIONS] Preflight request received")
        response = jsonify({'message': 'CORS preflight handled'})
        response.status_code = 200
        return response

    try:
        data = request.get_json()
        print("[POST] Received data:", data)

        doc_id = data.get("id")
        cover_letter = data.get("cover_letter")
        follow_up = data.get("follow_up")

        if not doc_id:
            print("[ERROR] Missing document ID")
            return jsonify({"error": "Document ID is required"}), 400

        doc_ref = db.collection("jobs").document(doc_id)
        print(f"[INFO] Updating doc ID: {doc_id}")

        doc_ref.update({
            "cover_letter": cover_letter,
            "follow_up": follow_up,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

        print("[SUCCESS] Document updated")
        return jsonify({"success": True}), 200

    except Exception as e:
        print("[ERROR] Exception occurred:", str(e))
        return jsonify({"error": str(e)}), 500

@routes.route('/api/send-email', methods=['POST'])
def send_email():
    try:
        data = request.get_json()
        to = data.get('to')
        subject = data.get('subject')
        body = data.get('body')

        if not to or not subject or not body:
            return jsonify({"error": "Missing required fields"}), 400

        # Get the access token from the Authorization header
        access_token = request.headers.get("Authorization").split("Bearer ")[-1]
        if not access_token:
            return jsonify({"error": "Access token is missing"}), 400

        # Build the email MIME message
        message = MIMEMultipart()
        message["to"] = to
        message["subject"] = subject
        msg = MIMEText(body)
        message.attach(msg)

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

        # Log the raw message and access token for debugging
        logging.info(f"Access Token: {access_token}")
        logging.info(f"Raw message: {raw_message}")

        # Send the email via Gmail API
        response = send_message(access_token, raw_message)

        if response.status_code != 200:
            logging.error(f"Failed to send email: {response.status_code} - {response.text}")
            return jsonify({"error": "Failed to send email", "details": response.json()}), 400

        return jsonify({"message": "Email sent successfully!"}), 200

    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return jsonify({"error": str(e)}), 500


def send_message(access_token, raw_message):
    """Send email using Gmail API"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "raw": raw_message,
    }

    response = requests.post(GOOGLE_API_URL, headers=headers, json=payload)
    return response


if __name__ == "__main__":
    app.run(debug=True)