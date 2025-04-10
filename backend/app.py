import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2 import id_token
import openai
from resume_parser import extract_text_from_pdf, parse_resume
from generator import generate_content
from werkzeug.utils import secure_filename
import jwt
from routes import routes  # Import the Blueprint

# Initialize the Flask app
app = Flask(__name__)

# Load environment variables
load_dotenv()

# Set up OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

from flask_cors import CORS

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "default_secret_key")

# Set up CORS
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://www.indeed.com"]}})

# Register Blueprint
app.register_blueprint(routes)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise ValueError("Missing GOOGLE_CLIENT_ID in .env file")

''' this is the endpoint for AUTHENTICATION FLOW with Google Currently doing all this in front end for getting user info / token
@app.route("/login", methods=["POST"])
def login():
    token = request.json.get("token")  # ID token from frontend
    app.logger.info(f"Received token: {token}")

    try:
        # Verify the token with Google's OAuth2 API
        id_info = id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)
        app.logger.info(f"Token decoded successfully: {id_info}")

        user = {
            'user_id': id_info["sub"],
            'email': id_info.get("email"),
            'name': id_info.get("name")
        }
        return jsonify({"message": "User authenticated", "user": user})
    
    except ValueError:
        app.logger.warning("Invalid token")
        return jsonify({"error": "Invalid token"}), 400

if __name__ == "__main__":
    app.run(debug=True)
'''

@app.route("/generate", methods=["POST"])
def generate():
    auth_header = request.headers.get("Authorization")
    app.logger.info(f"Received Authorization header: {auth_header}")
    if not auth_header or not auth_header.startswith("Bearer "):
        app.logger.warning("Missing or invalid auth token")
        return jsonify({"error": "Missing or invalid auth token"}), 401

    token = auth_header.split(" ")[1]
    app.logger.info(f"Extracted token: {token}")

    try:
        id_info = id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)
        app.logger.info(f"Decoded token information: {id_info}")
    except ValueError:
        app.logger.warning("Invalid token")
        return jsonify({"error": "Invalid token"}), 401
    except jwt.ExpiredSignatureError:
        app.logger.warning("Token has expired")
        return jsonify({"error": "Token has expired"}), 401
    except jwt.InvalidTokenError:
        app.logger.warning("Invalid token")
        return jsonify({"error": "Invalid token"}), 401

    app.logger.info(f"Headers: {request.headers}")
    app.logger.info(f"Files: {request.files}")
    app.logger.info(f"Form Data: {request.form}")

    if "resume" not in request.files or ("job_description" not in request.form and "jobPosting" not in request.form):
        app.logger.warning("Missing resume file or job description")
        return jsonify({"error": "Missing resume file or job description"}), 400

    resume_file = request.files["resume"]
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
        app.logger.error(f"Error processing resume: {e}")
        return jsonify({"error": "Error processing the resume file"}), 500

    # Ensure parsed_resume is a dictionary
    if not isinstance(parsed_resume, dict):
        app.logger.warning(f"Expected parsed_resume to be a dictionary, but got {type(parsed_resume)}")
        return jsonify({"error": "Parsed resume should be a dictionary, not a string."}), 400

    # Ensure job_description is not empty
    if not job_description:
        app.logger.warning("Missing or empty job description")
        return jsonify({"error": "Job description is required"}), 400

    # Generate content (cover letter and follow-up email)
    try:
        cover_letter, follow_up = generate_content(parsed_resume, job_description)
    except Exception as e:
        app.logger.error(f"Error generating content: {e}")
        return jsonify({"error": "Error generating cover letter or follow-up email"}), 500

    return jsonify({
        "cover_letter": cover_letter,
        "follow_up": follow_up
    })

if __name__ == "__main__":
    app.run(debug=True)
