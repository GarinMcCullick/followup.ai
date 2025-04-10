import "./App.css";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { jwtDecode } from "jwt-decode";

export default function App() {
  const [coverLetter, setCoverLetter] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobPosting, setJobPosting] = useState("");
  const [fileName, setFileName] = useState("");
  const navigate = useNavigate(); // Use useNavigate

  const handleGoogleCallback = useCallback(
    async (code) => {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      const redirectUri = "http://localhost:3000/auth/callback";

      try {
        const res = await axios.post(
          "http://localhost:5000/auth/callback",
          {
            code,
            clientId,
            redirectUri,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Log the response to check the token structure
        console.log("Response from token exchange:", res.data);

        const { id_token } = res.data;

        if (!id_token) {
          throw new Error("ID token not found in response");
        }

        setToken(id_token);

        const decodedToken = jwtDecode(id_token);
        setUser(decodedToken);
        navigate("/");
      } catch (error) {
        console.error("Error during Google login callback:", error);
        alert("Login failed. Please try again.");
      }
    },
    [navigate]
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      handleGoogleCallback(code);
    }
  }, [handleGoogleCallback]); // Now it's safe to use handleGoogleCallback here

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setFileName(file.name);
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
      formData.append("jobPosting", jobPosting);
      formData.append("resume", resumeFile);

      // Send the token with the request to the backend
      const res = await axios.post("http://localhost:5000/generate", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`, // Include the token in the Authorization header
        },
      });

      setCoverLetter(res.data.cover_letter);
      setFollowUp(res.data.follow_up);
    } catch (err) {
      alert("Error generating content.");
      console.error("Error:", err);
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = "http://localhost:3000/auth/callback"; // Your redirect URL
    const scope = "openid profile email"; // Requesting necessary scopes
    const responseType = "code"; // Use 'code' for Authorization Code Flow
    const accessType = "offline"; // To get refresh token, if needed

    // Construct the Google OAuth URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&access_type=${accessType}`;

    // Redirect the user to Google for authentication
    window.location.href = authUrl;
  };

  // 🔐 Login screen with animated background
  if (!user) {
    return (
      <div className="login-screen">
        <div className="stars"></div>
        <div className="twinkling"></div>
        <div className="login-form">
          <div className="login-btn-container">
            <button className="google-login-btn" onClick={handleGoogleLogin}>
              Sign in with Google 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container text-white bg-black min-h-screen p-6">
      <h1 className="Title text-4xl font-bold mb-2">followup.ai</h1>
      <p className="User mb-4">Signed in as {user.name}</p>

      <textarea
        value={jobPosting}
        onChange={(e) => setJobPosting(e.target.value)}
        placeholder="Paste the job posting / description here..."
        className="textarea w-full p-3 rounded mb-4 text-black"
        rows="18"
        maxLength={4000}
      />
      <label className="file-button mb-4 block text-sm">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="file-input hidden"
        />
        <span className="cursor-pointer bg-gray-700 px-4 py-2 rounded inline-block">
          {fileName ? `📂 ${fileName}` : "📂 Choose File"}
        </span>
      </label>

      <button
        onClick={handleSubmit}
        className="generate-button"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate"}
      </button>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="response-container">
          <h2 className="cover-letter-title font-bold text-xl mt-4">
            Cover Letter
          </h2>
          <pre className="cover-letter whitespace-pre-wrap">{coverLetter}</pre>
          <h2 className="cover-letter-title font-bold text-xl mt-4">
            Follow Up Email
          </h2>
          <pre className="follow-up whitespace-pre-wrap">{followUp}</pre>
        </div>
      )}
    </div>
  );
}
