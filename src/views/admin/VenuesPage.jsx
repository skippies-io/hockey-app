import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../lib/api";

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "var(--hj-space-4)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "var(--hj-space-5)",
    flexWrap: "wrap",
    gap: "var(--hj-space-3)",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "var(--hj-radius-md)",
    padding: "var(--hj-space-5)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "var(--hj-space-4)",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "var(--hj-space-4)",
    alignItems: "end",
  },
  label: {
    display: "block",
    fontWeight: "600",
    fontSize: "0.9rem",
    marginBottom: "var(--hj-space-2)",
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.95rem",
    outline: "none",
  },
  actions: {
    display: "flex",
    gap: "var(--hj-space-2)",
    flexWrap: "wrap",
  },
  button: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid transparent",
    backgroundColor: "var(--hj-color-brand-primary)",
    color: "var(--hj-color-inverse-text)",
    cursor: "pointer",
    fontWeight: "600",
  },
  buttonSecondary: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    backgroundColor: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: "600",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.95rem",
    tableLayout: "fixed",
  },
  tableWrapper: {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
  },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    padding: "10px 8px",
    color: "#111827",
  },
  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top",
  },
  cellWrap: {
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  urlText: {
    display: "block",
    color: "#2563eb",
    textDecoration: "none",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  error: {
    color: "var(--hj-color-danger-ink)",
    marginBottom: "var(--hj-space-3)",
  },
  empty: {
    color: "#6b7280",
  },
};

const emptyForm = { name: "", address: "", location_map_url: "", website_url: "" };

function linkLabel(url, fallback) {
  if (!url) return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || fallback;
  } catch {
    return fallback;
  }
}

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const sortedVenues = useMemo(
    () => [...venues].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [venues]
  );

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/venues`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load venues");
      }
      setVenues(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err.message || "Failed to load venues");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    if (!formData.name.trim()) {
      setError("Venue name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/venues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          location_map_url: formData.location_map_url,
          website_url: formData.website_url,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to create venue");
      }
      setFormData(emptyForm);
      await loadVenues();
    } catch (err) {
      setError(err.message || "Failed to create venue");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(venue) {
    setEditingId(venue.id);
    setEditData({
      name: venue.name || "",
      address: venue.address || "",
      location_map_url: venue.location_map_url || "",
      website_url: venue.website_url || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(emptyForm);
  }

  async function handleSave(id) {
    setError("");
    if (!editData.name.trim()) {
      setError("Venue name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/venues/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editData.name,
          address: editData.address,
          location_map_url: editData.location_map_url,
          website_url: editData.website_url,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update venue");
      }
      cancelEdit();
      await loadVenues();
    } catch (err) {
      setError(err.message || "Failed to update venue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    const confirmed = window.confirm("Remove this venue? This cannot be undone.");
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/venues/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete venue");
      }
      if (editingId === id) cancelEdit();
      await loadVenues();
    } catch (err) {
      setError(err.message || "Failed to delete venue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p className="wizard-eyebrow">Admin Console</p>
          <h1>Venues</h1>
          <p className="wizard-subtitle">Manage venues and map links for directions.</p>
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.card}>
        <h3 style={{ marginBottom: "var(--hj-space-3)" }}>Add Venue</h3>
        <form onSubmit={handleCreate}>
          <div style={styles.formRow}>
            <div>
              <label style={styles.label} htmlFor="venue-name">Name</label>
              <input
                id="venue-name"
                style={styles.input}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Main Turf"
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="venue-address">Address</label>
              <input
                id="venue-address"
                style={styles.input}
                type="text"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="123 Example Rd, City"
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="venue-map">Map URL</label>
              <input
                id="venue-map"
                style={styles.input}
                type="text"
                value={formData.location_map_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location_map_url: e.target.value }))
                }
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="venue-website">Website</label>
              <input
                id="venue-website"
                style={styles.input}
                type="text"
                value={formData.website_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website_url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div style={styles.actions}>
              <button style={styles.button} type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Add Venue"}
              </button>
              <button
                style={styles.buttonSecondary}
                type="button"
                onClick={() => setFormData(emptyForm)}
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginBottom: "var(--hj-space-3)" }}>Venue List</h3>
        {loading ? (
          <div style={styles.empty}>Loading venues...</div>
        ) : sortedVenues.length === 0 ? (
          <div style={styles.empty}>No venues yet.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Address</th>
                  <th style={styles.th}>Map URL</th>
                  <th style={styles.th}>Website</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedVenues.map((venue) => {
                  const isEditing = editingId === venue.id;
                  return (
                    <tr key={venue.id}>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.name}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, name: e.target.value }))
                            }
                          />
                        ) : (
                          venue.name
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.address}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, address: e.target.value }))
                            }
                          />
                        ) : (
                          venue.address || ""
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.location_map_url}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, location_map_url: e.target.value }))
                            }
                          />
                        ) : venue.location_map_url ? (
                          <a
                            href={venue.location_map_url}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.urlText}
                            title={venue.location_map_url}
                          >
                            {linkLabel(venue.location_map_url, "Open map")}
                          </a>
                        ) : (
                          ""
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.website_url}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, website_url: e.target.value }))
                            }
                          />
                        ) : venue.website_url ? (
                          <a
                            href={venue.website_url}
                            target="_blank"
                            rel="noreferrer"
                            style={styles.urlText}
                            title={venue.website_url}
                          >
                            {linkLabel(venue.website_url, "Open site")}
                          </a>
                        ) : (
                          ""
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isEditing ? (
                            <>
                              <button
                                style={styles.button}
                                type="button"
                                onClick={() => handleSave(venue.id)}
                                disabled={submitting}
                              >
                                Save
                              </button>
                              <button
                                style={styles.buttonSecondary}
                                type="button"
                                onClick={cancelEdit}
                                disabled={submitting}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                style={styles.buttonSecondary}
                                type="button"
                                onClick={() => startEdit(venue)}
                              >
                                Edit
                              </button>
                              <button
                                style={styles.buttonSecondary}
                                type="button"
                                onClick={() => handleDelete(venue.id)}
                                disabled={submitting}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
