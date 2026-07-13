import React from 'react';
import { Cpu, MemoryStick, HardDrive, Globe, Clock, Zap, WifiOff, ShieldAlert, MapPin } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatRelativeTime } from '../utils/helpers';

function ProgressBar({ label, value, icon: Icon, warn = 75, crit = 90 }) {
    let color = 'var(--color-success)';
    if (value >= crit) color = 'var(--color-critical)';
    else if (value >= warn) color = 'var(--color-warning)';

    return (
        <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${value.toFixed(1)}%`}>
            <div className="progress__header" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                <Icon size={12} />
                <span className="progress__label" style={{ flex: 1 }}>{label}</span>
                <span className="progress__value" style={{ color, fontWeight: 700 }}>{value.toFixed(1)}%</span>
            </div>
            <div className="progress__track" style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginTop: '4px' }}>
                <div
                    className="progress__fill"
                    style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color, height: '100%' }}
                />
            </div>
        </div>
    );
}

function CameraCard({ camera, onClick, settings }) {
    const health = camera.latest_health;
    const isOnline = camera.status !== 'offline' && health && health.is_online;
    const thresholds = camera.thresholds || (settings ? {
        cpu_warning: parseFloat(settings.cpu_threshold) || 75,
        cpu_critical: (parseFloat(settings.cpu_threshold) || 75) * 1.2,
        memory_warning: parseFloat(settings.memory_threshold) || 75,
        memory_critical: (parseFloat(settings.memory_threshold) || 75) * 1.2,
        storage_warning: parseFloat(settings.storage_threshold) || 80,
        storage_critical: (parseFloat(settings.storage_threshold) || 80) * 1.15,
        latency_warning: parseFloat(settings.latency_threshold) || 200,
        latency_critical: (parseFloat(settings.latency_threshold) || 200) * 2.5
    } : {
        cpu_warning: 75,
        cpu_critical: 90,
        memory_warning: 75,
        memory_critical: 90,
        storage_warning: 80,
        storage_critical: 92,
        latency_warning: 200,
        latency_critical: 500
    });

    return (
        <article
            className={`cam-card cam-card--${camera.status}`}
            onClick={() => onClick && onClick(camera)}
            onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(camera)}
            role="button"
            tabIndex={0}
            id={`cam-${camera.id}`}
            aria-label={`${camera.name}, status ${camera.status}`}
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Top status indicator line */}
            <div className="cam-card__strip" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                backgroundColor: camera.status === 'critical' ? 'var(--color-critical)'
                    : camera.status === 'warning' ? 'var(--color-warning)'
                    : camera.status === 'offline' ? 'var(--color-text-muted)'
                    : 'var(--color-success)'
            }} />

            <div className="cam-card__top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="cam-card__identity">
                    <h3 className="cam-card__name" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                        {camera.name || camera.id}
                    </h3>
                    <span className="cam-card__id" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                        {camera.id}
                    </span>
                </div>
                <StatusBadge status={camera.status} />
            </div>

            {camera.location && (
                <div className="cam-card__location" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <MapPin size={12} />
                    <span>{camera.location}</span>
                </div>
            )}

            {isOnline ? (
                <>
                    <div className="cam-card__metrics" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <ProgressBar label="CPU" value={health.cpu_usage} icon={Cpu} warn={thresholds.cpu_warning} crit={thresholds.cpu_critical} />
                        <ProgressBar label="Memory" value={health.memory_usage} icon={MemoryStick} warn={thresholds.memory_warning} crit={thresholds.memory_critical} />
                        <ProgressBar label="Storage" value={health.storage_usage} icon={HardDrive} warn={thresholds.storage_warning} crit={thresholds.storage_critical} />
                    </div>

                    <div className="cam-card__footer" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: '8px',
                        marginTop: '4px'
                    }}>
                        <div className="cam-card__stat" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Globe size={12} />
                            <span style={{
                                color: health.network_latency >= thresholds.latency_critical ? 'var(--color-critical)'
                                    : health.network_latency >= thresholds.latency_warning ? 'var(--color-warning)' : 'inherit',
                                fontWeight: health.network_latency >= thresholds.latency_warning ? 700 : 'normal'
                            }}>
                                {health.network_latency.toFixed(0)} ms
                            </span>
                        </div>
                        <div className="cam-card__stat" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            <span>{formatRelativeTime(camera.last_heartbeat)}</span>
                        </div>
                    </div>

                    {health.fault_type && (
                        <div className="cam-card__fault" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(220, 38, 38, 0.1)',
                            color: 'var(--color-critical)',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600
                        }}>
                            <Zap size={12} />
                            <span>{health.fault_type}</span>
                        </div>
                    )}
                </>
            ) : (
                <div className="cam-card__offline" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 0',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '4px',
                    color: 'var(--color-text-secondary)',
                    flex: 1
                }}>
                    <WifiOff size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Camera Offline</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>
                        {camera.last_heartbeat ? `Last seen: ${formatRelativeTime(camera.last_heartbeat)}` : 'Never connected'}
                    </span>
                </div>
            )}
        </article>
    );
}

export default React.memo(CameraCard);
