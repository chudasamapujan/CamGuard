import React from 'react';

const statusMap = {
    online: { label: 'Online', className: 'badge--success' },
    warning: { label: 'Warning', className: 'badge--warning' },
    critical: { label: 'Critical', className: 'badge--critical' },
    offline: { label: 'Offline', className: 'badge--offline' },
};

function StatusBadge({ status }) {
    const cfg = statusMap[status] || statusMap.offline;
    return (
        <span className={`badge ${cfg.className}`} role="status" aria-label={`Status: ${cfg.label}`}>
            <span className="badge__dot" />
            {cfg.label}
        </span>
    );
}

export default React.memo(StatusBadge);
