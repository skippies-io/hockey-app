import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VenueForm from './VenueForm';
import { getVenues, getVenue, createVenue, updateVenue, deleteVenue } from '../../lib/venueApi';

/**
 * Venues Management Page
 * Routes:
 * - /admin/venues — list view (default)
 * - /admin/venues/new — create new venue
 * - /admin/venues/[id] — edit venue
 */
export default function VenuesPage() {
  const { venueId } = useParams();
  const navigate = useNavigate();

  const [venues, setVenues] = useState([]);
  const [currentVenue, setCurrentVenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isNewVenue = venueId === 'new';
  const isEditingVenue = venueId && venueId !== 'new';
  const showForm = isNewVenue || isEditingVenue;

  // Load venues list on mount
  useEffect(() => {
    const loadVenues = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVenues();
        setVenues(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(`Failed to load venues: ${err.message}`);
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    if (!showForm) {
      loadVenues();
    }
  }, [showForm]);

  // Load individual venue when editing
  useEffect(() => {
    if (!isEditingVenue) {
      setCurrentVenue(null);
      return;
    }

    const loadVenue = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVenue(venueId);
        setCurrentVenue(data);
      } catch (err) {
        setError(`Failed to load venue: ${err.message}`);
        setCurrentVenue(null);
      } finally {
        setLoading(false);
      }
    };

    loadVenue();
  }, [isEditingVenue, venueId]);

  const handleSave = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      if (isNewVenue) {
        await createVenue(formData);
      } else if (isEditingVenue) {
        await updateVenue(venueId, formData);
      }

      // Reload venues list and return to list view
      const data = await getVenues();
      setVenues(Array.isArray(data) ? data : []);
      setCurrentVenue(null);
      navigate('/admin/venues', { replace: true });
    } catch (err) {
      setError(`Failed to save venue: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this venue? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteVenue(id);

      // Reload venues list
      const data = await getVenues();
      setVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Failed to delete venue: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentVenue(null);
    navigate('/admin/venues', { replace: true });
  };

  // List view
  if (!showForm) {
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
          <h1 style={{ margin: 0 }}>Venues</h1>
          <button
            type="button"
            onClick={() => navigate('/admin/venues/new')}
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
            + Add Venue
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

        {loading && <div>Loading venues…</div>}

        {!loading && venues.length === 0 && (
          <div
            style={{
              padding: 'var(--hj-space-4)',
              textAlign: 'center',
              color: 'var(--hj-color-text-secondary)',
            }}
          >
            No venues yet. Create one to get started.
          </div>
        )}

        {!loading && venues.length > 0 && (
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
                  Location
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
              {venues.map((venue) => (
                <tr
                  key={venue.id}
                  style={{
                    borderBottom: '1px solid var(--hj-color-border-subtle)',
                  }}
                >
                  <td style={{ padding: 'var(--hj-space-3)' }}>{venue.name}</td>
                  <td style={{ padding: 'var(--hj-space-3)' }}>
                    {venue.location || '—'}
                  </td>
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
                      onClick={() => navigate(`/admin/venues/${venue.id}`)}
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
                      onClick={() => handleDelete(venue.id)}
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

  // Form view (add/edit)
  return (
    <div>
      <h1 style={{ marginBottom: 'var(--hj-space-4)' }}>
        {isNewVenue ? 'Create Venue' : 'Edit Venue'}
      </h1>
      <VenueForm
        venue={currentVenue}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={loading}
        error={error}
      />
    </div>
  );
}
