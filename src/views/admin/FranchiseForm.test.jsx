import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FranchiseForm from './FranchiseForm';

describe('FranchiseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders required name field and calls onSave', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<FranchiseForm onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText('Franchise Name'), { target: { value: 'Alpha' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Franchise/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alpha' }));
  });

  it('populates fields when editing', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <FranchiseForm
        onSave={onSave}
        onCancel={onCancel}
        franchise={{ id: 'f1', name: 'Alpha', manager_name: 'Coach A' }}
      />
    );

    expect(screen.getByLabelText('Franchise Name')).toHaveValue('Alpha');
    expect(screen.getByLabelText('Manager Name')).toHaveValue('Coach A');
    expect(screen.getByRole('button', { name: /Update Franchise/i })).toBeInTheDocument();
  });

  it('calls onCancel', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(<FranchiseForm onSave={onSave} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('renders error alert', () => {
    render(<FranchiseForm onSave={() => {}} onCancel={() => {}} error="Boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
  });
});
