import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { X, Clock, Cpu, MemoryStick, HardDrive, Globe, Activity, Zap, Download, AlertTriangle, Check, VideoOff } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchCameraHistory, fetchAlerts } from '../services/api';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { formatTime, formatRelativeTime, exportToCSV, formatDateTime } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function CameraDrawer({ camera, onClose }) {
    const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'alerts'
    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [chartHours, setChartHours] = useState(1);
    const [cameraAlerts, setCameraAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        if (!camera) return;
        setHistoryLoading(true);
        try {
            const res = await fetchCameraHistory(camera.id, chartHours);
            setHistory(res.data);
        } catch (err) {
            console.error('Drawer history error:', err);
        }
        setHistoryLoading(false);
    }, [camera, chartHours]);

    const loadAlerts = useCallback(async () => {
        if (!camera) return;
        setAlertsLoading(true);
        try {
            const res = await fetchAlerts(false, 100, camera.id);
            setCameraAlerts(res.data);
        } catch (err) {
            console.error('Drawer alerts error:', err);
        }
        setAlertsLoading(false);
    }, [camera]);

    useEffect(() => {
        loadHistory();
        loadAlerts();
    }, [loadHistory, loadAlerts]);

    // Escape key handler to close drawer
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!camera) return null;

    const health = camera.latest_health;
    const isOnline = camera.status !== 'offline' && health?.is_online;

    const formattedHeartbeat = useMemo(() => {
        const hb = health ? health.timestamp : camera.last_heartbeat;
        if (!hb) return 'Never';
        const relative = formatRelativeTime(hb);
        if (relative === 'Just now') return 'Just now';
        const absolute = formatTime(hb);
        return `${absolute} (${relative})`;
    }, [health, camera.last_heartbeat]);

    const records = useMemo(() => {
        const histRecords = history?.records ? [...history.records] : [];
        if (isOnline && health) {
            const hasLatest = histRecords.some(r => r.timestamp === health.timestamp || r.id === health.id);
            if (!hasLatest) {
                histRecords.push(health);
            }
        }
        return histRecords;
    }, [history, health, isOnline]);

    const labels = records.map(r => {
        const d = new Date(r.timestamp);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });

    const makeDataset = (label, key, color) => ({
        label,
        data: records.map(r => r[key]),
        borderColor: color,
        backgroundColor: color + '12',
        fill: true,
        tension: 0.35,
        pointRadius: 1.5,
        pointHoverRadius: 4,
        borderWidth: 2,
    });

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#B2BEC3',
                    usePointStyle: true,
                    padding: 10,
                    font: { family: "'Inter', sans-serif", size: 10 },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#FFFFFF',
                bodyColor: '#E2E8F0',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 4,
                titleFont: { family: "'Inter', sans-serif" },
                bodyFont: { family: "'Inter', sans-serif" },
            },
        },
        scales: {
            x: {
                ticks: { color: '#636E72', maxTicksLimit: 6, font: { size: 9 } },
                grid: { color: 'rgba(255,255,255,0.03)' },
            },
            y: {
                min: 0, max: 100,
                ticks: { color: '#636E72', font: { size: 9 } },
                grid: { color: 'rgba(255,255,255,0.03)' },
            },
        },
        interaction: { intersect: false, mode: 'index' },
    };

    const latencyOptions = {
        ...chartOptions,
        scales: {
            ...chartOptions.scales,
            y: { ...chartOptions.scales.y, max: undefined },
        },
    };

    const handleExport = () => {
        if (records.length > 0) {
            exportToCSV(records, `${camera.id}_history`);
        }
    };

    return (
        <>
            <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
            <aside className="drawer" role="dialog" aria-label={`Details for ${camera.name}`}>
                {/* Header */}
                <div className="drawer__header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 className="drawer__title">{camera.name || camera.id}</h2>
                            <StatusBadge status={camera.status} />
                        </div>
                        <p className="drawer__id">{camera.id}</p>
                    </div>
                    <button className="drawer__close" onClick={onClose} aria-label="Close details panel">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="drawer__tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === 'metrics'}
                        className={`drawer__tab ${activeTab === 'metrics' ? 'drawer__tab--active' : ''}`}
                        onClick={() => setActiveTab('metrics')}
                    >
                        <Activity size={14} /> Status & Trends
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'alerts'}
                        className={`drawer__tab ${activeTab === 'alerts' ? 'drawer__tab--active' : ''}`}
                        onClick={() => setActiveTab('alerts')}
                    >
                        <AlertTriangle size={14} /> Incident Reports ({cameraAlerts.length})
                    </button>
                </div>

                <div className="drawer__body">
                    {/* Metrics and Status Tab */}
                    {activeTab === 'metrics' && (
                        <div className="drawer-tab-pane">
                            <div className="drawer__info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="drawer__info-item">
                                    <span className="drawer__info-label"><Clock size={13} /> Last Heartbeat</span>
                                    <span className="drawer__info-value">{formattedHeartbeat}</span>
                                </div>
                                <div className="drawer__info-item">
                                    <span className="drawer__info-label"><Activity size={13} /> Current State</span>
                                    <span className="drawer__info-value" style={{ fontWeight: 700 }}>
                                        {camera.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Current Telemetry */}
                            {isOnline && health ? (
                                <section className="drawer__section" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                                    <h3 className="drawer__section-title">Current Telemetry</h3>
                                    <div className="drawer__metrics" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {[
                                            { label: 'CPU Usage', value: health.cpu_usage, icon: Cpu, warn: 75, crit: 90 },
                                            { label: 'Memory Usage', value: health.memory_usage, icon: MemoryStick, warn: 75, crit: 90 },
                                            { label: 'Storage Usage', value: health.storage_usage, icon: HardDrive, warn: 80, crit: 95 },
                                        ].map(m => {
                                            const color = m.value >= m.crit ? 'var(--color-critical)' : m.value >= m.warn ? 'var(--color-warning)' : 'var(--color-success)';
                                            return (
                                                <div key={m.label} className="drawer__metric-row">
                                                    <div className="drawer__metric-label"><m.icon size={13} /> {m.label}</div>
                                                    <div className="drawer__metric-bar-wrapper">
                                                        <div className="progress__track" style={{ flex: 1, height: '6px' }}>
                                                            <div className="progress__fill" style={{ width: `${m.value}%`, backgroundColor: color, height: '100%' }} />
                                                        </div>
                                                        <span className="drawer__metric-val font-mono" style={{ color }}>{m.value.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="drawer__metric-row">
                                            <div className="drawer__metric-label"><Globe size={13} /> Network Latency</div>
                                            <span className="drawer__metric-val font-mono font-bold" style={{
                                                color: health.network_latency > 500 ? 'var(--color-critical)' : health.network_latency > 200 ? 'var(--color-warning)' : 'var(--color-success)'
                                            }}>
                                                {health.network_latency.toFixed(0)} ms
                                            </span>
                                        </div>
                                        {health.fault_type && (
                                            <div className="drawer__fault" style={{
                                                background: 'rgba(220,38,38,0.1)',
                                                color: 'var(--color-critical)',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                marginTop: '8px',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <Zap size={14} />
                                                <span>Device Fault Active: <strong>{health.fault_type}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            ) : (
                                <div className="drawer__offline-banner" style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                                    <VideoOff size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Telemetry feed offline. Check power supply or device network interface.</p>
                                </div>
                            )}

                            {/* Charts */}
                            {isOnline && (
                                <section className="drawer__section" style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                                    <div className="drawer__section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h3 className="drawer__section-title" style={{ margin: 0 }}>Telemetry Trends</h3>
                                        <div className="drawer__chart-controls" style={{ display: 'flex', gap: '4px' }}>
                                            {[1, 6, 24].map(h => (
                                                <button
                                                    key={h}
                                                    className={`btn btn--sm ${chartHours === h ? 'btn--active' : 'btn--ghost'}`}
                                                    onClick={() => setChartHours(h)}
                                                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                                >
                                                    {h}h
                                                </button>
                                            ))}
                                            <button className="btn btn--sm btn--ghost" onClick={handleExport} title="Export CSV" style={{ padding: '2px 8px' }}>
                                                <Download size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {historyLoading ? (
                                        <div className="drawer__chart-placeholder">Loading charts...</div>
                                    ) : records.length === 0 ? (
                                        <EmptyState type="history" />
                                    ) : (
                                        <div className="drawer__charts" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div className="drawer__chart-box">
                                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Resource Utilization (%)</h4>
                                                <div className="drawer__chart-canvas" style={{ height: '140px' }}>
                                                    <Line
                                                        data={{
                                                            labels,
                                                            datasets: [
                                                                makeDataset('CPU', 'cpu_usage', '#00D4FF'),
                                                                makeDataset('Memory', 'memory_usage', '#9B59B6'),
                                                                makeDataset('Storage', 'storage_usage', '#FFB800'),
                                                            ],
                                                        }}
                                                        options={chartOptions}
                                                    />
                                                </div>
                                            </div>
                                            <div className="drawer__chart-box">
                                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Network Latency (ms)</h4>
                                                <div className="drawer__chart-canvas" style={{ height: '140px' }}>
                                                    <Line
                                                        data={{
                                                            labels,
                                                            datasets: [makeDataset('Latency (ms)', 'network_latency', '#E74C3C')],
                                                        }}
                                                        options={latencyOptions}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    )}

                    {/* Alerts Tab */}
                    {activeTab === 'alerts' && (
                        <div className="drawer-tab-pane">
                            <h3 className="drawer__section-title">Incidents History</h3>
                            {alertsLoading ? (
                                <div className="drawer__chart-placeholder">Loading incidents...</div>
                            ) : cameraAlerts.length === 0 ? (
                                <div className="drawer-alerts-empty" style={{ textAlign: 'center', padding: '30px 16px' }}>
                                    <Check size={32} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>All checks passing. No incidents recorded.</p>
                                </div>
                            ) : (
                                <div className="drawer-alerts-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {cameraAlerts.map(alert => (
                                        <div key={alert.id} className={`drawer-alert-item drawer-alert-item--${alert.severity} ${alert.resolved ? 'resolved' : ''}`} style={{
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            background: 'var(--color-surface-raised)'
                                        }}>
                                            <div className="drawer-alert-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span className={`alert-severity alert-severity--${alert.severity}`} style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: alert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)',
                                                    color: 'white'
                                                }}>
                                                    {alert.severity.toUpperCase()}
                                                </span>
                                                <span className="drawer-alert-time" style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{formatDateTime(alert.created_at)}</span>
                                            </div>
                                            <p className="drawer-alert-msg" style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 600 }}>{alert.message}</p>
                                            <div className="drawer-alert-status" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                                                <span>Type: {alert.alert_type.replace(/_/g, ' ')}</span>
                                                <span style={{
                                                    color: alert.resolved ? 'var(--color-success)' : 'var(--color-critical)',
                                                    fontWeight: 700
                                                }}>
                                                    {alert.resolved ? 'Resolved' : 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}

export default React.memo(CameraDrawer);
