import React, { useState, useMemo, useCallback } from 'react';
import {
    Search, Filter, Download, Check, X, AlertCircle, AlertTriangle, Clock,
} from 'lucide-react';
import { resolveAlert } from '../services/api';
import EmptyState from './EmptyState';
import { formatDateTime, exportToCSV } from '../utils/helpers';

function AlertCenter({ alerts, loading, onAlertResolved }) {
    const [search, setSearch] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active');
    const [sortBy, setSortBy] = useState('newest');

    const filtered = useMemo(() => {
        if (!alerts) return [];
        let list = [...alerts];

        // Search
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(a =>
                a.camera_id.toLowerCase().includes(q) ||
                a.message.toLowerCase().includes(q) ||
                a.alert_type.toLowerCase().includes(q)
            );
        }

        // Severity
        if (severityFilter !== 'all') {
            list = list.filter(a => a.severity === severityFilter);
        }

        // Status
        if (statusFilter === 'active') list = list.filter(a => !a.resolved);
        else if (statusFilter === 'resolved') list = list.filter(a => a.resolved);

        // Sort
        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sortBy === 'severity') {
                const order = { critical: 0, warning: 1 };
                return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
            }
            return 0;
        });

        return list;
    }, [alerts, search, severityFilter, statusFilter, sortBy]);

    const handleResolve = useCallback(async (id) => {
        try {
            await resolveAlert(id);
            if (onAlertResolved) onAlertResolved();
        } catch { /* ignore */ }
    }, [onAlertResolved]);

    const handleExport = () => {
        if (filtered.length > 0) exportToCSV(filtered, 'alerts_export');
    };

    const counts = useMemo(() => {
        if (!alerts) return { active: 0, resolved: 0, critical: 0, warning: 0 };
        return {
            active: alerts.filter(a => !a.resolved).length,
            resolved: alerts.filter(a => a.resolved).length,
            critical: alerts.filter(a => !a.resolved && a.severity === 'critical').length,
            warning: alerts.filter(a => !a.resolved && a.severity === 'warning').length,
        };
    }, [alerts]);

    return (
        <section className="alert-center" aria-label="Alert center">
            <div className="alert-center__header">
                <h2 className="alert-center__title">
                    <AlertCircle size={20} /> Alert Center
                </h2>
                <div className="alert-center__actions">
                    <button className="btn btn--sm btn--ghost" onClick={handleExport} title="Export alerts to CSV">
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="alert-center__toolbar">
                <div className="alert-center__search">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Search alerts..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search alerts"
                        id="alert-search"
                    />
                    {search && (
                        <button className="camera-toolbar__clear" onClick={() => setSearch('')} aria-label="Clear search">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="alert-center__filter-group" role="group" aria-label="Alert status filter">
                    {[
                        { key: 'active', label: 'Active', count: counts.active },
                        { key: 'resolved', label: 'Resolved', count: counts.resolved },
                        { key: 'all', label: 'All', count: (counts.active + counts.resolved) },
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`filter-chip ${statusFilter === f.key ? 'filter-chip--active' : ''}`}
                            onClick={() => setStatusFilter(f.key)}
                            aria-pressed={statusFilter === f.key}
                        >
                            {f.label} <span className="filter-chip__count">{f.count}</span>
                        </button>
                    ))}
                </div>

                <div className="alert-center__filter-group" role="group" aria-label="Alert severity filter">
                    {[
                        { key: 'all', label: 'All Levels' },
                        { key: 'critical', label: 'Critical', count: counts.critical },
                        { key: 'warning', label: 'Warning', count: counts.warning },
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`filter-chip ${severityFilter === f.key ? 'filter-chip--active' : ''} ${f.key !== 'all' ? `filter-chip--${f.key}` : ''}`}
                            onClick={() => setSeverityFilter(f.key)}
                            aria-pressed={severityFilter === f.key}
                        >
                            {f.label} {f.count !== undefined && <span className="filter-chip__count">{f.count}</span>}
                        </button>
                    ))}
                </div>

                <select
                    className="alert-center__sort"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    aria-label="Sort alerts"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="severity">By Severity</option>
                </select>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <EmptyState type="alerts" />
            ) : (
                <div className="alert-table-wrapper">
                    <table className="alert-table" aria-label="Alerts table">
                        <thead>
                            <tr>
                                <th>Severity</th>
                                <th>Camera</th>
                                <th>Message</th>
                                <th>Type</th>
                                <th>Created</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(alert => (
                                <tr key={alert.id} className={alert.resolved ? 'alert-row--resolved' : ''} id={`alert-row-${alert.id}`}>
                                    <td>
                                        <span className={`alert-severity alert-severity--${alert.severity}`}>
                                            {alert.severity === 'critical'
                                                ? <><AlertCircle size={14} /> Critical</>
                                                : <><AlertTriangle size={14} /> Warning</>
                                            }
                                        </span>
                                    </td>
                                    <td><span className="alert-camera-tag">{alert.camera_id}</span></td>
                                    <td className="alert-message-cell">{alert.message}</td>
                                    <td><span className="alert-type-tag">{alert.alert_type.replace(/_/g, ' ')}</span></td>
                                    <td className="alert-time-cell">
                                        <Clock size={13} /> {formatDateTime(alert.created_at)}
                                    </td>
                                    <td>
                                        {alert.resolved
                                            ? <span className="alert-resolved-tag"><Check size={13} /> Resolved</span>
                                            : <span className="alert-active-tag">Active</span>
                                        }
                                    </td>
                                    <td>
                                        {!alert.resolved && (
                                            <button
                                                className="btn btn--sm btn--success"
                                                onClick={() => handleResolve(alert.id)}
                                                aria-label={`Resolve alert ${alert.id}`}
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="alert-center__count">
                Showing {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
            </p>
        </section>
    );
}

export default React.memo(AlertCenter);
