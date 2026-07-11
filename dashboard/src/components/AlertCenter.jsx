import React, { useState, useMemo, useCallback } from 'react';
import { Check, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { resolveAlert } from '../services/api';
import EmptyState from './EmptyState';
import { formatDateTime } from '../utils/helpers';

export default function AlertCenter({ alerts, onAlertResolved, addToast }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!alerts) return [];
        let list = [...alerts];

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(a =>
                a.camera_id.toLowerCase().includes(q) ||
                a.message.toLowerCase().includes(q) ||
                a.alert_type.toLowerCase().includes(q)
            );
        }

        // Return only unresolved alerts first, sorted by created_at desc
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [alerts, search]);

    const handleResolve = useCallback(async (id) => {
        try {
            await resolveAlert(id);
            if (addToast) addToast(`Incident #${id} resolved`, 'success');
            if (onAlertResolved) onAlertResolved();
        } catch (err) {
            console.error('Failed to resolve alert:', err);
            if (addToast) addToast('Failed to resolve alert', 'error');
        }
    }, [onAlertResolved, addToast]);

    return (
        <section className="alert-center" aria-label="Recent Incidents Log" style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div className="alert-center__header" style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                <h3 className="alert-center__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                    <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                    Recent Alerts Log
                </h3>
                <input
                    type="text"
                    placeholder="Search incidents..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--color-border)',
                        color: 'inherit',
                        maxWidth: '250px'
                    }}
                />
            </div>

            {filtered.length === 0 ? (
                <EmptyState type="alerts" />
            ) : (
                <div className="alert-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="alert-table" aria-label="Recent Alerts Table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                <th style={{ padding: '10px' }}>Camera</th>
                                <th style={{ padding: '10px' }}>Alert Type</th>
                                <th style={{ padding: '10px' }}>Severity</th>
                                <th style={{ padding: '10px' }}>Time</th>
                                <th style={{ padding: '10px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, 15).map(alert => (
                                <tr key={alert.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: alert.resolved ? 0.6 : 1 }}>
                                    <td style={{ padding: '10px', fontWeight: 700 }}>
                                        {alert.camera_name || alert.camera_id}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <span className="alert-type-tag" style={{ textTransform: 'capitalize' }}>
                                            {alert.alert_type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <span className={`alert-severity alert-severity--${alert.severity}`} style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: alert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)'
                                        }}>
                                            {alert.severity === 'critical' ? <AlertCircle size={12} /> : <AlertTriangle size={12} />}
                                            {alert.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={12} />
                                            <span>{formatDateTime(alert.created_at)}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {alert.resolved ? (
                                            <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                <Check size={12} /> Resolved
                                            </span>
                                        ) : (
                                            <button
                                                className="btn btn--sm btn--success"
                                                onClick={() => handleResolve(alert.id)}
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '0.7rem',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    background: 'rgba(22, 163, 74, 0.15)',
                                                    color: '#16A34A',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Active (Resolve)
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
