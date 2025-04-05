import "./App.css";
import { useState } from "react";
import axios from "axios";

export default function App() {
  const [url, setUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/generate", { url });
      setCoverLetter(res.data.cover_letter);
      setFollowUp(res.data.follow_up);
    } catch (err) {
      alert("Error generating content.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-4">followup.ai</h1>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste job URL (LinkedIn or Indeed)"
        className="border border-gray-400 p-2 w-full rounded mb-4"
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate"}
      </button>

      {coverLetter && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Cover Letter</h2>
          <pre className="bg-gray-100 p-4 whitespace-pre-wrap rounded mb-4">
            {coverLetter}
          </pre>

          <h2 className="text-xl font-semibold mb-2">Follow-Up Email</h2>
          <pre className="bg-gray-100 p-4 whitespace-pre-wrap rounded">
            {followUp}
          </pre>
        </div>
      )}
    </div>
  );
}
