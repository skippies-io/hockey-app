import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Card from "../../components/Card";
import { requestMagicLink } from "../../lib/adminAuth";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminLogin() {
  const q = useQuery();
  const [email, setEmail] = useState(q.get("email") || "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const next = q.get("next") || "/admin";

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSent(false);

    const trimmed = String(email || "").trim().toLowerCase();
    if (!trimmed) {
      setErr("Please enter your email address.");
      return;
    }

    setBusy(true);
    try {
      await requestMagicLink(trimmed);
      setSent(true);
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack" style={{ maxWidth: 520 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Admin login</h1>
        <p style={{ color: "var(--hj-color-text-secondary)" }}>
          Enter your email and we’ll send you a sign-in link.
        </p>

        <form onSubmit={submit}>
          <label htmlFor="admin-email" style={{ display: "block", marginBottom: 8 }}>
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: "var(--hj-radius-md)",
              border: "1px solid var(--hj-color-border-subtle)",
              background: "var(--hj-color-surface-1)",
              color: "var(--hj-color-text-primary)",
              marginBottom: 12,
            }}
            disabled={busy}
          />

          <input type="hidden" name="next" value={next} readOnly />

          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "0.6rem 0.9rem",
              borderRadius: "var(--hj-radius-md)",
              border: "1px solid var(--hj-color-border-subtle)",
              background: "var(--hj-color-brand-primary)",
              color: "var(--hj-color-inverse-text)",
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Sending…" : "Send sign-in link"}
          </button>
        </form>

        {sent && (
          <p style={{ marginTop: 12 }}>
            Check your email for the sign-in link. You can close this tab.
          </p>
        )}

        {err && (
          <p style={{ marginTop: 12, color: "var(--hj-color-danger, #b91c1c)" }}>
            {err}
          </p>
        )}

        <p style={{ marginTop: 16, fontSize: "0.9em", color: "var(--hj-color-text-secondary)" }}>
          Tip: If you don’t see it, check spam. The link expires.
        </p>
      </Card>
    </div>
  );
}
