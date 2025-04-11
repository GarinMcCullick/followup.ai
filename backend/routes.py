from flask import Blueprint, jsonify, request
from firebase import add_document, get_document  # Correct the typo here
from flask_cors import CORS
import datetime
from datetime import datetime, timedelta
from firebase import db  # Assuming 'db' is defined in firebase.py and initialized correctly

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
        date = job_data.get('date')

        if not title or not company or not url:
            return jsonify({"message": "Missing required fields"}), 400

        job_dict = {
            "date": date,
            "title": title,
            "company": company,
            "url": url,
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