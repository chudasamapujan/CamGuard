/**
 * AlertPanel Component
 * --------------------
 * Scrollable alert feed with color-coded severity.
 * Shows recent alerts with camera ID, message, and timestamp.
 * Includes resolve button for active alerts.
 */

import React from 'react';
import { resolveAlert } from '../services/api';

export default function AlertPanel({ alerts, onAlertResolved }) {
    if (!alerts) return null;

    const handleResolve = async (alertId) => {
        try {
            await resolveAlert(alertId);
            if (onAlertResolved) onAlertResolved();
        } catch (err) {
            console.error('Failed to resolve alert:', err);
        }
    };

    const formatTime = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const severityConfig = {
        critical: { color: '#FF4757', bg: 'rgba(255,71,87,0.1)', icon: '🔴' },
        warning: { color: '#FFB800', bg: 'rgba(255,184,0,0.1)', icon: '🟡' },
    };

    return (
        <div className="alert-panel">
            <div className="alert-panel-header">
                <h2>🔔 Alerts</h2>
                <span className="alert-count">
                    {alerts.filter((a) => !a.resolved).length} active
                </span>
            </div>
            <div className="alert-list">
                {alerts.length === 0 ? (
                    <div className="alert-empty">
                        <p>✅ No alerts — all systems healthy</p>
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const config = severityConfig[alert.severity] || severityConfig.warning;
                        return (
                            <div
                                key={alert.id}
                                className={`alert-item ${alert.resolved ? 'resolved' : ''}`}
                                style={{ borderLeftColor: config.color, background: alert.resolved ? 'transparent' : config.bg }}
                                id={`alert-${alert.id}`}
                            >
                                <div className="alert-item-top">
                                    <span className="alert-severity-icon">{config.icon}</span>
                                    <span className="alert-camera-id">{alert.camera_id}</span>
                                    <span className="alert-time">{formatTime(alert.created_at)}</span>
                                </div>
                                <p className="alert-message">{alert.message}</p>
                                <div className="alert-item-bottom">
                                    <span className="alert-type">{alert.alert_type.replace('_', ' ')}</span>
                                    {!alert.resolved && (
                                        <button
                                            className="alert-resolve-btn"
                                            onClick={() => handleResolve(alert.id)}
                                        >
                                            Resolve
                                        </button>
                                    )}
                                    {alert.resolved && (
                                        <span className="alert-resolved-label">✓ Resolved</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
