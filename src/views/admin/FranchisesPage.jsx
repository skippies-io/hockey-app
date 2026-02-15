import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  textarea: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.95rem",
    outline: "none",
    resize: "vertical",
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
  select: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "0.85rem",
    backgroundColor: "white",
    color: "#111827",
  },
};

const emptyForm = {
  tournament_id: "",
  name: "",
  logo_url: "",
  manager_name: "",
  manager_photo_url: "",
  description: "",
  contact_phone: "",
  location_map_url: "",
  contact_email: "",
};

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [editingKey, setEditingKey] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const sortedFranchises = useMemo(
    () => [...franchises].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [franchises]
  );

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/tournaments`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      setTournaments(list);
      if (list.length && !selectedTournament) {
        setSelectedTournament(list[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, [selectedTournament]);

  const loadFranchises = useCallback(async (tournamentId) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/franchises?tournamentId=${encodeURIComponent(tournamentId)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load franchises");
      }
      setFranchises(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err.message || "Failed to load franchises");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (!selectedTournament) return;
    loadFranchises(selectedTournament);
  }, [selectedTournament, loadFranchises]);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    if (!selectedTournament) {
      setError("Select a tournament first.");
      return;
    }
    if (!formData.name.trim()) {
      setError("Franchise name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/franchises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tournament_id: selectedTournament,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to create franchise");
      }
      setFormData(emptyForm);
      await loadFranchises(selectedTournament);
    } catch (err) {
      setError(err.message || "Failed to create franchise");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(franchise) {
    const key = `${franchise.tournament_id}:${franchise.id}`;
    setEditingKey(key);
    setEditData({
      tournament_id: franchise.tournament_id,
      name: franchise.name || "",
      logo_url: franchise.logo_url || "",
      manager_name: franchise.manager_name || "",
      manager_photo_url: franchise.manager_photo_url || "",
      description: franchise.description || "",
      contact_phone: franchise.contact_phone || "",
      location_map_url: franchise.location_map_url || "",
      contact_email: franchise.contact_email || "",
    });
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditData(emptyForm);
  }

  async function handleSave(franchise) {
    setError("");
    if (!editData.name.trim()) {
      setError("Franchise name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/franchises/${franchise.id}?tournamentId=${encodeURIComponent(franchise.tournament_id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editData.name,
            logo_url: editData.logo_url,
            manager_name: editData.manager_name,
            manager_photo_url: editData.manager_photo_url,
            description: editData.description,
            contact_phone: editData.contact_phone,
            location_map_url: editData.location_map_url,
            contact_email: editData.contact_email,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update franchise");
      }
      cancelEdit();
      await loadFranchises(selectedTournament);
    } catch (err) {
      setError(err.message || "Failed to update franchise");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(franchise) {
    setError("");
    const confirmed = window.confirm("Remove this franchise? This cannot be undone.");
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/franchises/${franchise.id}?tournamentId=${encodeURIComponent(franchise.tournament_id)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete franchise");
      }
      if (editingKey === `${franchise.tournament_id}:${franchise.id}`) cancelEdit();
      await loadFranchises(selectedTournament);
    } catch (err) {
      setError(err.message || "Failed to delete franchise");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p className="wizard-eyebrow">Admin Console</p>
          <h1>Franchises</h1>
          <p className="wizard-subtitle">Manage club/franchise details.</p>
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h3 style={{ marginBottom: "var(--hj-space-3)" }}>Add Franchise</h3>
          <select
            style={styles.select}
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={handleCreate}>
          <div style={styles.formRow}>
            <div>
              <label style={styles.label} htmlFor="franchise-name">Name</label>
              <input
                id="franchise-name"
                style={styles.input}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Purple Panthers"
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="franchise-logo">Logo URL</label>
              <input
                id="franchise-logo"
                style={styles.input}
                type="text"
                value={formData.logo_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="franchise-manager">Manager Name</label>
              <input
                id="franchise-manager"
                style={styles.input}
                type="text"
                value={formData.manager_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, manager_name: e.target.value }))}
                placeholder="Manager name"
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="franchise-manager-photo">Manager Photo URL</label>
              <input
                id="franchise-manager-photo"
                style={styles.input}
                type="text"
                value={formData.manager_photo_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, manager_photo_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="franchise-contact">Contact Phone</label>
              <input
                id="franchise-contact"
                style={styles.input}
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="+27..."
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="franchise-email">Contact Email</label>
              <input
                id="franchise-email"
                style={styles.input}
                type="text"
                value={formData.contact_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="franchise-map">Location Map URL</label>
              <input
                id="franchise-map"
                style={styles.input}
                type="text"
                value={formData.location_map_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, location_map_url: e.target.value }))}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="franchise-desc">Description</label>
              <textarea
                id="franchise-desc"
                rows={2}
                style={styles.textarea}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Franchise description"
              />
            </div>
            <div style={styles.actions}>
              <button style={styles.button} type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Add Franchise"}
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
        <h3 style={{ marginBottom: "var(--hj-space-3)" }}>Franchise List</h3>
        {loading ? (
          <div style={styles.empty}>Loading franchises...</div>
        ) : sortedFranchises.length === 0 ? (
          <div style={styles.empty}>No franchises yet.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Tournament</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Manager</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>Logo URL</th>
                  <th style={styles.th}>Map URL</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFranchises.map((franchise) => {
                  const key = `${franchise.tournament_id}:${franchise.id}`;
                  const isEditing = editingKey === key;
                  return (
                    <tr key={key}>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>{franchise.tournament_id}</td>
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
                          franchise.name
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.manager_name}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, manager_name: e.target.value }))
                            }
                          />
                        ) : (
                          franchise.manager_name || ""
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.contact_email}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, contact_email: e.target.value }))
                            }
                          />
                        ) : (
                          franchise.contact_email || franchise.contact_phone || ""
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.logo_url}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, logo_url: e.target.value }))
                            }
                          />
                        ) : (
                          franchise.logo_url || ""
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
                        ) : (
                          franchise.location_map_url || ""
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            style={styles.textarea}
                            value={editData.description}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, description: e.target.value }))
                            }
                          />
                        ) : (
                          franchise.description || ""
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isEditing ? (
                            <>
                              <button
                                style={styles.button}
                                type="button"
                                onClick={() => handleSave(franchise)}
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
                                onClick={() => startEdit(franchise)}
                              >
                                Edit
                              </button>
                              <button
                                style={styles.buttonSecondary}
                                type="button"
                                onClick={() => handleDelete(franchise)}
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
