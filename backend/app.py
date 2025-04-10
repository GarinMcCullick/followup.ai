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
import requests
from routes import routes  # Import the Blueprint
import logging

# Initialize the Flask app
app = Flask(__name__)

# Load environment variables
load_dotenv()

# Set up OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

#googles token info api
GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"

from flask_cors import CORS

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "default_secret_key")

# Set up CORS
from flask_cors import CORS

# Apply CORS to all routes
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://www.indeed.com"]},
                     r"/generate": {"origins": ["http://localhost:3000"]},
                     r"/auth/callback": {"origins": ["http://localhost:3000"]}})
CORS(app, resources={r"*": {"origins": ["http://localhost:3000"]}})

# Register Blueprint
app.register_blueprint(routes)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise ValueError("Missing GOOGLE_CLIENT_ID in .env file")

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:3000/auth/callback"  # Same as frontend redirect

# Configure logging
logging.basicConfig(level=logging.INFO)

@app.route('/auth/callback', methods=['POST'])
def auth_callback():
    if request.method == 'OPTIONS':
        # Respond to preflight request
        return '', 200

    # Get the authorization code from the request body
    data = request.get_json()
    logging.info(f"Request data: {data}")
    
    code = data.get('code')
    client_id = data.get('clientId')
    redirect_uri = data.get('redirectUri')

    if not code or not client_id or not redirect_uri:
        return jsonify({"error": "Missing required fields"}), 400

    # Exchange the authorization code for an access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        'code': code,
        'client_id': client_id,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }

    token_response = requests.post(token_url, data=token_data)
    logging.info(f"Token response: {token_response.status_code} {token_response.text}")
    
    if token_response.status_code != 200:
        return jsonify({"error": "Failed to exchange authorization code for token"}), 400

    # Parse the response to get the access token and refresh token
    token_data = token_response.json()
    access_token = token_data.get('access_token')
    id_token = token_data.get('id_token')

    # Use the access token to retrieve the user's info from Google
    user_info_response = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    logging.info(f"User info response: {user_info_response.status_code} {user_info_response.text}")

    if user_info_response.status_code != 200:
        return jsonify({"error": "Failed to retrieve user info"}), 400

    # Parse the user info response
    user_info = user_info_response.json()

    # Return the user info along with the tokens
    return jsonify({
        "user": user_info,
        "access_token": access_token,
        "id_token": id_token,
    })

@app.route("/generate", methods=["POST"])
def generate():
    if request.method == "OPTIONS":
        # Handle preflight CORS requests
        return '', 200

    auth_header = request.headers.get("Authorization")
    extension_key = request.headers.get("X-Extension-API-Key")

    app.logger.info(f"Received Authorization header: {auth_header}")
    app.logger.info(f"Received Extension API Key: {extension_key}")
    # Step 1: Check if there's an Authorization header
    if auth_header:
        token = auth_header.split(" ")[1]  # Extract token from "Bearer {token}"
        try:
            # Verify the OAuth 2.0 token with Google's API
            id_info = id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)
            app.logger.info(f"Decoded token information: {id_info}")
        except Exception as e:
            app.logger.warning(f"OAuth token error: {e}")
            return jsonify({"error": "Invalid token"}), 401

    # Step 2: Check for the Extension API Key (for non-OAuth access)
    elif extension_key and extension_key == EXTENSION_API_KEY:
        app.logger.info("Authenticated using extension API key")
        # Continue without OAuth
        pass

    # Step 3: Unauthorized Access (No valid token or API key)
    else:
        app.logger.warning("Unauthorized access attempt")
        return jsonify({"error": "Unauthorized"}), 401

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