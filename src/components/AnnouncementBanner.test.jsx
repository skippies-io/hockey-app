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

    expect(info.style.backgroundColor).toBe('var(--hj-color-info-soft)');
    expect(alert.style.backgroundColor).toBe('var(--hj-color-danger-soft)');
    expect(warning.style.backgroundColor).toBe('var(--hj-color-warning-soft)');
    expect(success.style.backgroundColor).toBe('var(--hj-color-success-soft)');
  });
  it('falls back to info styles for unknown severity', () => {
    render(<AnnouncementBanner announcements={[{ id: '1', title: 'X', body: 'b', severity: 'unknown' }]} />);
    const banner = screen.getByText('X').closest('[role="alert"]');
    expect(banner.style.backgroundColor).toBe('var(--hj-color-info-soft)');
  });

  it('is resilient to corrupted localStorage', () => {
    localStorage.setItem('hj_dismissed_announcements', 'invalid-json');
    render(<AnnouncementBanner announcements={mockAnnouncements} />);
    expect(screen.getByText('Test 1')).toBeDefined();
    expect(screen.getByText('Test 2')).toBeDefined();
  });

  it('does not persist dismiss when id strips to empty string', () => {
    const ann = [{ id: '!!!', title: 'Special', body: 'b', severity: 'info' }];
    render(<AnnouncementBanner announcements={ann} />);
    const btn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(btn);
    // safeId becomes '' after stripping — setItem should not be called
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('does not add duplicate ids to dismissed list', () => {
    store['hj_dismissed_announcements'] = JSON.stringify(['2']);
    render(<AnnouncementBanner announcements={mockAnnouncements} />);
    // Dismiss '2' which is already in the dismissed list
    const buttons = screen.getAllByRole('button', { name: /dismiss/i });
    // '1' is visible (index 0), '2' is not rendered because already dismissed
    // So only one button exists — dismiss '1'
    fireEvent.click(buttons[0]);
    const stored = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
    expect(stored.filter((x) => x === '1').length).toBe(1);
  });

  it('filters non-string ids out of stored dismissed list', () => {
    store['hj_dismissed_announcements'] = JSON.stringify(['1', 42, null]);
    render(<AnnouncementBanner announcements={mockAnnouncements} />);
    // '1' is filtered out as dismissed; '2' is shown
    expect(screen.queryByText('Test 1')).toBeNull();
    expect(screen.getByText('Test 2')).toBeDefined();
  });
});
