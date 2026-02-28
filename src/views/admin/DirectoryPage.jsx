import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { directoryStyles as styles } from "./adminDirectoryStyles";

const emptyObject = {};

export default function DirectoryPage({
  title,
  subtitle,
  addTitle,
  listTitle,
  emptyMessage,
  confirmDeleteMessage,
  fields,
  columns,
  sortItems,
  getInitialForm,
  buildEditData,
  validateCreate,
  validateEdit,
  getListUrl,
  getCreateRequest,
  getUpdateRequest,
  getDeleteRequest,
  rowKey,
  headerAddon,
  reloadKey,
  context = emptyObject,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(() => getInitialForm(context));
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(() => getInitialForm(context));
  const [submitting, setSubmitting] = useState(false);

  const sortedItems = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    return sortItems ? [...base].sort(sortItems) : base;
  }, [items, sortItems]);

  const resolvedRowKey = rowKey || ((item) => item.id);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(getListUrl(context));
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to load ${listTitle.toLowerCase()}`);
      }
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err.message || `Failed to load ${listTitle.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [context, getListUrl, listTitle]);

  useEffect(() => {
    loadItems();
  }, [loadItems, reloadKey]);

  useEffect(() => {
    setFormData(getInitialForm(context));
  }, [context, getInitialForm]);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    const validationError = validateCreate?.(formData, context);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const request = getCreateRequest(formData, context);
      const res = await fetch(request.url, request.options);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to create ${title.toLowerCase()}`);
      }
      setFormData(getInitialForm(context));
      await loadItems();
    } catch (err) {
      setError(err.message || `Failed to create ${title.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item) {
    const key = resolvedRowKey(item);
    setEditingId(key);
    setEditData(buildEditData(item));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(getInitialForm(context));
  }

  async function handleSave(item) {
    setError("");
    const validationError = validateEdit?.(editData, item, context);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const request = getUpdateRequest(item, editData, context);
      const res = await fetch(request.url, request.options);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to update ${title.toLowerCase()}`);
      }
      cancelEdit();
      await loadItems();
    } catch (err) {
      setError(err.message || `Failed to update ${title.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    setError("");
    const confirmed = window.confirm(confirmDeleteMessage);
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const request = getDeleteRequest(item, context);
      const res = await fetch(request.url, request.options);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Failed to delete ${title.toLowerCase()}`);
      }
      if (editingId === resolvedRowKey(item)) cancelEdit();
      await loadItems();
    } catch (err) {
      setError(err.message || `Failed to delete ${title.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  }

  function renderInput(field, value, onChange) {
    if (field.inputType === "textarea") {
      return (
        <textarea
          id={field.id}
          rows={field.rows || 2}
          style={styles.textarea}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
        />
      );
    }

    return (
      <input
        id={field.id}
        style={styles.input}
        type={field.type || "text"}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <p className="wizard-eyebrow">Admin Console</p>
          <h1>{title}</h1>
          <p className="wizard-subtitle">{subtitle}</p>
        </div>
        {headerAddon}
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <section style={styles.card}>
        <h3 style={{ marginBottom: "var(--hj-space-3)" }}>{addTitle}</h3>
        <form onSubmit={handleCreate}>
          <div style={styles.formRow}>
            {fields.map((field) => (
              <div key={field.key}>
                <label style={styles.label} htmlFor={field.id}>{field.label}</label>
                {renderInput(
                  field,
                  formData[field.key] ?? "",
                  (event) =>
                    setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                )}
              </div>
            ))}
            <div style={styles.actions}>
              <button style={styles.button} type="submit" disabled={submitting}>
                {submitting ? "Saving..." : addTitle}
              </button>
              <button
                style={styles.buttonSecondary}
                type="button"
                onClick={() => setFormData(getInitialForm(context))}
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginBottom: "var(--hj-space-3)" }}>{listTitle}</h3>
        {loading ? (
          <div style={styles.empty}>Loading {title.toLowerCase()}...</div>
        ) : sortedItems.length === 0 ? (
          <div style={styles.empty}>{emptyMessage}</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} style={styles.th}>{col.label}</th>
                  ))}
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const key = resolvedRowKey(item);
                  const isEditing = editingId === key;
                  return (
                    <tr key={key}>
                      {columns.map((col) => {
                        const editKey = col.editKey || col.key;
                        if (isEditing && col.editable) {
                          return (
                            <td key={col.key} style={{ ...styles.td, ...styles.cellWrap }}>
                              {renderInput(
                                { ...col, id: `${String(key)}-${editKey}` },
                                editData[editKey] ?? "",
                                (event) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    [editKey]: event.target.value,
                                  }))
                              )}
                            </td>
                          );
                        }

                        const rendered = col.render ? col.render(item) : (item[col.key] || "");
                        return (
                          <td key={col.key} style={{ ...styles.td, ...styles.cellWrap }}>
                            {rendered}
                          </td>
                        );
                      })}
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isEditing ? (
                            <>
                              <button
                                style={styles.button}
                                type="button"
                                onClick={() => handleSave(item)}
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
                                onClick={() => startEdit(item)}
                              >
                                Edit
                              </button>
                              <button
                                style={styles.buttonSecondary}
                                type="button"
                                onClick={() => handleDelete(item)}
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

DirectoryPage.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  addTitle: PropTypes.string.isRequired,
  listTitle: PropTypes.string.isRequired,
  emptyMessage: PropTypes.string.isRequired,
  confirmDeleteMessage: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      placeholder: PropTypes.string,
      id: PropTypes.string.isRequired,
      inputType: PropTypes.string,
      rows: PropTypes.number,
      type: PropTypes.string,
    })
  ).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      editable: PropTypes.bool,
      editKey: PropTypes.string,
      inputType: PropTypes.string,
      rows: PropTypes.number,
      render: PropTypes.func,
    })
  ).isRequired,
  sortItems: PropTypes.func,
  getInitialForm: PropTypes.func.isRequired,
  buildEditData: PropTypes.func.isRequired,
  validateCreate: PropTypes.func,
  validateEdit: PropTypes.func,
  getListUrl: PropTypes.func.isRequired,
  getCreateRequest: PropTypes.func.isRequired,
  getUpdateRequest: PropTypes.func.isRequired,
  getDeleteRequest: PropTypes.func.isRequired,
  rowKey: PropTypes.func,
  headerAddon: PropTypes.node,
  reloadKey: PropTypes.string,
  context: PropTypes.object,
};
