import "./App.css";
import { useState } from "react";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";

export default function App() {
  const [coverLetter, setCoverLetter] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  //const [token, setToken] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobPosting, setJobPosting] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async (token) => {
    if (!resumeFile || !jobPosting) {
      alert("Please provide both a resume and job posting text.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("jobPosting", jobPosting);
      formData.append("resume", resumeFile);

      const res = await axios.post("http://localhost:5000/generate", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
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

  // Google Implicit flow for oauth2. this is not secure and user info could be spoofed but this way is easy. move to backend after testing.
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      const { access_token } = response; // Get the access token

      if (access_token) {
        // Use the access token to get user info from Google's UserInfo API
        try {
          const userInfoResponse = await axios.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${access_token}`, // Send the access token as a Bearer token
              },
            }
          );

          console.log("User Info:", userInfoResponse.data); // This should return the user's name, email, etc.
          setUser(userInfoResponse.data); // Set user data in state
        } catch (err) {
          console.error("Error fetching user info:", err);
        }
      } else {
        console.error("No access token received");
      }
    },
    onError: (error) => {
      console.error("Google login error:", error);
      alert("Login Failed");
    },
  });

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
