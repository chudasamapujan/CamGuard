import React from 'react';
import { Camera, Bell, FileBarChart, Plus, Video } from 'lucide-react';

const presets = {
    cameras: {
        icon: Camera,
        title: 'No Cameras Detected',
        description: 'Waiting for camera data. Ensure the simulator is running.',
    },
    alerts: {
        icon: Bell,
        title: 'No Alerts',
        description: 'All systems operating within normal parameters.',
    },
    history: {
        icon: FileBarChart,
        title: 'No Historical Data',
        description: 'Data will appear once cameras begin reporting metrics.',
    },
    setup: {
        icon: Video,
        title: 'No cameras configured yet',
        description: 'Get started by registering your first camera. The simulator will automatically begin generating health telemetry once a camera is added.',
    },
};

function EmptyState({ type = 'cameras', title, description, onAction, actionLabel }) {
    const preset = presets[type] || presets.cameras;
    const Icon = preset.icon;

    return (
        <div className="empty-state" role="status">
            <div className="empty-state__icon">
                <Icon size={48} strokeWidth={1.5} />
            </div>
            <h3 className="empty-state__title">{title || preset.title}</h3>
            <p className="empty-state__desc">{description || preset.description}</p>
            {onAction && (
                <button className="btn btn--primary empty-state__cta" onClick={onAction}>
                    <Plus size={18} />
                    {actionLabel || 'Add Camera'}
                </button>
            )}
        </div>
    );
}

export default React.memo(EmptyState);
