import React from 'react';
import { MapPin, Clock, Zap, Globe, Edit2, Power, WifiOff, VideoOff } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { computeHealthScore, healthScoreColor, formatRelativeTime } from '../utils/helpers';

function ProgressBar({ label, value, warn = 75, crit = 90 }) {
    let color = 'var(--color-success)';
    if (value >= crit) color = 'var(--color-critical)';
    else if (value >= warn) color = 'var(--color-warning)';

    return (
        <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${value.toFixed(1)}%`}>
            <div className="progress__header">
                <span className="progress__label">{label}</span>
                <span className="progress__value" style={{ color }}>{value.toFixed(1)}%</span>
            </div>
            <div className="progress__track">
                <div
                    className="progress__fill"
                    style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

function CameraCard({ camera, onClick, onToggle, onEdit }) {
    const health = camera.latest_health;
    const isOnline = health && health.is_online && camera.is_enabled;
    const score = camera.is_enabled ? computeHealthScore(health) : 0;
    const scoreColor = camera.is_enabled ? healthScoreColor(score) : 'var(--color-text-muted)';

    return (
        <article
            className={`cam-card cam-card--${camera.status} ${!camera.is_enabled ? 'cam-card--disabled' : ''}`}
            onClick={() => onClick && onClick(camera)}
            onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(camera)}
            role="button"
            tabIndex={0}
            id={`cam-${camera.id}`}
            aria-label={`${camera.name}, status ${camera.status}`}
        >
            {/* Top color strip */}
            <div className="cam-card__strip" />

            <div className="cam-card__top">
                <div className="cam-card__identity">
                    <h3 className="cam-card__name">{camera.name || camera.id}</h3>
                    <div className="cam-card__id-status">
                        <span className="cam-card__id">{camera.id}</span>
                        <StatusBadge status={camera.status} />
                    </div>
                </div>
                
                <div className="cam-card__quick-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                        className="cam-card__quick-btn"
                        onClick={() => onEdit && onEdit(camera)}
                        title="Edit Camera"
                        aria-label="Edit Camera settings"
                    >
                        <Edit2 size={13} />
                    </button>
                    <button
                        className={`cam-card__quick-btn ${camera.is_enabled ? 'cam-card__quick-btn--active' : 'cam-card__quick-btn--inactive'}`}
                        onClick={() => onToggle && onToggle(camera)}
                        title={camera.is_enabled ? "Disable Camera" : "Enable Camera"}
                        aria-label="Toggle Camera active state"
                    >
                        <Power size={13} />
                    </button>
                </div>
            </div>

            <div className="cam-card__location">
                <MapPin size={13} />
                <span>{camera.location || 'Unknown'}</span>
            </div>

            {isOnline ? (
                <>
                    <div className="cam-card__metrics">
                        <ProgressBar label="CPU" value={health.cpu_usage} warn={75} crit={90} />
                        <ProgressBar label="Memory" value={health.memory_usage} warn={75} crit={90} />
                        <ProgressBar label="Storage" value={health.storage_usage} warn={80} crit={95} />
                    </div>

                    <div className="cam-card__footer">
                        <div className="cam-card__stat">
                            <Globe size={13} />
                            <span style={{
                                color: health.network_latency > 500 ? 'var(--color-critical)'
                                    : health.network_latency > 200 ? 'var(--color-warning)' : 'var(--color-text-secondary)'
                            }}>
                                {health.network_latency.toFixed(0)} ms
                            </span>
                        </div>
                        <div className="cam-card__stat">
                            <Clock size={13} />
                            <span>{formatRelativeTime(camera.last_heartbeat)}</span>
                        </div>
                        <div className="cam-card__score" style={{ color: scoreColor }}>
                            {score}
                        </div>
                    </div>

                    {health.fault_type && (
                        <div className="cam-card__fault">
                            <Zap size={13} />
                            <span>{health.fault_type}</span>
                        </div>
                    )}
                </>
            ) : (
                <div className="cam-card__offline">
                    <div className="cam-card__offline-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                        {camera.is_enabled ? <WifiOff size={24} /> : <VideoOff size={24} />}
                    </div>
                    <p className="cam-card__offline-title">{camera.is_enabled ? 'Camera Offline' : 'Camera Disabled'}</p>
                    <p className="cam-card__offline-sub">
                        {camera.is_enabled 
                            ? `Last seen: ${formatRelativeTime(camera.last_heartbeat)}` 
                            : 'Simulation feed paused'}
                    </p>
                </div>
            )}

            {camera.active_alerts > 0 && (
                <div className="cam-card__alert-count">
                    {camera.active_alerts} active alert{camera.active_alerts > 1 ? 's' : ''}
                </div>
            )}
        </article>
    );
}

export default React.memo(CameraCard);
