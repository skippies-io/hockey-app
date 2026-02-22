import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to send magic link");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2>Check your email</h2>
        <p>
          We've sent a magic link to <strong>{email}</strong>.
        </p>
        <p>Click the link in the email to log in. The link will expire in 15 minutes.</p>
        <button
          className="btn-secondary"
          onClick={() => {
            setSuccess(false);
            setEmail("");
          }}
          style={{ marginTop: 12 }}
        >
          Send another link
        </button>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2>Admin Login</h2>
      <p>Enter your email to receive a magic link for admin access.</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label>
          <div style={{ marginBottom: 4 }}>Email</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            style={{ width: "100%" }}
          />
        </label>

        {error && (
          <div
            className="text-red-600"
            role="alert"
            style={{ marginTop: 12 }}
          >
            Error: {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ marginTop: 16, width: "100%" }}
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>

      <div style={{ marginTop: 24, fontSize: 14, color: "#666" }}>
        <p>
          A magic link will be sent to your email. Click the link to log in
          without a password.
        </p>
      </div>
    </div>
  );
}
