import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { sendFeedback } from "../lib/api";

export default function Feedback() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const params   = useParams();
  const ageId    = params.ageId || "";

  const cancelTo = ageId ? `/${ageId}/standings` : `/`;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!message.trim()) { setErr("Please enter your message."); return; }
    try {
      setSending(true);
      await sendFeedback({
        name, email, message,
        route: location.pathname + location.search + location.hash,
        ageId
      });
      setDone(true);
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="p-4" style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2>Thanks! 🙌</h2>
        <p>Your feedback has been sent. We appreciate it.</p>
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={() => navigate(cancelTo)}>
            Back to {ageId ? `${ageId} standings` : "home"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 className="title" style={{ marginBottom: 12 }}>Send feedback</h2>
      <form onSubmit={onSubmit} className="feedback-form" style={{ display: "grid", gap: 10 }}>
        <label>
          <div>Name (optional)</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
        </label>

        <label>
          <div>Email (optional, for replies)</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </label>

        <label>
          <div>Message</div>
          <textarea
            required
            rows={5}
            value={message}
            onChange={e=>setMessage(e.target.value)}
            placeholder="Tell us what's working, what’s confusing, or what you'd love to see…"
          />
        </label>

        {err && <div className="text-red-600" role="alert">Error: {err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn-primary" disabled={sending}>
            {sending ? "Sending…" : "Send feedback"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(cancelTo)}>
            Cancel
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#666" }}>
          Route: {location.pathname}{ageId ? ` • Age: ${ageId}` : ""}
        </div>
      </form>
    </div>
  );
}