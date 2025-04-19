import "./App.css";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { jwtDecode } from "jwt-decode";
import PreviewFollowUp from "./Components/PreviewFollowUp";

export default function App() {
  const [coverLetter, setCoverLetter] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [buttonLoadingState, setButtonLoadingState] = useState({});
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobPosting, setJobPosting] = useState("");
  const [jobs, setJobs] = useState([]); // State to hold jobs data
  const [fileName, setFileName] = useState("");
  const [previewFollowUp, setPreviewFollowUp] = useState(null); // State to control preview
  const navigate = useNavigate(); // Use useNavigate
  const [sendAllLoading, setSendAllLoading] = useState({
    coverLetters: false,
    followUps: false,
  });

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
        const { access_token } = res.data; // Extract access token from response
        localStorage.setItem("gmailAccessToken", access_token);

        if (!id_token) {
          throw new Error("ID token not found in response");
        }

        setToken(id_token);

        const decodedToken = jwtDecode(id_token);
        setUser(decodedToken);
        navigate("/");

        // Now that login is successful, fetch the jobs
        const fetchJobs = async () => {
          try {
            const response = await fetch("http://localhost:5000/api/get-jobs", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (response.ok) {
              const jobData = await response.json();
              // Handle the received jobs data, for example:
              console.log("Fetched jobs:", jobData);
              // Update your state with the job data
              setJobs(jobData);
            } else {
              console.error("Failed to fetch jobs");
            }
          } catch (error) {
            console.error("Error fetching jobs:", error);
          }
        };

        fetchJobs(); // Fetch jobs after login success
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

  const handleViewFollowUp = async (jobId) => {
    // Set loading for the specific job
    setButtonLoadingState((prevState) => ({ ...prevState, [jobId]: true }));

    try {
      const response = await fetch(`http://localhost:5000/api/get-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });

      if (!response.ok) throw new Error("Failed to fetch job");

      const freshJob = await response.json();
      setPreviewFollowUp(freshJob);
    } catch (err) {
      console.error("Error fetching updated job:", err);
      alert("Failed to load job details.");
    } finally {
      // Set loading to false after fetch completes for this specific job
      setButtonLoadingState((prevState) => ({ ...prevState, [jobId]: false }));
    }
  };

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

  async function sendEmail(job, type) {
    try {
      // Set loading state for the specific job
      setButtonLoadingState((prevState) => ({ ...prevState, [job.id]: true }));

      const { to, id, subject, body } = job;

      if (!to || !id || !type) {
        throw new Error("Missing required fields: 'to', 'id', or 'type'");
      }

      const accessToken = localStorage.getItem("gmailAccessToken");

      const response = await fetch("http://localhost:5000/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ to, subject, body, id, email_type: type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unknown error");
      }

      console.log(`Email sent successfully for type: ${type}`);

      // Update the job's status in the UI
      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === job.id
            ? {
                ...j,
                cover_letter_sent:
                  type === "send_all_cover_letters" || type === "cover_letter"
                    ? true
                    : j.cover_letter_sent,
                follow_up_sent:
                  type === "send_all_follow_ups" || type === "follow_up"
                    ? true
                    : j.follow_up_sent,
              }
            : j
        )
      );
    } catch (err) {
      console.error(`Error sending email for type ${type}:`, err.message);
    } finally {
      // Reset loading state for the specific job
      setButtonLoadingState((prevState) => ({ ...prevState, [job.id]: false }));
    }
  }

  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = "http://localhost:3000/auth/callback";
    const scope = [
      "openid",
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.send", // ✨ Add this!
    ].join(" ");
    const responseType = "code";
    const accessType = "offline";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(
      scope
    )}&access_type=${accessType}&prompt=consent`;

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
    <>
      {previewFollowUp && (
        <PreviewFollowUp
          job={previewFollowUp}
          onClose={() => setPreviewFollowUp(null)}
        />
      )}
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
        {/* Show loading only while generating */}
        {loading && (
          <div className="loading-generation">
            <div className="spinner"></div>
            <span>Generating content...</span>
          </div>
        )}
        {/* Show results only after content has been generated */}
        {!loading && coverLetter && followUp && (
          <div className="response-container mt-6">
            <h2 className="cover-letter-title font-bold text-xl mt-4">
              Cover Letter
            </h2>
            <pre className="cover-letter whitespace-pre-wrap">
              {coverLetter}
            </pre>

            <h2 className="cover-letter-title font-bold text-xl mt-4">
              Follow Up Email
            </h2>
            <pre className="follow-up whitespace-pre-wrap">{followUp}</pre>
          </div>
        )}
        <div>
          <h2 className="jobs-header">Applied Jobs</h2>
          {jobs.length === 0 ? (
            <p>No jobs available</p>
          ) : (
            <div className="job-list-container">
              <table className="job-table">
                <thead>
                  <tr>
                    <th>Date Applied</th>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Job Posting</th>
                    <th>AI FollowUp</th>
                    <th>
                      <label>Cover Letters</label>
                      <button
                        className="send-all-cover-letter"
                        onClick={async () => {
                          setSendAllLoading((prevState) => ({
                            ...prevState,
                            coverLetters: true,
                          }));
                          const accessToken =
                            localStorage.getItem("gmailAccessToken");
                          if (!accessToken) {
                            setSendAllLoading((prevState) => ({
                              ...prevState,
                              coverLetters: false,
                            }));
                            console.error("No Gmail access token found.");
                            return;
                          }

                          // Filter jobs to only include those that haven't sent cover letters
                          const unsentJobs = jobs.filter(
                            (job) => !job.cover_letter_sent
                          );

                          for (const job of unsentJobs) {
                            if (job.cover_letter && job.contact_email) {
                              await sendEmail(
                                {
                                  to: job.contact_email, // Explicitly pass the recipient's email
                                  id: job.id, // Firestore document ID
                                  subject: `Application for ${job.title}`, // Email subject
                                  body: job.cover_letter, // Email body
                                },
                                "send_all_cover_letters"
                              );
                            }
                          }

                          console.log("All unsent cover letters sent.");

                          // Update the state to mark cover letters as sent
                          setJobs((prevJobs) =>
                            prevJobs.map((job) =>
                              !job.cover_letter_sent
                                ? { ...job, cover_letter_sent: true }
                                : job
                            )
                          );
                          setSendAllLoading((prevState) => ({
                            ...prevState,
                            coverLetters: false,
                          }));
                        }}
                        disabled={sendAllLoading.coverLetters}
                      >
                        {sendAllLoading.coverLetters ? (
                          <span className="loader"></span>
                        ) : (
                          "Send All"
                        )}
                      </button>
                    </th>
                    <th>
                      <label>FollowUp Emails</label>
                      <button
                        className="send-all-followup"
                        onClick={async () => {
                          setSendAllLoading((prevState) => ({
                            ...prevState,
                            followUps: true,
                          }));
                          const accessToken =
                            localStorage.getItem("gmailAccessToken");
                          if (!accessToken) {
                            setSendAllLoading((prevState) => ({
                              ...prevState,
                              followUps: false,
                            }));
                            console.error("No Gmail access token found.");
                            return;
                          }

                          // Filter jobs to only include those that haven't sent follow-ups
                          const unsentJobs = jobs.filter(
                            (job) => !job.follow_up_sent
                          );

                          for (const job of unsentJobs) {
                            if (job.follow_up && job.contact_email) {
                              await sendEmail(
                                {
                                  to: job.contact_email, // Explicitly pass the recipient's email
                                  id: job.id, // Firestore document ID
                                  subject: `Follow up for ${job.title}`, // Email subject
                                  body: job.follow_up, // Email body
                                },
                                "send_all_follow_ups"
                              );
                            }
                          }

                          console.log("All unsent follow-up emails sent.");

                          // Update the state to mark follow-ups as sent
                          setJobs((prevJobs) =>
                            prevJobs.map((job) =>
                              !job.follow_up_sent
                                ? { ...job, follow_up_sent: true }
                                : job
                            )
                          );
                          setSendAllLoading((prevState) => ({
                            ...prevState,
                            followUps: false,
                          }));
                        }}
                      >
                        {sendAllLoading.followUps ? (
                          <span className="loader"></span>
                        ) : (
                          "Send All"
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="job-row">
                      <td className="job-date">{job.date}</td>
                      <td className="job-title">{job.title}</td>
                      <td className="job-company">{job.company}</td>
                      <td className="job-link">
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Job
                        </a>
                      </td>
                      <td className="job-generated-preview">
                        <button
                          onClick={async () => {
                            try {
                              await handleViewFollowUp(job.id);
                            } catch (error) {
                              console.error(
                                "Error in handleViewFollowUp:",
                                error
                              );
                              alert("Failed to load job details.");
                            }
                          }}
                          className="preview-button"
                        >
                          View FollowUp
                        </button>
                      </td>
                      <td className="job-send">
                        {job.cover_letter_sent ? (
                          <span
                            id="cover_letter_sent_text"
                            className="sent-text"
                          >
                            {" "}
                            {new Date(
                              job.cover_letter_sent_at
                            ).toLocaleDateString("en-US")}
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              sendEmail(
                                {
                                  to: job.contact_email, // Explicitly pass the recipient's email
                                  id: job.id, // Firestore document ID
                                  subject: `Application for ${job.title}`, // Email subject
                                  body: job.cover_letter, // Email body
                                },
                                "cover_letter"
                              )
                            }
                            className="send-cover-letter"
                            disabled={buttonLoadingState[job.id]} // Disable button while loading
                          >
                            {buttonLoadingState[job.id] ? (
                              <span className="loader"></span> // Show loader while loading
                            ) : (
                              "Send"
                            )}
                          </button>
                        )}
                      </td>
                      <td className="job-send">
                        {job.follow_up_sent ? (
                          <span className="sent-text">
                            {" "}
                            {new Date(job.follow_up_sent_at).toLocaleDateString(
                              "en-US"
                            )}
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              sendEmail(
                                {
                                  to: job.contact_email, // Explicitly pass the recipient's email
                                  id: job.id, // Firestore document ID
                                  subject: `Follow up for ${job.title}`, // Email subject
                                  body: job.follow_up, // Email body
                                },
                                "follow_up"
                              )
                            }
                            className="send-followup"
                            disabled={buttonLoadingState[job.id]} // Disable button while loading
                          >
                            {buttonLoadingState[job.id] ? (
                              <span className="loader"></span> // Show loader while loading
                            ) : (
                              "Send"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="footer">
          <div className="footer-text">
            <p>© 2025 FollowUp.ai. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
}
