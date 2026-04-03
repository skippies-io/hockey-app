import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

export default function FranchiseForm({
  franchise = null,
  onSave,
  onCancel,
  isLoading = false,
  error = null,
}) {
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    manager_name: '',
    manager_photo_url: '',
    contact_email: '',
    contact_phone: '',
    location_map_url: '',
    description: '',
  });

  useEffect(() => {
    if (franchise) {
      setFormData({
        name: franchise.name || '',
        logo_url: franchise.logo_url || '',
        manager_name: franchise.manager_name || '',
        manager_photo_url: franchise.manager_photo_url || '',
        contact_email: franchise.contact_email || '',
        contact_phone: franchise.contact_phone || '',
        location_map_url: franchise.location_map_url || '',
        description: franchise.description || '',
      });
    }
  }, [franchise]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = Boolean(franchise);

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>
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
          Franchise Name
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--hj-space-4)' }}>
        <div>
          <label
            htmlFor="manager_name"
            style={{
              display: 'block',
              marginBottom: 'var(--hj-space-2)',
              fontWeight: 'var(--hj-font-weight-bold)',
            }}
          >
            Manager Name
          </label>
          <input
            id="manager_name"
            name="manager_name"
            type="text"
            value={formData.manager_name}
            onChange={handleChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="contact_email"
            style={{
              display: 'block',
              marginBottom: 'var(--hj-space-2)',
              fontWeight: 'var(--hj-font-weight-bold)',
            }}
          >
            Contact Email
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={handleChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border)',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--hj-space-4)', marginTop: 'var(--hj-space-4)' }}>
        <div>
          <label
            htmlFor="logo_url"
            style={{
              display: 'block',
              marginBottom: 'var(--hj-space-2)',
              fontWeight: 'var(--hj-font-weight-bold)',
            }}
          >
            Logo URL
          </label>
          <input
            id="logo_url"
            name="logo_url"
            type="url"
            value={formData.logo_url}
            onChange={handleChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="manager_photo_url"
            style={{
              display: 'block',
              marginBottom: 'var(--hj-space-2)',
              fontWeight: 'var(--hj-font-weight-bold)',
            }}
          >
            Manager Photo URL
          </label>
          <input
            id="manager_photo_url"
            name="manager_photo_url"
            type="url"
            value={formData.manager_photo_url}
            onChange={handleChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border)',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--hj-space-4)', marginTop: 'var(--hj-space-4)' }}>
        <div>
          <label
            htmlFor="contact_phone"
            style={{
              display: 'block',
              marginBottom: 'var(--hj-space-2)',
              fontWeight: 'var(--hj-font-weight-bold)',
            }}
          >
            Contact Phone
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={handleChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="location_map_url"
            style={{
              display: 'block',
              marginBottom: 'var(--hj-space-2)',
              fontWeight: 'var(--hj-font-weight-bold)',
            }}
          >
            Location Map URL
          </label>
          <input
            id="location_map_url"
            name="location_map_url"
            type="url"
            value={formData.location_map_url}
            onChange={handleChange}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border)',
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 'var(--hj-space-4)', marginBottom: 'var(--hj-space-4)' }}>
        <label
          htmlFor="description"
          style={{
            display: 'block',
            marginBottom: 'var(--hj-space-2)',
            fontWeight: 'var(--hj-font-weight-bold)',
          }}
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
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
          {isLoading ? 'Saving…' : isEditing ? 'Update Franchise' : 'Create Franchise'}
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

FranchiseForm.propTypes = {
  franchise: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    logo_url: PropTypes.string,
    manager_name: PropTypes.string,
    manager_photo_url: PropTypes.string,
    contact_email: PropTypes.string,
    contact_phone: PropTypes.string,
    location_map_url: PropTypes.string,
    description: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
};
