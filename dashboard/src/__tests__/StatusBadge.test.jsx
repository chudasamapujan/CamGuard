import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';
import { describe, it, expect } from 'vitest';

describe('StatusBadge Component', () => {
    it('renders online status with Online label and success class', () => {
        render(<StatusBadge status="online" />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent('Online');
        expect(badge).toHaveClass('badge--success');
    });

    it('renders warning status with Warning label and warning class', () => {
        render(<StatusBadge status="warning" />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent('Warning');
        expect(badge).toHaveClass('badge--warning');
    });

    it('renders critical status with Critical label and critical class', () => {
        render(<StatusBadge status="critical" />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent('Critical');
        expect(badge).toHaveClass('badge--critical');
    });

    it('renders offline status with Offline label and offline class', () => {
        render(<StatusBadge status="offline" />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent('Offline');
        expect(badge).toHaveClass('badge--offline');
    });

    it('defaults to offline status if unknown status is provided', () => {
        render(<StatusBadge status="unknown_status" />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent('Offline');
        expect(badge).toHaveClass('badge--offline');
    });
});
