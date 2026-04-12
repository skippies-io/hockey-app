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
        <Route path="/admin/franchises/:franchiseId" element={<FranchisesPage />} />
      </Routes>
    </BrowserRouter>
  );
};

// Uses the wildcard route pattern that App.jsx actually registers:
//   <Route path="franchises/*" element={<FranchisesPage />} />
// With this pattern useParams() returns { '*': 'new' } not { franchiseId: 'new' },
// which is exactly the bug this test is guarding against.
const renderPageWildcard = (route = '/admin/franchises') => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/admin/franchises/*" element={<FranchisesPage />} />
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

  it('shows empty state when no franchises', async () => {
    franchiseApi.getFranchises.mockResolvedValue([]);

    renderPage('/admin/franchises');

    expect(await screen.findByText(/No franchises yet/)).toBeInTheDocument();
  });

  it('imports franchises and refreshes list', async () => {
    franchiseApi.getFranchises.mockResolvedValueOnce([]);
    franchiseApi.importFranchises.mockResolvedValue([{ id: 'f1', name: 'Alpha' }]);
    franchiseApi.getFranchises.mockResolvedValueOnce([{ id: 'f1', name: 'Alpha' }]);

    renderPage('/admin/franchises');

    const textarea = await screen.findByPlaceholderText(/Example:/);
    fireEvent.change(textarea, { target: { value: 'Alpha' } });
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(franchiseApi.importFranchises).toHaveBeenCalledWith('Alpha');
      expect(franchiseApi.getFranchises).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText(/Added 1 franchise/)).toBeInTheDocument();
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

  it('updates a franchise then returns to list view', async () => {
    franchiseApi.updateFranchise.mockResolvedValue({ id: 'f1' });
    franchiseApi.getFranchises.mockResolvedValueOnce(mockFranchises);
    franchiseApi.getFranchises.mockResolvedValueOnce([{ id: 'f1', name: 'Test Franchise' }]);

    renderPage('/admin/franchises/f1');

    expect(await screen.findByText('Edit Franchise')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(franchiseApi.updateFranchise).toHaveBeenCalledWith('f1', { name: 'Test Franchise' });
    });

    expect(await screen.findByText('Franchises')).toBeInTheDocument();
  });

  it('renders create form at /new via wildcard route (App.jsx pattern)', async () => {
    // Regression test for the useParams() routing bug:
    // App.jsx registers <Route path="franchises/*">, so useParams() returns { '*': 'new' }
    // not { franchiseId: 'new' }. The fix reads params['*'] as fallback.
    renderPageWildcard('/admin/franchises/new');

    expect(await screen.findByText('Create Franchise')).toBeInTheDocument();
  });

  it('renders edit form at /:id via wildcard route (App.jsx pattern)', async () => {
    franchiseApi.getFranchises.mockResolvedValue(mockFranchises);

    renderPageWildcard('/admin/franchises/f1');

    expect(await screen.findByText('Edit Franchise')).toBeInTheDocument();
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
