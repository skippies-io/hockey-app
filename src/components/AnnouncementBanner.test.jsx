import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import AnnouncementBanner from './AnnouncementBanner';

describe('AnnouncementBanner', () => {
  const mockAnnouncements = [
    { id: '1', title: 'Test 1', body: 'Body 1', severity: 'info' },
    { id: '2', title: 'Test 2', body: 'Body 2', severity: 'alert' }
  ];

  let store = {};
  const mockLocalStorage = {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key) => { delete store[key]; })
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.clearAllMocks();
  });

  it('renders nothing when no announcements are provided', () => {
    const { container } = render(<AnnouncementBanner announcements={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders announcements correctly', () => {
    render(<AnnouncementBanner announcements={mockAnnouncements} />);
    expect(screen.getByText('Test 1')).toBeDefined();
    expect(screen.getByText('Body 1')).toBeDefined();
    expect(screen.getByText('Test 2')).toBeDefined();
    expect(screen.getByText('Body 2')).toBeDefined();
  });

  it('filters out dismissed announcements on mount', () => {
    store['hj_dismissed_announcements'] = JSON.stringify(['1']);
    render(<AnnouncementBanner announcements={mockAnnouncements} />);
    
    expect(screen.queryByText('Test 1')).toBeNull();
    expect(screen.getByText('Test 2')).toBeDefined();
  });

  it('allows dismissing an announcement', () => {
    render(<AnnouncementBanner announcements={mockAnnouncements} />);
    const buttons = screen.getAllByRole('button', { name: /dismiss/i });
    
    fireEvent.click(buttons[0]); // Dismiss first one ('1')

    expect(screen.queryByText('Test 1')).toBeNull();
    expect(screen.getByText('Test 2')).toBeDefined();
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'hj_dismissed_announcements', 
      JSON.stringify(['1'])
    );
  });

  it('applies correct styles for different severities', () => {
    const anns = [
      { id: '1', title: 'Info', body: 'b', severity: 'info' },
      { id: '2', title: 'Alert', body: 'b', severity: 'alert' },
      { id: '3', title: 'Warning', body: 'b', severity: 'warning' },
      { id: '4', title: 'Success', body: 'b', severity: 'success' },
    ];
    render(<AnnouncementBanner announcements={anns} />);
    
    const info = screen.getByText('Info').closest('[role="alert"]');
    const alert = screen.getByText('Alert').closest('[role="alert"]');
    const warning = screen.getByText('Warning').closest('[role="alert"]');
    const success = screen.getByText('Success').closest('[role="alert"]');

    expect(info.style.backgroundColor).toBe('rgb(239, 246, 255)');
    expect(alert.style.backgroundColor).toBe('rgb(254, 242, 242)');
    expect(warning.style.backgroundColor).toBe('rgb(255, 247, 237)');
    expect(success.style.backgroundColor).toBe('rgb(236, 253, 245)');
  });
  it('is resilient to corrupted localStorage', () => {
    localStorage.setItem('hj_dismissed_announcements', 'invalid-json');
    render(<AnnouncementBanner announcements={mockAnnouncements} />);
    expect(screen.getByText('Test 1')).toBeDefined();
    expect(screen.getByText('Test 2')).toBeDefined();
  });
});
