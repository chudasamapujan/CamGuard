import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AlertBanner from '../components/AlertBanner';
import { describe, it, expect, vi } from 'vitest';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
    resolveAlert: vi.fn().mockResolvedValue({ data: { status: 'ok' } })
}));

describe('AlertBanner Component', () => {
    const mockAlerts = [
        {
            id: 1,
            camera_id: 'CAM-001',
            camera_name: 'Front Door',
            alert_type: 'cpu_high',
            severity: 'critical',
            message: 'High CPU detected',
            created_at: '2026-07-13T00:00:00Z',
            resolved: false
        },
        {
            id: 2,
            camera_id: 'CAM-002',
            camera_name: 'Backyard',
            alert_type: 'memory_high',
            severity: 'warning',
            message: 'High memory usage',
            created_at: '2026-07-13T01:00:00Z',
            resolved: false
        }
    ];

    it('displays active alert count when > 0', () => {
        render(<AlertBanner alerts={mockAlerts} />);
        expect(screen.getByText('Active Alerts (2)')).toBeInTheDocument();
    });

    it('renders alert list when expanded', () => {
        render(<AlertBanner alerts={mockAlerts} />);
        
        // Before expanding, the table should not be in the document
        expect(screen.queryByRole('table', { name: /Recent Alerts Table/i })).not.toBeInTheDocument();

        // Click header to expand
        fireEvent.click(screen.getByText('Active Alerts (2)'));

        // Now table should be rendered
        expect(screen.getByRole('table', { name: /Recent Alerts Table/i })).toBeInTheDocument();
        expect(screen.getByText('Front Door')).toBeInTheDocument();
        expect(screen.getByText('Backyard')).toBeInTheDocument();
    });

    it('calls resolve callback when an alert resolve button is clicked', async () => {
        const handleResolve = vi.fn();
        const addToast = vi.fn();
        render(<AlertBanner alerts={mockAlerts} onAlertResolved={handleResolve} addToast={addToast} />);

        // Expand banner
        fireEvent.click(screen.getByText('Active Alerts (2)'));

        // Find resolve buttons
        const resolveButtons = screen.getAllByText('Active (Resolve)');
        expect(resolveButtons.length).toBe(2);

        // Click the first one (which corresponds to alert 2 due to desc date sorting)
        fireEvent.click(resolveButtons[0]);

        await waitFor(() => {
            expect(api.resolveAlert).toHaveBeenCalledWith(2);
            expect(handleResolve).toHaveBeenCalled();
            expect(addToast).toHaveBeenCalledWith('Incident #2 resolved', 'success');
        });
    });

    it('renders nothing / empty state when active alert count is 0', () => {
        const resolvedAlerts = [
            {
                id: 3,
                camera_id: 'CAM-003',
                alert_type: 'cpu_high',
                severity: 'warning',
                message: 'CPU resolved',
                created_at: '2026-07-13T00:00:00Z',
                resolved: true
            }
        ];
        const { container: containerEmptyList } = render(<AlertBanner alerts={resolvedAlerts} />);
        expect(containerEmptyList).toBeEmptyDOMElement();

        const { container: containerNoAlerts } = render(<AlertBanner alerts={[]} />);
        expect(containerNoAlerts).toBeEmptyDOMElement();
    });
});
