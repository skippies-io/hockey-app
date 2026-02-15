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

const emptyForm = { id: "", label: "", format: "" };

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ ...emptyForm, format: "Round-robin" });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => (a.id || "").localeCompare(b.id || "")),
    [groups]
  );

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/groups`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load groups");
      }
      setGroups(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    if (!formData.id.trim() || !formData.label.trim()) {
      setError("Group ID and Label are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formData.id,
          label: formData.label,
          format: formData.format,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to create group");
      }
      setFormData({ ...emptyForm, format: "Round-robin" });
      await loadGroups();
    } catch (err) {
      setError(err.message || "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(group) {
    setEditingId(group.id);
    setEditData({
      id: group.id || "",
      label: group.label || "",
      format: group.format || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(emptyForm);
  }

  async function handleSave(id) {
    setError("");
    if (!editData.label.trim()) {
      setError("Group label is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editData.label,
          format: editData.format,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update group");
      }
      cancelEdit();
      await loadGroups();
    } catch (err) {
      setError(err.message || "Failed to update group");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    const confirmed = window.confirm("Remove this group? This cannot be undone.");
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/groups/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to delete group");
      }
      if (editingId === id) cancelEdit();
      await loadGroups();
    } catch (err) {
      setError(err.message || "Failed to delete group");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p className="wizard-eyebrow">Admin Console</p>
          <h1>Groups</h1>
          <p className="wizard-subtitle">Manage group IDs and labels for tournament setup.</p>
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.card}>
        <h3 style={{ marginBottom: "var(--hj-space-3)" }}>Add Group</h3>
        <form onSubmit={handleCreate}>
          <div style={styles.formRow}>
            <div>
              <label style={styles.label} htmlFor="group-id">Group ID</label>
              <input
                id="group-id"
                style={styles.input}
                type="text"
                value={formData.id}
                onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
                placeholder="U11B"
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="group-label">Label</label>
              <input
                id="group-label"
                style={styles.input}
                type="text"
                value={formData.label}
                onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="U11 Boys"
              />
            </div>
            <div>
              <label style={styles.label} htmlFor="group-format">Format</label>
              <input
                id="group-format"
                style={styles.input}
                type="text"
                value={formData.format}
                onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value }))}
                placeholder="Round-robin"
              />
            </div>
            <div style={styles.actions}>
              <button style={styles.button} type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Add Group"}
              </button>
              <button
                style={styles.buttonSecondary}
                type="button"
                onClick={() => setFormData({ ...emptyForm, format: "Round-robin" })}
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginBottom: "var(--hj-space-3)" }}>Group List</h3>
        {loading ? (
          <div style={styles.empty}>Loading groups...</div>
        ) : sortedGroups.length === 0 ? (
          <div style={styles.empty}>No groups yet.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Group ID</th>
                  <th style={styles.th}>Label</th>
                  <th style={styles.th}>Format</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map((group) => {
                  const isEditing = editingId === group.id;
                  return (
                    <tr key={group.id}>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>{group.id}</td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.label}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, label: e.target.value }))
                            }
                          />
                        ) : (
                          group.label
                        )}
                      </td>
                      <td style={{ ...styles.td, ...styles.cellWrap }}>
                        {isEditing ? (
                          <input
                            style={styles.input}
                            type="text"
                            value={editData.format}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, format: e.target.value }))
                            }
                          />
                        ) : (
                          group.format || ""
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isEditing ? (
                            <>
                              <button
                                style={styles.button}
                                type="button"
                                onClick={() => handleSave(group.id)}
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
                                onClick={() => startEdit(group)}
                              >
                                Edit
                              </button>
                              <button
                                style={styles.buttonSecondary}
                                type="button"
                                onClick={() => handleDelete(group.id)}
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
