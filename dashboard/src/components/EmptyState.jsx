import React from 'react';
import { Camera, Bell, FileBarChart } from 'lucide-react';

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
};

function EmptyState({ type = 'cameras', title, description }) {
    const preset = presets[type] || presets.cameras;
    const Icon = preset.icon;

    return (
        <div className="empty-state" role="status">
            <div className="empty-state__icon">
                <Icon size={40} strokeWidth={1.5} />
            </div>
            <h3 className="empty-state__title">{title || preset.title}</h3>
            <p className="empty-state__desc">{description || preset.description}</p>
        </div>
    );
}

export default React.memo(EmptyState);
