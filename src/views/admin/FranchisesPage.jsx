import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FranchiseForm from './FranchiseForm';
import {
  createFranchise,
  deleteFranchise,
  getFranchises,
} from '../../lib/franchiseApi';

export default function FranchisesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = location.pathname.endsWith('/new');

  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNew) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
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

    return () => { alive = false; };
  }, [isNew]);

  const handleSave = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      await createFranchise(formData);
      const data = await getFranchises();
      setFranchises(Array.isArray(data) ? data : []);
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

  const handleCancel = () => {
    navigate('/admin/franchises', { replace: true });
  };

  if (isNew) {
    return (
      <div>
        <h1 style={{ marginBottom: 'var(--hj-space-4)' }}>Create Franchise</h1>
        <FranchiseForm
          franchise={null}
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
                <td style={{ padding: 'var(--hj-space-3)' }}>
                  <Link
                    to={`/admin/franchises/${franchise.id}`}
                    style={{
                      color: 'var(--hj-color-brand-primary)',
                      textDecoration: 'none',
                      fontWeight: 'var(--hj-font-weight-semibold)',
                    }}
                  >
                    {franchise.name}
                  </Link>
                </td>
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
