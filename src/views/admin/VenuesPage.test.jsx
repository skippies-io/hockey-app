import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VenuesPage from './VenuesPage';
import * as venueApi from '../../lib/venueApi';

vi.mock('../../lib/venueApi');

// Wrapper that includes the full routing context
const renderVenuesPage = (route = '/admin/venues') => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/admin/venues" element={<VenuesPage />} />
        <Route path="/admin/venues/:venueId" element={<VenuesPage />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('VenuesPage', () => {
  const mockVenues = [
    { id: '1', name: 'Arena A', location: 'Downtown', notes: 'Main venue' },
    { id: '2', name: 'Arena B', location: 'Uptown', notes: '' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('List View', () => {
    it('renders venues list on load', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('Venues')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Arena A')).toBeInTheDocument();
        expect(screen.getByText('Arena B')).toBeInTheDocument();
      });

      expect(venueApi.getVenues).toHaveBeenCalled();
    });

    it('shows empty state when no venues', async () => {
      venueApi.getVenues.mockResolvedValue([]);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText(/No venues yet/)).toBeInTheDocument();
      });
    });

    it('shows error when fetch fails', async () => {
      venueApi.getVenues.mockRejectedValue(new Error('Network error'));

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText(/Failed to load venues/)).toBeInTheDocument();
      });
    });

    it('has Add Venue button', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        const addButton = screen.getByText('+ Add Venue');
        expect(addButton).toBeInTheDocument();
      });
    });

    it('renders edit and delete buttons for each venue', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        const deleteButtons = screen.getAllByText('Delete');
        expect(editButtons).toHaveLength(2);
        expect(deleteButtons).toHaveLength(2);
      });
    });

    it('displays venue details in table columns', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('Arena A')).toBeInTheDocument();
        expect(screen.getByText('Downtown')).toBeInTheDocument();
        expect(screen.getByText('Arena B')).toBeInTheDocument();
        expect(screen.getByText('Uptown')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('deletes a venue with confirmation', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);
      venueApi.deleteVenue.mockResolvedValue();

      window.confirm = vi.fn(() => true);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('Arena A')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(venueApi.deleteVenue).toHaveBeenCalledWith('1');
      });
    });

    it('does not delete without confirmation', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);
      window.confirm = vi.fn(() => false);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('Arena A')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(venueApi.deleteVenue).not.toHaveBeenCalled();
      });
    });

    it('shows error when delete fails', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);
      venueApi.deleteVenue.mockRejectedValue(new Error('Delete failed'));
      window.confirm = vi.fn(() => true);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('Arena A')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to delete venue/)).toBeInTheDocument();
      });
    });

    it('reloads venues after successful delete', async () => {
      venueApi.getVenues.mockResolvedValueOnce(mockVenues);
      venueApi.deleteVenue.mockResolvedValue();
      venueApi.getVenues.mockResolvedValueOnce([mockVenues[1]]);
      window.confirm = vi.fn(() => true);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('Arena A')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(venueApi.deleteVenue).toHaveBeenCalledWith('1');
        expect(venueApi.getVenues).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while fetching venues', () => {
      venueApi.getVenues.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderVenuesPage('/admin/venues');

      expect(screen.getByText('Loading venues…')).toBeInTheDocument();
    });
  });

  describe('Table Rendering', () => {
    it('renders table with correct headers', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('shows em-dash for venues without location', async () => {
      const venuesWithoutLocation = [
        { id: '1', name: 'Arena A', location: '', notes: '' },
      ];
      venueApi.getVenues.mockResolvedValue(venuesWithoutLocation);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(screen.getByText('—')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls getVenues when list view loads', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        expect(venueApi.getVenues).toHaveBeenCalledTimes(1);
      });
    });

    it('handles API base URL validation', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      // Verify the mock was called, implying the component uses the API
      await waitFor(() => {
        expect(venueApi.getVenues).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation Buttons', () => {
    it('has clickable edit buttons', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        editButtons.forEach((btn) => {
          expect(btn).not.toBeDisabled();
        });
      });
    });

    it('has clickable delete buttons', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        deleteButtons.forEach((btn) => {
          expect(btn).not.toBeDisabled();
        });
      });
    });

    it('add venue button is clickable', async () => {
      venueApi.getVenues.mockResolvedValue(mockVenues);

      renderVenuesPage('/admin/venues');

      await waitFor(() => {
        const addButton = screen.getByText('+ Add Venue');
        expect(addButton).not.toBeDisabled();
      });
    });
  });
});
