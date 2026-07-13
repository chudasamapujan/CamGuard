import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MetricChart from '../components/MetricChart';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  fetchCameraHistory: vi.fn(),
  fetchDashboardHistory: vi.fn(),
}));

// Mock react-chartjs-2 Line component to avoid canvas rendering issues in test environment
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-chart">Line Chart</div>
}));

describe('MetricChart Component Time-Range Selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders time-range selector buttons (1h, 6h, 24h, 7d)', async () => {
    api.fetchDashboardHistory.mockResolvedValueOnce({
      data: [{ timestamp: new Date().toISOString(), cpu_usage: 10, memory_usage: 20, storage_usage: 30 }]
    });

    render(<MetricChart />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '1h' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '6h' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '24h' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '7d' })).toBeInTheDocument();
    });
  });

  it('fetches dashboard history with initial 1 hour range by default', async () => {
    api.fetchDashboardHistory.mockResolvedValueOnce({
      data: [{ timestamp: new Date().toISOString(), cpu_usage: 10, memory_usage: 20, storage_usage: 30 }]
    });

    render(<MetricChart />);

    await waitFor(() => {
      expect(api.fetchDashboardHistory).toHaveBeenCalledWith(1);
    });
  });

  it('fetches camera history with time range 24 when clicking 24h button', async () => {
    api.fetchCameraHistory.mockResolvedValue({
      data: {
        camera_id: 'cam-01',
        records: [{ timestamp: new Date().toISOString(), cpu_usage: 10, memory_usage: 20, storage_usage: 30 }]
      }
    });

    render(<MetricChart cameraId="cam-01" />);

    await waitFor(() => {
      expect(api.fetchCameraHistory).toHaveBeenCalledWith('cam-01', 1);
    });

    fireEvent.click(screen.getByRole('tab', { name: '24h' }));

    await waitFor(() => {
      expect(api.fetchCameraHistory).toHaveBeenCalledWith('cam-01', 24);
    });
  });

  it('fetches history with time range 168 when clicking 7d button', async () => {
    api.fetchDashboardHistory.mockResolvedValue({
      data: [{ timestamp: new Date().toISOString(), cpu_usage: 10, memory_usage: 20, storage_usage: 30 }]
    });

    render(<MetricChart />);

    await waitFor(() => {
      expect(api.fetchDashboardHistory).toHaveBeenCalledWith(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: '7d' }));

    await waitFor(() => {
      expect(api.fetchDashboardHistory).toHaveBeenCalledWith(168);
    });
  });
});
