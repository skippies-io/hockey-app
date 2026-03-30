import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable form for adding/editing venues
 */
export default function VenueForm({
  venue = null,
  onSave,
  onCancel,
  isLoading = false,
  error = null,
}) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || '',
        location: venue.location || '',
        notes: venue.notes || '',
      });
    }
  }, [venue]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = Boolean(venue);

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
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

      <div style={{ marginBottom: 'var(--hj-space-4)' }}>
        <label
          htmlFor="name"
          style={{
            display: 'block',
            marginBottom: 'var(--hj-space-2)',
            fontWeight: 'var(--hj-font-weight-bold)',
          }}
        >
          Venue Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={isLoading}
          style={{
            width: '100%',
            padding: 'var(--hj-space-2)',
            borderRadius: 'var(--hj-radius-md)',
            border: '1px solid var(--hj-color-border)',
            fontSize: 'var(--hj-font-size-base)',
          }}
        />
      </div>

      <div style={{ marginBottom: 'var(--hj-space-4)' }}>
        <label
          htmlFor="location"
          style={{
            display: 'block',
            marginBottom: 'var(--hj-space-2)',
            fontWeight: 'var(--hj-font-weight-bold)',
          }}
        >
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          value={formData.location}
          onChange={handleChange}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: 'var(--hj-space-2)',
            borderRadius: 'var(--hj-radius-md)',
            border: '1px solid var(--hj-color-border)',
            fontSize: 'var(--hj-font-size-base)',
          }}
        />
      </div>

      <div style={{ marginBottom: 'var(--hj-space-4)' }}>
        <label
          htmlFor="notes"
          style={{
            display: 'block',
            marginBottom: 'var(--hj-space-2)',
            fontWeight: 'var(--hj-font-weight-bold)',
          }}
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          disabled={isLoading}
          rows="4"
          style={{
            width: '100%',
            padding: 'var(--hj-space-2)',
            borderRadius: 'var(--hj-radius-md)',
            border: '1px solid var(--hj-color-border)',
            fontSize: 'var(--hj-font-size-base)',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--hj-space-3)' }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: 'var(--hj-space-2) var(--hj-space-4)',
            borderRadius: 'var(--hj-radius-md)',
            backgroundColor: 'var(--hj-color-brand-primary)',
            color: 'var(--hj-color-inverse-text)',
            border: 'none',
            fontWeight: 'var(--hj-font-weight-bold)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Saving…' : isEditing ? 'Update Venue' : 'Create Venue'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: 'var(--hj-space-2) var(--hj-space-4)',
            borderRadius: 'var(--hj-radius-md)',
            backgroundColor: 'transparent',
            color: 'var(--hj-color-text-secondary)',
            border: '1px solid var(--hj-color-border)',
            fontWeight: 'var(--hj-font-weight-regular)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

VenueForm.propTypes = {
  venue: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    location: PropTypes.string,
    notes: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
};
