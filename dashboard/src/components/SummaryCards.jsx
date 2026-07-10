import React, { useMemo, useState } from 'react';
import {
    Camera, Wifi, WifiOff, AlertTriangle, AlertCircle,
    Cpu, MemoryStick, HardDrive, ShieldOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { SkeletonSummaryCard } from './Skeleton';

function SummaryCards({ summary, cameras, loading }) {
    const [showSecondary, setShowSecondary] = useState(false);

    const avgMetrics = useMemo(() => {
        if (summary && summary.avg_cpu !== undefined) {
            return {
                cpu: summary.avg_cpu,
                mem: summary.avg_mem,
                sto: summary.avg_storage
            };
        }
        if (!cameras || cameras.length === 0) return { cpu: 0, mem: 0, sto: 0 };
        let cpuSum = 0, memSum = 0, stoSum = 0, count = 0;
        cameras.forEach(c => {
            if (c.latest_health && c.latest_health.is_online && c.is_enabled) {
                cpuSum += c.latest_health.cpu_usage;
                memSum += c.latest_health.memory_usage;
                stoSum += c.latest_health.storage_usage;
                count++;
            }
        });
        if (count === 0) return { cpu: 0, mem: 0, sto: 0 };
        return {
            cpu: (cpuSum / count).toFixed(1),
            mem: (memSum / count).toFixed(1),
            sto: (stoSum / count).toFixed(1),
        };
    }, [cameras, summary]);

    if (loading) {
        return (
            <section className="summary-row" aria-label="Loading summary">
                {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonSummaryCard key={i} />
                ))}
            </section>
        );
    }

    const primaryCards = [
        {
            id: 'total',
            label: 'Total Cameras',
            value: summary?.total_cameras ?? cameras?.length ?? 0,
            icon: Camera,
            color: '#2563EB',
            bg: 'rgba(37, 99, 235, 0.1)',
        },
        {
            id: 'online',
            label: 'Healthy',
            value: summary?.online ?? 0,
            icon: Wifi,
            color: '#16A34A',
            bg: 'rgba(22, 163, 74, 0.1)',
        },
        {
            id: 'critical',
            label: 'Critical',
            value: summary?.critical ?? 0,
            icon: AlertCircle,
            color: '#DC2626',
            bg: 'rgba(220, 38, 38, 0.1)',
        },
        {
            id: 'offline',
            label: 'Offline',
            value: summary?.offline ?? 0,
            icon: WifiOff,
            color: '#64748B',
            bg: 'rgba(100, 116, 139, 0.1)',
        },
        {
            id: 'cpu',
            label: 'Average CPU',
            value: `${avgMetrics.cpu}%`,
            icon: Cpu,
            color: '#2563EB',
            bg: 'rgba(37, 99, 235, 0.1)',
        },
        {
            id: 'mem',
            label: 'Average Memory',
            value: `${avgMetrics.mem}%`,
            icon: MemoryStick,
            color: '#7C3AED',
            bg: 'rgba(124, 58, 237, 0.1)',
        },
    ];

    const secondaryCards = [
        {
            id: 'warning',
            label: 'Warning Status',
            value: summary?.warning ?? 0,
            icon: AlertTriangle,
            color: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.1)',
        },
        {
            id: 'disabled',
            label: 'Disabled',
            value: summary?.disabled ?? 0,
            icon: ShieldOff,
            color: '#64748B',
            bg: 'rgba(100, 116, 139, 0.1)',
        },
        {
            id: 'sto',
            label: 'Average Storage',
            value: `${avgMetrics.sto}%`,
            icon: HardDrive,
            color: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.1)',
        },
    ];

    return (
        <div className="summary-section">
            <section className="summary-row" aria-label="Primary indicators" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
            }}>
                {primaryCards.map(card => {
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

            <div className="secondary-metrics-accordion" style={{ marginBottom: '16px' }}>
                <button
                    className="btn btn--secondary btn--sm"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '6px 12px',
                        cursor: 'pointer'
                    }}
                    onClick={() => setShowSecondary(!showSecondary)}
                >
                    {showSecondary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showSecondary ? 'Hide' : 'Show'} Secondary Metrics</span>
                </button>

                {showSecondary && (
                    <section className="summary-row secondary-summary-row" aria-label="Secondary indicators" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                        marginTop: '12px',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {secondaryCards.map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.id} className="kpi-card kpi-card--secondary" id={`kpi-${card.id}`} style={{ opacity: 0.9 }}>
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
                )}
            </div>
        </div>
    );
}

export default React.memo(SummaryCards);
