import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Card from "../../components/Card";
import { setAdminSession, verifyMagicToken } from "../../lib/adminAuth";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function AdminLoginCallback() {
  const q = useQuery();
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const token = q.get("token") || "";
  const next = q.get("next") || "/admin";

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        setErr("Missing token.");
        return;
      }

      try {
        const res = await verifyMagicToken(token);
        if (!alive) return;
        setAdminSession({ token: res.token, email: res.email, expiresAt: res.expiresAt });
        setDone(true);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  if (done) return <Navigate to={next} replace />;

  return (
    <div className="page-stack" style={{ maxWidth: 520 }}>
      <Card>
        <h1 style={{ marginTop: 0 }}>Signing you in…</h1>
        {err ? (
          <p style={{ color: "var(--hj-color-danger, #b91c1c)" }}>{err}</p>
        ) : (
          <p style={{ color: "var(--hj-color-text-secondary)" }}>
            Verifying your sign-in link.
          </p>
        )}
      </Card>
    </div>
  );
}
