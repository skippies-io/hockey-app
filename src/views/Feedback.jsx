import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
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

  const content = done ? (
    <Card>
      <h2 className="hj-section-header-title">Thanks! 🙌</h2>
      <p>Your feedback has been sent. We appreciate it.</p>
      <div className="hj-form-actions">
        <button className="btn-primary" onClick={() => navigate(cancelTo)}>
          Back to {ageId ? `${ageId} standings` : "home"}
        </button>
      </div>
    </Card>
  ) : (
    <Card>
      <form onSubmit={onSubmit} className="hj-form feedback-form">
        <div className="hj-form-field">
          <label className="hj-form-label" htmlFor="fb-name">
            Name (optional)
          </label>
          <input
            id="fb-name"
            className="hj-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="hj-form-field">
          <label className="hj-form-label" htmlFor="fb-email">
            Email (optional, for replies)
          </label>
          <input
            id="fb-email"
            type="email"
            className="hj-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="hj-form-field">
          <label className="hj-form-label" htmlFor="fb-message">
            Message
          </label>
          <textarea
            id="fb-message"
            required
            className="hj-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's working, what’s confusing, or what you'd love to see…"
          />
        </div>

        {err && <div className="text-red-600" role="alert">Error: {err}</div>}

        <div className="hj-form-actions">
          <button className="btn-primary" disabled={sending}>
            {sending ? "Sending…" : "Send feedback"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(cancelTo)}>
            Cancel
          </button>
        </div>

        <div className="hj-form-footnote">
          Route: {location.pathname}{ageId ? ` • Age: ${ageId}` : ""}
        </div>
      </form>
    </Card>
  );

  return (
    <div className="page-stack">
      {content}
    </div>
  );
}
