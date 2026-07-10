import React from 'react';
import { MapPin, Clock, Zap, Globe, MoreVertical } from 'lucide-react';
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

function CameraCard({ camera, onClick }) {
    const health = camera.latest_health;
    const isOnline = health && health.is_online;
    const score = computeHealthScore(health);
    const scoreColor = healthScoreColor(score);

    return (
        <article
            className={`cam-card cam-card--${camera.status}`}
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
                    <span className="cam-card__id">{camera.id}</span>
                </div>
                <StatusBadge status={camera.status} />
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
                    <div className="cam-card__offline-icon">📡</div>
                    <p className="cam-card__offline-title">Camera Offline</p>
                    <p className="cam-card__offline-sub">Last seen: {formatRelativeTime(camera.last_heartbeat)}</p>
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
