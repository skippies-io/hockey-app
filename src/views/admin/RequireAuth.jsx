import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Auth guard component for admin routes
 * Redirects to login if no valid token is present
 */
export default function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("admin_token");

  if (!token) {
    // Redirect to login, saving the attempted location
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // TODO: Add JWT expiry validation here
  // For now, we trust the token. The backend will validate it on each request.
  
  return children;
}

RequireAuth.propTypes = {
  children: PropTypes.node.isRequired,
};
