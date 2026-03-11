import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminAuthed } from "../../lib/adminAuth";

export default function AdminRoute() {
  const loc = useLocation();
  if (!isAdminAuthed()) {
    const next = `${loc.pathname}${loc.search || ""}`;
    return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}
