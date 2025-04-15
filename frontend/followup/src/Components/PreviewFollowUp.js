import React, { useState, useEffect } from "react";
import "../App.css";

const PreviewFollowUp = ({ job, onClose }) => {
  const [coverLetter, setCoverLetter] = useState(job.cover_letter);
  const [followUp, setFollowUp] = useState(job.follow_up);
  const [isEdited, setIsEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  useEffect(() => {
    setCoverLetter(job.cover_letter);
    setFollowUp(job.follow_up);
    setIsEdited(false);
  }, [job]);

  const handleSave = async () => {
    setTimeout(() => setSaveMessage(""), 11000);
    setIsSaving(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/edit-generation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: job.id,
            cover_letter: coverLetter,
            follow_up: followUp,
          }),
        }
      );

      if (!response.ok) throw new Error("Update failed");
      setSaveMessage("Changes saved successfully!");
      setIsEdited(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  // Close modal if background overlay is clicked
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!job) return null;

  return (
    <div className="preview-overlay" onClick={handleOverlayClick}>
      <div className="preview-modal">
        <h2 className="preview-title">{job.title}</h2>
        <p className="preview-company">{job.company}</p>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-job-link"
        >
          View Original Job Posting
        </a>

        <h3 className="preview-section-header">Cover Letter:</h3>
        <textarea
          className="preview-textarea"
          value={coverLetter}
          onChange={(e) => {
            setCoverLetter(e.target.value);
            setIsEdited(true);
          }}
        />

        <h3 className="preview-section-header">Follow-Up Email:</h3>
        <textarea
          className="preview-textarea"
          value={followUp}
          onChange={(e) => {
            setFollowUp(e.target.value);
            setIsEdited(true);
          }}
        />
        {saveMessage && (
          <p
            style={{
              fontSize: "1.3rem",
              color: "#15803d",
              marginTop: "10px",
              fontWeight: "500",
            }}
          >
            {saveMessage}
          </p>
        )}

        <div className="preview-actions">
          {isEdited && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="preview-save-button"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
          <button onClick={onClose} className="preview-close-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewFollowUp;
