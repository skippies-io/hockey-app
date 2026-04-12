import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FranchiseForm from './FranchiseForm';
import {
  createFranchise,
  deleteFranchise,
  getFranchises,
  importFranchises,
  updateFranchise,
} from '../../lib/franchiseApi';

export default function FranchisesPage() {
  const params = useParams();
  // FranchisesPage is mounted under `/admin/franchises/*` in App.jsx, so React Router
  // stores the trailing segment in the `*` param, not `franchiseId`.
  const franchiseId = params.franchiseId || (params['*'] ? params['*'].split('/')[0] : undefined);
  const navigate = useNavigate();

  const [franchises, setFranchises] = useState([]);
  const [currentFranchise, setCurrentFranchise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState('');

  const isNew = franchiseId === 'new';
  const isEditing = Boolean(franchiseId && franchiseId !== 'new');
  const showForm = isNew || isEditing;

  const franchiseById = useMemo(() => {
    const map = new Map(franchises.map((f) => [String(f.id), f]));
    return map;
  }, [franchises]);

  useEffect(() => {
    if (showForm) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setImportResult('');
        const data = await getFranchises();
        if (!alive) return;
        setFranchises(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!alive) return;
        setError(`Failed to load franchises: ${err.message}`);
        setFranchises([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [showForm]);

  useEffect(() => {
    if (!isEditing) {
      setCurrentFranchise(null);
      return;
    }

    setCurrentFranchise(franchiseById.get(String(franchiseId)) || null);
  }, [isEditing, franchiseId, franchiseById]);

  const handleSave = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      if (isNew) {
        await createFranchise(formData);
      } else if (isEditing) {
        await updateFranchise(franchiseId, formData);
      }

      const data = await getFranchises();
      setFranchises(Array.isArray(data) ? data : []);
      setCurrentFranchise(null);
      navigate('/admin/franchises', { replace: true });
    } catch (err) {
      setError(`Failed to save franchise: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this franchise? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteFranchise(id);
      const data = await getFranchises();
      setFranchises(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Failed to delete franchise: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);
      setImportResult('');

      const inserted = await importFranchises(importText);
      const count = inserted.length;
      setImportResult(count === 0 ? 'No new franchises were added.' : `Added ${count} franchise${count === 1 ? '' : 's'}.`);
      setImportText('');

      const data = await getFranchises();
      setFranchises(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Failed to import franchises: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentFranchise(null);
    navigate('/admin/franchises', { replace: true });
  };

  if (showForm) {
    return (
      <div>
        <h1 style={{ marginBottom: 'var(--hj-space-4)' }}>{isNew ? 'Create Franchise' : 'Edit Franchise'}</h1>
        <FranchiseForm
          franchise={currentFranchise}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={loading}
          error={error}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--hj-space-6)',
        }}
      >
        <h1 style={{ margin: 0 }}>Franchises</h1>
        <button
          type="button"
          onClick={() => navigate('/admin/franchises/new')}
          style={{
            padding: 'var(--hj-space-2) var(--hj-space-4)',
            borderRadius: 'var(--hj-radius-md)',
            backgroundColor: 'var(--hj-color-brand-primary)',
            color: 'var(--hj-color-inverse-text)',
            border: 'none',
            fontWeight: 'var(--hj-font-weight-bold)',
            cursor: 'pointer',
          }}
        >
          + Add Franchise
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--hj-space-3)',
            marginBottom: 'var(--hj-space-4)',
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: 'var(--hj-radius-md)',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {importResult && (
        <div
          style={{
            padding: 'var(--hj-space-3)',
            marginBottom: 'var(--hj-space-4)',
            backgroundColor: 'var(--hj-color-surface-2)',
            color: 'var(--hj-color-text-primary)',
            borderRadius: 'var(--hj-radius-md)',
            border: '1px solid var(--hj-color-border-subtle)',
          }}
          role="status"
        >
          {importResult}
        </div>
      )}

      <div
        style={{
          padding: 'var(--hj-space-4)',
          borderRadius: 'var(--hj-radius-md)',
          border: '1px solid var(--hj-color-border-subtle)',
          backgroundColor: 'var(--hj-color-surface-2)',
          marginBottom: 'var(--hj-space-6)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 'var(--hj-space-3)' }}>Bulk import</h2>
        <p style={{ marginTop: 0, color: 'var(--hj-color-text-secondary)' }}>
          Paste one franchise name per line (CSV supported — only the first column is used).
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={5}
          disabled={loading}
          style={{
            width: '100%',
            padding: 'var(--hj-space-2)',
            borderRadius: 'var(--hj-radius-md)',
            border: '1px solid var(--hj-color-border)',
            fontSize: 'var(--hj-font-size-base)',
            marginBottom: 'var(--hj-space-3)',
          }}
          placeholder={'Example:\nAlpha\nBeta\nGamma'}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={loading || !importText.trim()}
          style={{
            padding: 'var(--hj-space-2) var(--hj-space-4)',
            borderRadius: 'var(--hj-radius-md)',
            backgroundColor: 'var(--hj-color-brand-primary)',
            color: 'var(--hj-color-inverse-text)',
            border: 'none',
            fontWeight: 'var(--hj-font-weight-bold)',
            cursor: loading || !importText.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !importText.trim() ? 0.6 : 1,
          }}
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </div>

      {loading && <div>Loading franchises…</div>}

      {!loading && franchises.length === 0 && (
        <div
          style={{
            padding: 'var(--hj-space-4)',
            textAlign: 'center',
            color: 'var(--hj-color-text-secondary)',
          }}
        >
          No franchises yet. Create one to get started.
        </div>
      )}

      {!loading && franchises.length > 0 && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: 'var(--hj-space-4)',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid var(--hj-color-border)' }}>
              <th
                style={{
                  padding: 'var(--hj-space-3)',
                  textAlign: 'left',
                  fontWeight: 'var(--hj-font-weight-bold)',
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: 'var(--hj-space-3)',
                  textAlign: 'left',
                  fontWeight: 'var(--hj-font-weight-bold)',
                }}
              >
                Manager
              </th>
              <th
                style={{
                  padding: 'var(--hj-space-3)',
                  textAlign: 'right',
                  fontWeight: 'var(--hj-font-weight-bold)',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {franchises.map((franchise) => (
              <tr
                key={franchise.id}
                style={{ borderBottom: '1px solid var(--hj-color-border-subtle)' }}
              >
                <td style={{ padding: 'var(--hj-space-3)' }}>{franchise.name}</td>
                <td style={{ padding: 'var(--hj-space-3)' }}>{franchise.manager_name || '—'}</td>
                <td
                  style={{
                    padding: 'var(--hj-space-3)',
                    textAlign: 'right',
                    display: 'flex',
                    gap: 'var(--hj-space-2)',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/franchises/${franchise.id}`)}
                    style={{
                      padding: 'var(--hj-space-1) var(--hj-space-3)',
                      borderRadius: 'var(--hj-radius-sm)',
                      backgroundColor: 'var(--hj-color-brand-primary)',
                      color: 'var(--hj-color-inverse-text)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 'var(--hj-font-size-sm)',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(franchise.id)}
                    style={{
                      padding: 'var(--hj-space-1) var(--hj-space-3)',
                      borderRadius: 'var(--hj-radius-sm)',
                      backgroundColor: '#fee',
                      color: '#c00',
                      border: '1px solid #fcc',
                      cursor: 'pointer',
                      fontSize: 'var(--hj-font-size-sm)',
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
