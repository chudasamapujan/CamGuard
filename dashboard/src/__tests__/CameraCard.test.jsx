import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CameraCard from '../components/CameraCard';
import { describe, it, expect, vi } from 'vitest';

describe('CameraCard Component', () => {
    const mockOnlineCamera = {
        id: 'CAM-010',
        name: 'Lobby Entrance',
        status: 'online',
        last_heartbeat: new Date().toISOString(),
        latest_health: {
            cpu_usage: 45.23,
            memory_usage: 62.8,
            storage_usage: 55.0,
            network_latency: 38.4,
            is_online: true
        }
    };

    const mockOfflineCamera = {
        id: 'CAM-011',
        name: 'Basement Cam',
        status: 'offline',
        last_heartbeat: new Date().toISOString(),
        latest_health: {
            cpu_usage: 0,
            memory_usage: 0,
            storage_usage: 0,
            network_latency: 0,
            is_online: false
        }
    };

    it('renders camera name and status badge', () => {
        render(<CameraCard camera={mockOnlineCamera} />);
        expect(screen.getByText('Lobby Entrance')).toBeInTheDocument();
        expect(screen.getByText('CAM-010')).toBeInTheDocument();
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent('Online');
    });

    it('renders metric values formatted correctly when online', () => {
        render(<CameraCard camera={mockOnlineCamera} />);
        expect(screen.getByText('45.2%')).toBeInTheDocument();
        expect(screen.getByText('62.8%')).toBeInTheDocument();
        expect(screen.getByText('55.0%')).toBeInTheDocument();
        expect(screen.getByText('38 ms')).toBeInTheDocument();
    });

    it('renders "Offline" state properly when is_online is false or status is offline', () => {
        render(<CameraCard camera={mockOfflineCamera} />);
        expect(screen.getByText('Basement Cam')).toBeInTheDocument();
        expect(screen.getByText('Camera Offline')).toBeInTheDocument();
        expect(screen.queryByText('CPU')).not.toBeInTheDocument();
    });

    it('calls onClick handler when clicked or enter pressed', () => {
        const handleClick = vi.fn();
        render(<CameraCard camera={mockOnlineCamera} onClick={handleClick} />);
        
        const card = screen.getByRole('button');
        fireEvent.click(card);
        expect(handleClick).toHaveBeenCalledWith(mockOnlineCamera);

        fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
        expect(handleClick).toHaveBeenCalledTimes(2);
    });
});
