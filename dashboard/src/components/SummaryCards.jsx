import React, { useMemo } from 'react';
import {
    Camera, Wifi, WifiOff, AlertTriangle, AlertCircle,
    Cpu, MemoryStick, HardDrive, Activity,
} from 'lucide-react';
import { SkeletonSummaryCard } from './Skeleton';

function SummaryCards({ summary, cameras, loading }) {
    const avgMetrics = useMemo(() => {
        if (!cameras || cameras.length === 0) return { cpu: 0, mem: 0, sto: 0 };
        let cpuSum = 0, memSum = 0, stoSum = 0, count = 0;
        cameras.forEach(c => {
            if (c.latest_health && c.latest_health.is_online) {
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
    }, [cameras]);

    if (loading) {
        return (
            <section className="summary-row" aria-label="Loading summary">
                {Array.from({ length: 8 }).map((_, i) => (
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
            color: 'var(--color-primary)',
            bg: 'var(--kpi-bg-primary)',
        },
        {
            id: 'online',
            label: 'Online',
            value: summary?.online ?? 0,
            icon: Wifi,
            color: 'var(--color-success)',
            bg: 'var(--kpi-bg-success)',
        },
        {
            id: 'offline',
            label: 'Offline',
            value: summary?.offline ?? 0,
            icon: WifiOff,
            color: 'var(--color-muted)',
            bg: 'var(--kpi-bg-muted)',
        },
        {
            id: 'warning',
            label: 'Warnings',
            value: summary?.warning_alerts ?? 0,
            icon: AlertTriangle,
            color: 'var(--color-warning)',
            bg: 'var(--kpi-bg-warning)',
        },
        {
            id: 'critical',
            label: 'Critical',
            value: summary?.critical_alerts ?? 0,
            icon: AlertCircle,
            color: 'var(--color-critical)',
            bg: 'var(--kpi-bg-critical)',
        },
        {
            id: 'cpu',
            label: 'Avg CPU',
            value: `${avgMetrics.cpu}%`,
            icon: Cpu,
            color: 'var(--color-primary)',
            bg: 'var(--kpi-bg-primary)',
        },
        {
            id: 'mem',
            label: 'Avg Memory',
            value: `${avgMetrics.mem}%`,
            icon: MemoryStick,
            color: 'var(--color-info)',
            bg: 'var(--kpi-bg-info)',
        },
        {
            id: 'sto',
            label: 'Avg Storage',
            value: `${avgMetrics.sto}%`,
            icon: HardDrive,
            color: 'var(--color-warning)',
            bg: 'var(--kpi-bg-warning)',
        },
    ];

    return (
        <section className="summary-row" aria-label="Key performance indicators">
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
    );
}

export default React.memo(SummaryCards);
