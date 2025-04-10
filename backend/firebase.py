import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os

# Load environment variables from a .env file
load_dotenv()

# Retrieve the path to the Firebase service account key from the environment variable
service_account_key_path = os.getenv("FIRESTORE_SERVICE_ACCOUNT_KEY_PATH")

if not service_account_key_path:
    raise ValueError("FIRESTORE_SERVICE_ACCOUNT_KEY_PATH environment variable not set")

# Initialize Firebase with the service account key
cred = credentials.Certificate(service_account_key_path)
firebase_admin.initialize_app(cred)

# Get a Firestore client
db = firestore.client()

def add_document(job_data):
    # Reference to the 'jobs' collection in Firestore
    collection_ref = db.collection('jobs')
    
    # Add the job data to Firestore
    doc_ref = collection_ref.add(job_data)[1]  # Correctly access the second item in the tuple
    
    return doc_ref.id  # Return the ID of the newly created document
