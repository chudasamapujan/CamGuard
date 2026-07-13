import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import AlertCenter from './AlertCenter';

export default function AlertBanner({ alerts = [], onAlertResolved, addToast }) {
    const [expanded, setExpanded] = useState(false);
    const activeAlerts = alerts.filter(a => !a.resolved);

    if (activeAlerts.length === 0) {
        return null;
    }

    return (
        <div className="alert-banner" role="region" aria-label="Active Alert Banner" style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid var(--color-warning)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px'
        }}>
            <div 
                className="alert-banner__header" 
                onClick={() => setExpanded(!expanded)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)', fontWeight: 700 }}>
                    <AlertTriangle size={18} />
                    <span>Active Alerts ({activeAlerts.length})</span>
                </div>
                <button 
                    aria-label={expanded ? 'Collapse alerts' : 'Expand alerts'}
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>
            {expanded && (
                <div className="alert-banner__list" style={{ marginTop: '12px' }}>
                    <AlertCenter alerts={activeAlerts} onAlertResolved={onAlertResolved} addToast={addToast} />
                </div>
            )}
        </div>
    );
}
