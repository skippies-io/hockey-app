import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VenueForm from './VenueForm';
import { getVenues, getVenue, createVenue, updateVenue, deleteVenue } from '../../lib/venueApi';

/**
 * Extract lat/lng from a Google Maps URL and return an embed src.
 * Falls back to a search embed using the address if no coords are found.
 */
function mapEmbedUrl(venue) {
  if (venue.location_map_url) {
    const match = venue.location_map_url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return `https://maps.google.com/maps?q=${match[1]},${match[2]}&zoom=15&output=embed`;
    }
  }
  if (venue.location) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(venue.location)}&output=embed`;
  }
  return null;
}

/**
 * Venues Management Page
 * Routes:
 * - /admin/venues — list view (default)
 * - /admin/venues/new — create new venue
 * - /admin/venues/[id] — edit venue
 */
export default function VenuesPage() {
  const params = useParams();
  const venueId = params.venueId || (params['*'] ? params['*'].split('/')[0] : undefined);
  const navigate = useNavigate();

  const [venues, setVenues] = useState([]);
  const [currentVenue, setCurrentVenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isNewVenue = venueId === 'new';
  const isEditingVenue = venueId && venueId !== 'new';
  const showForm = isNewVenue || isEditingVenue;

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

        {!loading && !error && venues.length === 0 && (
          <div
            style={{
              padding: 'var(--hj-space-4)',
              textAlign: 'center',
              color: 'var(--hj-color-text-secondary)',
            }}
          >
            <div style={{ marginBottom: 'var(--hj-space-2)' }}>No venues yet.</div>
            <div>Click <strong>"Add Venue"</strong> to create your first venue.</div>
          </div>
        )}

        {!loading && venues.length > 0 && (
          <div className="venue-card-grid">
            {venues.map((venue) => {
              const embedSrc = mapEmbedUrl(venue);
              return (
                <div
                  key={venue.id}
                  style={{
                    border: '1px solid var(--hj-color-border)',
                    borderRadius: 'var(--hj-radius-lg)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--hj-color-surface-2)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Map snippet */}
                  {embedSrc && (
                    <iframe
                      title={`Map of ${venue.name}`}
                      src={embedSrc}
                      style={{ width: '100%', height: '160px', border: 'none', display: 'block' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  )}

                  {/* Details */}
                  <div style={{ padding: 'var(--hj-space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
                    <div style={{ fontWeight: 'var(--hj-font-weight-bold)', fontSize: 'var(--hj-font-size-lg)' }}>
                      {venue.name}
                    </div>

                    {venue.location && (
                      <div style={{ color: 'var(--hj-color-text-secondary)', fontSize: 'var(--hj-font-size-sm)' }}>
                        {venue.location}
                      </div>
                    )}

                    {/* Links row */}
                    <div style={{ display: 'flex', gap: 'var(--hj-space-3)', marginTop: 'var(--hj-space-1)' }}>
                      {venue.location_map_url && (
                        <a
                          href={venue.location_map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--hj-color-brand-primary)', fontSize: 'var(--hj-font-size-sm)', textDecoration: 'none' }}
                        >
                          Open in Maps ↗
                        </a>
                      )}
                      {venue.website_url && (
                        <a
                          href={venue.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--hj-color-text-secondary)', fontSize: 'var(--hj-font-size-sm)', textDecoration: 'none' }}
                        >
                          Website ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--hj-space-2)',
                      padding: 'var(--hj-space-3) var(--hj-space-4)',
                      borderTop: '1px solid var(--hj-color-border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/venues/${venue.id}`)}
                      style={{
                        flex: 1,
                        padding: 'var(--hj-space-2)',
                        borderRadius: 'var(--hj-radius-sm)',
                        backgroundColor: 'var(--hj-color-brand-primary)',
                        color: 'var(--hj-color-inverse-text)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--hj-font-size-sm)',
                        fontWeight: 'var(--hj-font-weight-bold)',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(venue.id)}
                      style={{
                        flex: 1,
                        padding: 'var(--hj-space-2)',
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
                  </div>
                </div>
              );
            })}
          </div>
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
