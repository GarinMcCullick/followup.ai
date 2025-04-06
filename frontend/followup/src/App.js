import "./App.css";
import { useState } from "react";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";

export default function App() {
  const [coverLetter, setCoverLetter] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobPosting, setJobPosting] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file); // Set the selected file
      setFileName(file.name); // Set the file name to display in the label
    }
  };

  const handleSubmit = async () => {
    if (!resumeFile || !jobPosting) {
      alert("Please provide both a resume and job posting text.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("jobPosting", jobPosting); // Send job posting text instead of URL
      formData.append("resume", resumeFile);

      console.log("Sending request to backend with token:", token); // Log token being sent

      const res = await axios.post("http://localhost:5000/generate", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Backend response:", res.data); // Log backend response

      setCoverLetter(res.data.cover_letter);
      setFollowUp(res.data.follow_up);
    } catch (err) {
      alert("Error generating content.");
      console.error("Error:", err); // Log detailed error
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Sign in to use followup.ai</h1>
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            console.log(
              "Google login successful, token:",
              credentialResponse.credential
            ); // Log token from Google login
            setToken(credentialResponse.credential);

            // Optional: Send token to backend to verify
            axios
              .post("http://localhost:5000/login", {
                token: credentialResponse.credential,
              })
              .then((res) => {
                console.log("Login response:", res.data); // Log the response from backend
                setUser(res.data.user);
              })
              .catch(() => {
                console.error("Login failed");
                alert("Login failed");
              });
          }}
          onError={() => {
            alert("Login Failed");
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="Title">followup.ai</h1>
      <p className="User">Signed in as {user.name}</p>

      <textarea
        value={jobPosting}
        onChange={(e) => setJobPosting(e.target.value)}
        placeholder="Paste the job posting / description here..."
        className="textarea"
        rows="18"
        maxLength={4000}
      />
      <label className="file-button">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="file-input"
        />
        {fileName ? `📂 ${fileName}` : "📂 Choose File"}
      </label>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate"}
      </button>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="response-container">
          <h2 className="cover-letter-title">Cover Letter</h2>
          <pre className="cover-letter">{coverLetter}</pre>
          <h2 className="cover-letter-title">Follow Up Email</h2>
          <pre className="follow-up">{followUp}</pre>
        </div>
      )}
    </div>
  );
}
