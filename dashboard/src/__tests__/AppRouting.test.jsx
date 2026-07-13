import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AppContent } from '../App';
import { ThemeProvider } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';
import Navigation from '../components/Navigation';

// Mock child components/services to focus on routing
vi.mock('../services/api', () => ({
  fetchCameras: vi.fn().mockResolvedValue({ data: [] }),
  fetchDashboardSummary: vi.fn().mockResolvedValue({ data: { total_cameras: 0, online: 0, warning: 0, critical: 0, offline: 0 } }),
  fetchAlerts: vi.fn().mockResolvedValue({ data: [] }),
  fetchDashboardHistory: vi.fn().mockResolvedValue({ data: [] }),
  fetchSettings: vi.fn().mockResolvedValue({ data: { cpu_threshold: 75, memory_threshold: 75, storage_threshold: 80, latency_threshold: 200 } }),
  resolveAlert: vi.fn()
}));

vi.mock('../services/socket', () => ({
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn()
  }
}));

describe('Client-Side Routing & Navigation', () => {
  it('renders Sidebar/Navigation links correctly', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByRole('tab', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
  });

  it('Navigation re-exports Sidebar correctly', () => {
    expect(Navigation).toBe(Sidebar);
  });

  it('renders Dashboard route by default when navigating to "/"', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <AppContent />
        </MemoryRouter>
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/camera fleet status/i)).toBeInTheDocument();
    });
  });

  it('renders AlertCenter when navigating to "/alerts"', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/alerts']}>
          <AppContent />
        </MemoryRouter>
      </ThemeProvider>
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /recent incidents log/i })).toBeInTheDocument();
    });
  });
});
