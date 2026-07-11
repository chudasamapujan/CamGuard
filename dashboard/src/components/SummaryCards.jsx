import React from 'react';
import { Camera, Wifi, WifiOff, AlertTriangle, AlertCircle } from 'lucide-react';
import { SkeletonSummaryCard } from './Skeleton';

function SummaryCards({ summary, loading }) {
    if (loading) {
        return (
            <section className="summary-row" aria-label="Loading summary" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
            }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonSummaryCard key={i} />
                ))}
            </section>
        );
    }

    const cards = [
        {
            id: 'total',
            label: 'Total Cameras',
            value: summary?.total_cameras ?? 0,
            icon: Camera,
            color: '#2563EB',
            bg: 'rgba(37, 99, 235, 0.1)',
        },
        {
            id: 'online',
            label: 'Online Cameras',
            value: (summary?.online ?? 0) + (summary?.warning ?? 0),  // Online includes online and warning status
            icon: Wifi,
            color: '#16A34A',
            bg: 'rgba(22, 163, 74, 0.1)',
        },
        {
            id: 'offline',
            label: 'Offline Cameras',
            value: summary?.offline ?? 0,
            icon: WifiOff,
            color: '#64748B',
            bg: 'rgba(100, 116, 139, 0.1)',
        },
        {
            id: 'alerts',
            label: 'Active Alerts',
            value: summary?.active_alerts ?? 0,
            icon: AlertTriangle,
            color: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.1)',
        },
        {
            id: 'critical',
            label: 'Critical Cameras',
            value: summary?.critical ?? 0,
            icon: AlertCircle,
            color: '#DC2626',
            bg: 'rgba(220, 38, 38, 0.1)',
        },
    ];

    return (
        <div className="summary-section">
            <section className="summary-row" aria-label="Primary indicators" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
            }}>
                {cards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.id} className="kpi-card" id={`kpi-${card.id}`}>
                            <div className="kpi-card__icon" style={{ background: card.bg, color: card.color }}>
                                <Icon size={20} />
                            </div>
                            <div className="kpi-card__body">
                                <span className="kpi-card__value">{card.value}</span>
                                <span className="kpi-card__label">{card.label}</span>
                            </div>
                        </div>
                    );
                })}
            </section>
        </div>
    );
}

export default React.memo(SummaryCards);
