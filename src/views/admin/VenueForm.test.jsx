import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import VenueForm from './VenueForm';

describe('VenueForm', () => {
  it('renders empty form for create and calls onSave with form data', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<VenueForm onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText('Venue Name'), { target: { value: 'Rink A' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Cape Town' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Create Venue' }).closest('form'));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Rink A',
      location: 'Cape Town',
      location_map_url: '',
      website_url: '',
    });
  });

  it('populates initial values when editing and shows Update button label', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <VenueForm
        venue={{ id: 'v1', name: 'Old', location: 'Loc', location_map_url: 'https://maps.google.com', website_url: 'https://example.com' }}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByLabelText('Venue Name').value).toBe('Old');
    expect(screen.getByLabelText('Address').value).toBe('Loc');
    expect(screen.getByLabelText('Google Maps URL').value).toBe('https://maps.google.com');
    expect(screen.getByLabelText('Website URL').value).toBe('https://example.com');
    expect(screen.getByRole('button', { name: 'Update Venue' })).toBeDefined();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<VenueForm onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables inputs when loading and shows Saving label', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<VenueForm onSave={onSave} onCancel={onCancel} isLoading />);

    expect(screen.getByLabelText('Venue Name').disabled).toBe(true);
    expect(screen.getByLabelText('Address').disabled).toBe(true);
    expect(screen.getByLabelText('Google Maps URL').disabled).toBe(true);
    expect(screen.getByLabelText('Website URL').disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Saving…' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancel' }).disabled).toBe(true);
  });

  it('renders error banner when error is provided', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<VenueForm onSave={onSave} onCancel={onCancel} error="Nope" />);

    expect(screen.getByRole('alert').textContent).toMatch(/nope/i);
  });
});
