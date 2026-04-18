import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FranchisesPage from './FranchisesPage';
import * as franchiseApi from '../../lib/franchiseApi';

vi.mock('../../lib/franchiseApi');

// Mock FranchiseForm so we can drive save/cancel deterministically
vi.mock('./FranchiseForm', () => ({
  default: ({ onSave, onCancel, error }) => (
    <div>
      {error ? <div role="alert">{error}</div> : null}
      <button type="button" onClick={() => onSave({ name: 'Test Franchise' })}>
        Save
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

const renderPage = (route = '/admin/franchises') => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/admin/franchises" element={<FranchisesPage />} />
        <Route path="/admin/franchises/new" element={<FranchisesPage />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('FranchisesPage', () => {
  const mockFranchises = [
    { id: 'f1', name: 'Alpha', manager_name: 'Coach A' },
    { id: 'f2', name: 'Beta', manager_name: '' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders list on load', async () => {
    franchiseApi.getFranchises.mockResolvedValue(mockFranchises);

    renderPage('/admin/franchises');

    expect(await screen.findByText('Franchises')).toBeInTheDocument();
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Coach A')).toBeInTheDocument();
  });

  it('franchise names render as links to the detail page', async () => {
    franchiseApi.getFranchises.mockResolvedValue(mockFranchises);

    renderPage('/admin/franchises');

    const link = await screen.findByRole('link', { name: 'Alpha' });
    expect(link).toHaveAttribute('href', '/admin/franchises/f1');
  });

  it('shows empty state when no franchises', async () => {
    franchiseApi.getFranchises.mockResolvedValue([]);

    renderPage('/admin/franchises');

    expect(await screen.findByText(/No franchises yet/)).toBeInTheDocument();
  });

  it('creates a franchise then returns to list view', async () => {
    franchiseApi.createFranchise.mockResolvedValue({ id: 'f3' });
    franchiseApi.getFranchises.mockResolvedValue([{ id: 'f3', name: 'Test Franchise' }]);

    renderPage('/admin/franchises/new');

    expect(await screen.findByText('Create Franchise')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(franchiseApi.createFranchise).toHaveBeenCalledWith({ name: 'Test Franchise' });
    });

    expect(await screen.findByText('Franchises')).toBeInTheDocument();
  });

  it('shows error when create fails', async () => {
    franchiseApi.createFranchise.mockRejectedValue(new Error('Create failed'));

    renderPage('/admin/franchises/new');

    expect(await screen.findByText('Create Franchise')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText(/Failed to save franchise: Create failed/)).toBeInTheDocument();
  });

  it('delete confirmation cancel does not delete', async () => {
    franchiseApi.getFranchises.mockResolvedValue(mockFranchises);
    franchiseApi.deleteFranchise.mockResolvedValue();

    vi.stubGlobal('confirm', vi.fn(() => false));

    renderPage('/admin/franchises');

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(franchiseApi.deleteFranchise).not.toHaveBeenCalled();
  });
});
