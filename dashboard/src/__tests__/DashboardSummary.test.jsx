import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardSummary from '../components/DashboardSummary';
import { describe, it, expect } from 'vitest';

describe('DashboardSummary Component', () => {
    const mockSummary = {
        total_cameras: 25,
        online: 18,
        warning: 3,
        offline: 2,
        critical: 4,
        active_alerts: 5
    };

    it('displays total cameras, online count, and active alerts count accurately', () => {
        render(<DashboardSummary summary={mockSummary} loading={false} />);
        
        expect(screen.getByText('Total Cameras')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();

        // Online count in SummaryCards is summary.online + summary.warning = 18 + 3 = 21
        expect(screen.getByText('Online Cameras')).toBeInTheDocument();
        expect(screen.getByText('21')).toBeInTheDocument();

        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();

        expect(screen.getByText('Offline Cameras')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();

        expect(screen.getByText('Critical Cameras')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('displays skeleton cards when loading is true', () => {
        render(<DashboardSummary summary={null} loading={true} />);
        expect(screen.getByLabelText('Loading summary')).toBeInTheDocument();
    });

    it('handles null/empty summary gracefully when not loading', () => {
        render(<DashboardSummary summary={null} loading={false} />);
        expect(screen.getByText('Total Cameras')).toBeInTheDocument();
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThanOrEqual(5);
    });
});
