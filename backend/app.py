from flask import Flask, request, jsonify
from flask_cors import CORS
from scraper import scrape_job_posting
from generator import generate_content

app = Flask(__name__)
CORS(app)  # Allow React frontend to call backend

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    url = data.get("url")

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    job_info = scrape_job_posting(url)
    cover_letter, follow_up = generate_content(job_info)
    return jsonify({
        "cover_letter": cover_letter,
        "follow_up": follow_up
    })

if __name__ == "__main__":
    app.run(debug=True)
