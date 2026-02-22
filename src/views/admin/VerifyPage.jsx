import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setError("No token provided");
      return;
    }

    async function verifyToken() {
      try {
        const response = await fetch("/api/admin/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Invalid or expired token");
        }

        // Store JWT token in localStorage
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_email", data.email);

        setStatus("success");

        // Redirect to admin announcements page after 2 seconds
        setTimeout(() => {
          navigate("/admin/announcements", { replace: true });
        }, 2000);
      } catch (err) {
        setStatus("error");
        setError(err.message);
      }
    }

    verifyToken();
  }, [searchParams, navigate]);

  if (status === "verifying") {
    return (
      <div className="p-4" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h2>Verifying your login...</h2>
        <p>Please wait whilst we verify your magic link.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="p-4" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h2>✓ Login successful!</h2>
        <p>You will be redirected to the admin panel...</p>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2>Login failed</h2>
      <p style={{ color: "#dc2626" }}>{error}</p>
      <p>
        The magic link may have expired or been used already. Links are valid for
        15 minutes and can only be used once.
      </p>
      <button
        className="btn-primary"
        onClick={() => navigate("/admin/login")}
        style={{ marginTop: 16 }}
      >
        Request a new link
      </button>
    </div>
  );
}
