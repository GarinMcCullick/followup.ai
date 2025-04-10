from flask import Blueprint, jsonify, request
from firebase import add_document  # Import Firestore function
from flask_cors import CORS

routes = Blueprint('routes', __name__)
CORS(routes, resources={r"/api/*": {"origins": ["http://localhost:3000", "https://www.indeed.com"]}})

@routes.route('/api/save-job', methods=['POST', 'OPTIONS'])
def save_job():
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight handled'})
        response.status_code = 200
        return response

    try:
        job_data = request.json
        title = job_data.get('title')
        company = job_data.get('company')
        url = job_data.get('url')

        if not title or not company or not url:
            return jsonify({"message": "Missing required fields"}), 400

        job_dict = {
            "title": title,
            "company": company,
            "url": url
        }

        # Call add_document and get the document ID
        job_id = add_document(job_dict)
        
        # If save is successful, log the success
        print(f"Job saved successfully with ID: {job_id}")
        
        return jsonify({"message": "Job saved successfully", "job_id": job_id}), 201
    
    except Exception as e:
        # Log the error
        print(f"Error occurred: {e}")
        return jsonify({"message": "Error saving job", "details": str(e)}), 500