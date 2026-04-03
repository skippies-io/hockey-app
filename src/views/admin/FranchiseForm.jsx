import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const styles = {
  alert: {
    padding: 'var(--hj-space-3)',
    marginBottom: 'var(--hj-space-4)',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: 'var(--hj-radius-md)',
  },
  label: {
    display: 'block',
    marginBottom: 'var(--hj-space-2)',
    fontWeight: 'var(--hj-font-weight-bold)',
  },
  input: {
    width: '100%',
    padding: 'var(--hj-space-2)',
    borderRadius: 'var(--hj-radius-md)',
    border: '1px solid var(--hj-color-border)',
    fontSize: 'var(--hj-font-size-base)',
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--hj-space-4)',
  },
  buttonPrimary: (disabled) => ({
    padding: 'var(--hj-space-2) var(--hj-space-4)',
    borderRadius: 'var(--hj-radius-md)',
    backgroundColor: 'var(--hj-color-brand-primary)',
    color: 'var(--hj-color-inverse-text)',
    border: 'none',
    fontWeight: 'var(--hj-font-weight-bold)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }),
  buttonSecondary: (disabled) => ({
    padding: 'var(--hj-space-2) var(--hj-space-4)',
    borderRadius: 'var(--hj-radius-md)',
    backgroundColor: 'transparent',
    color: 'var(--hj-color-text-secondary)',
    border: '1px solid var(--hj-color-border)',
    fontWeight: 'var(--hj-font-weight-regular)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }),
  buttonDanger: (disabled) => ({
    padding: 'var(--hj-space-1) var(--hj-space-3)',
    borderRadius: 'var(--hj-radius-sm)',
    backgroundColor: '#fee',
    color: '#c00',
    border: '1px solid #fcc',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 'var(--hj-font-size-sm)',
    opacity: disabled ? 0.6 : 1,
  }),
};

function TextField({ id, label, type = 'text', value, onChange, disabled }) {
  return (
    <div>
      <label htmlFor={id} style={styles.label}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={styles.input}
      />
    </div>
  );
}

TextField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

TextField.defaultProps = {
  type: 'text',
  disabled: false,
};

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
        <div style={styles.alert} role="alert">
          {error}
        </div>
      )}

      <div style={{ marginBottom: 'var(--hj-space-4)' }}>
        <label htmlFor="name" style={styles.label}>
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
          style={styles.input}
        />
      </div>

      <div style={styles.gridTwo}>
        <TextField
          id="manager_name"
          label="Manager Name"
          value={formData.manager_name}
          onChange={handleChange}
          disabled={isLoading}
        />
        <TextField
          id="contact_email"
          label="Contact Email"
          type="email"
          value={formData.contact_email}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div style={{ ...styles.gridTwo, marginTop: 'var(--hj-space-4)' }}>
        <TextField
          id="logo_url"
          label="Logo URL"
          type="url"
          value={formData.logo_url}
          onChange={handleChange}
          disabled={isLoading}
        />
        <TextField
          id="manager_photo_url"
          label="Manager Photo URL"
          type="url"
          value={formData.manager_photo_url}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div style={{ ...styles.gridTwo, marginTop: 'var(--hj-space-4)' }}>
        <TextField
          id="contact_phone"
          label="Contact Phone"
          type="tel"
          value={formData.contact_phone}
          onChange={handleChange}
          disabled={isLoading}
        />
        <TextField
          id="location_map_url"
          label="Location Map URL"
          type="url"
          value={formData.location_map_url}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div style={{ marginTop: 'var(--hj-space-4)', marginBottom: 'var(--hj-space-4)' }}>
        <label htmlFor="description" style={styles.label}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
          rows="4"
          style={styles.input}
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--hj-space-3)' }}>
        <button type="submit" disabled={isLoading} style={styles.buttonPrimary(isLoading)}>
          {isLoading ? 'Saving…' : isEditing ? 'Update Franchise' : 'Create Franchise'}
        </button>

        <button type="button" onClick={onCancel} disabled={isLoading} style={styles.buttonSecondary(isLoading)}>
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
