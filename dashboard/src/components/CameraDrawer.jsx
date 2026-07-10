import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    X, MapPin, Clock, Cpu, MemoryStick, HardDrive, Globe,
    Activity, Zap, Download, Heart, AlertTriangle, Settings,
    Check, VideoOff
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchCameraHistory, updateCamera, toggleCamera, fetchAlerts } from '../services/api';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { computeHealthScore, healthScoreColor, formatTime, formatRelativeTime, exportToCSV, formatDateTime } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function CameraDrawer({ camera, onClose, onCameraChange, addToast }) {
    const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'alerts', 'config'
    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [chartHours, setChartHours] = useState(1);
    const [cameraAlerts, setCameraAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);

    // Editing State inside Config Tab
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        storage_capacity: 100,
        reporting_interval: 30,
        fault_probability: 0.05,
        offline_probability: 0.03,
        notes: ''
    });

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

    // Reset form when camera updates
    useEffect(() => {
        if (camera) {
            setFormData({
                name: camera.name || '',
                location: camera.location || '',
                storage_capacity: camera.storage_capacity || 100,
                reporting_interval: camera.reporting_interval || 30,
                fault_probability: camera.fault_probability || 0.05,
                offline_probability: camera.offline_probability || 0.03,
                notes: camera.notes || ''
            });
        }
    }, [camera]);

    // Escape key closes drawer
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!camera) return null;

    const health = camera.latest_health;
    const score = camera.is_enabled ? computeHealthScore(health) : 0;
    const scoreColor = camera.is_enabled ? healthScoreColor(score) : 'var(--color-text-muted)';
    const isOnline = health?.is_online && camera.is_enabled;

    // Chart config
    const records = history?.records || [];
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

    const handleToggleState = async () => {
        try {
            await toggleCamera(camera.id, !camera.is_enabled);
            if (addToast) addToast(`Camera ${camera.id} ${!camera.is_enabled ? 'enabled' : 'disabled'}`, 'success');
            if (onCameraChange) onCameraChange();
        } catch (err) {
            if (addToast) addToast('Failed to toggle camera state', 'error');
        }
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        try {
            await updateCamera(camera.id, formData);
            if (addToast) addToast('Camera configuration successfully saved', 'success');
            setIsEditing(false);
            if (onCameraChange) onCameraChange();
        } catch (err) {
            if (addToast) addToast('Failed to save configuration', 'error');
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

                {/* Drawer Tab Buttons */}
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
                        <AlertTriangle size={14} /> Alert History ({cameraAlerts.length})
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'config'}
                        className={`drawer__tab ${activeTab === 'config' ? 'drawer__tab--active' : ''}`}
                        onClick={() => setActiveTab('config')}
                    >
                        <Settings size={14} /> Hardware Config
                    </button>
                </div>

                <div className="drawer__body">
                    
                    {/* TAB: METRICS & STATUS */}
                    {activeTab === 'metrics' && (
                        <div className="drawer-tab-pane">
                            {/* Summary strip */}
                            <div className="drawer__info-grid">
                                <div className="drawer__info-item">
                                    <span className="drawer__info-label"><MapPin size={13} /> Location</span>
                                    <span className="drawer__info-value">{camera.location || 'Unknown'}</span>
                                </div>
                                <div className="drawer__info-item">
                                    <span className="drawer__info-label"><Heart size={13} /> Health Score</span>
                                    <span className="drawer__info-value font-mono font-bold" style={{ color: scoreColor, fontSize: '1.1rem' }}>
                                        {score}%
                                    </span>
                                </div>
                                <div className="drawer__info-item">
                                    <span className="drawer__info-label"><Clock size={13} /> Last Heartbeat</span>
                                    <span className="drawer__info-value">{formatRelativeTime(camera.last_heartbeat)}</span>
                                </div>
                            </div>

                            {/* Current Telemetry Progress Bars */}
                            {isOnline && health ? (
                                <section className="drawer__section">
                                    <h3 className="drawer__section-title">Current Telemetry</h3>
                                    <div className="drawer__metrics">
                                        {[
                                            { label: 'CPU', value: health.cpu_usage, icon: Cpu, warn: 75, crit: 90 },
                                            { label: 'Memory', value: health.memory_usage, icon: MemoryStick, warn: 75, crit: 90 },
                                            { label: 'Storage', value: health.storage_usage, icon: HardDrive, warn: 80, crit: 95 },
                                        ].map(m => {
                                            const color = m.value >= m.crit ? '#E74C3C' : m.value >= m.warn ? '#FFB800' : '#2ECC71';
                                            return (
                                                <div key={m.label} className="drawer__metric-row">
                                                    <div className="drawer__metric-label"><m.icon size={13} /> {m.label}</div>
                                                    <div className="drawer__metric-bar-wrapper">
                                                        <div className="progress__track" style={{ flex: 1 }}>
                                                            <div className="progress__fill" style={{ width: `${m.value}%`, backgroundColor: color }} />
                                                        </div>
                                                        <span className="drawer__metric-val font-mono" style={{ color }}>{m.value.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="drawer__metric-row">
                                            <div className="drawer__metric-label"><Globe size={13} /> Network Latency</div>
                                            <span className="drawer__metric-val font-mono font-bold" style={{
                                                color: health.network_latency > 500 ? '#E74C3C' : health.network_latency > 200 ? '#FFB800' : '#2ECC71'
                                            }}>
                                                {health.network_latency.toFixed(0)} ms
                                            </span>
                                        </div>
                                        {health.fault_type && (
                                            <div className="drawer__fault">
                                                <Zap size={14} /> Device Fault Detected: <strong>{health.fault_type}</strong>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            ) : (
                                <div className="drawer__offline-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <VideoOff size={14} />
                                    <span>Telemetry feed offline. Enable camera or start simulator to see metric updates.</span>
                                </div>
                            )}

                            {/* Line Charts */}
                            {isOnline && (
                                <section className="drawer__section">
                                    <div className="drawer__section-header">
                                        <h3 className="drawer__section-title">Performance Trend</h3>
                                        <div className="drawer__chart-controls">
                                            {[1, 6, 24].map(h => (
                                                <button
                                                    key={h}
                                                    className={`btn btn--sm ${chartHours === h ? 'btn--active' : 'btn--ghost'}`}
                                                    onClick={() => setChartHours(h)}
                                                >
                                                    {h}h
                                                </button>
                                            ))}
                                            <button className="btn btn--sm btn--ghost" onClick={handleExport} title="Export CSV" aria-label="Export history to CSV">
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {historyLoading ? (
                                        <div className="drawer__chart-placeholder">Loading charts...</div>
                                    ) : records.length === 0 ? (
                                        <EmptyState type="history" />
                                    ) : (
                                        <div className="drawer__charts">
                                            <div className="drawer__chart-box">
                                                <h4>Resources (CPU / Memory / Storage)</h4>
                                                <div className="drawer__chart-canvas">
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
                                                <h4>Network Latency</h4>
                                                <div className="drawer__chart-canvas">
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

                            {/* Recent Heartbeat table */}
                            {records.length > 0 && (
                                <section className="drawer__section">
                                    <h3 className="drawer__section-title">Telemetry Packets (Last 5)</h3>
                                    <div className="drawer__heartbeats">
                                        {records.slice(-5).reverse().map((r, i) => (
                                            <div key={r.id || i} className="drawer__heartbeat-row">
                                                <span className="drawer__hb-time font-mono">{formatTime(r.timestamp)}</span>
                                                <span className={`drawer__hb-dot ${r.is_online ? 'drawer__hb-dot--on' : 'drawer__hb-dot--off'}`} />
                                                <span className="drawer__hb-cpu font-mono text-muted">CPU {r.cpu_usage.toFixed(1)}%</span>
                                                <span className="drawer__hb-mem font-mono text-muted">MEM {r.memory_usage.toFixed(1)}%</span>
                                                <span className="drawer__hb-latency font-mono text-muted">{r.network_latency.toFixed(0)}ms</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {/* TAB: ALERT HISTORY */}
                    {activeTab === 'alerts' && (
                        <div className="drawer-tab-pane">
                            <h3 className="drawer__section-title">Incident Reports</h3>
                            {alertsLoading ? (
                                <div className="drawer__chart-placeholder">Loading alerts...</div>
                            ) : cameraAlerts.length === 0 ? (
                                <div className="drawer-alerts-empty">
                                    <Check size={32} className="text-success" />
                                    <p>No alerts recorded for this camera node.</p>
                                </div>
                            ) : (
                                <div className="drawer-alerts-list">
                                    {cameraAlerts.map(alert => (
                                        <div key={alert.id} className={`drawer-alert-item drawer-alert-item--${alert.severity} ${alert.resolved ? 'resolved' : ''}`}>
                                            <div className="drawer-alert-meta">
                                                <span className={`alert-severity alert-severity--${alert.severity}`}>
                                                    {alert.severity.toUpperCase()}
                                                </span>
                                                <span className="drawer-alert-time">{formatDateTime(alert.created_at)}</span>
                                            </div>
                                            <p className="drawer-alert-msg">{alert.message}</p>
                                            <div className="drawer-alert-status">
                                                <span>Type: {alert.alert_type.replace(/_/g, ' ')}</span>
                                                <span className={alert.resolved ? 'text-success' : 'text-danger font-bold'}>
                                                    {alert.resolved ? 'Resolved' : 'Active Incident'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: HARDWARE CONFIG */}
                    {activeTab === 'config' && (
                        <div className="drawer-tab-pane">
                            <div className="drawer-config-header">
                                <h3 className="drawer__section-title">Administrative Settings</h3>
                                <button 
                                    className="btn btn--sm btn--primary" 
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? 'Cancel Edit' : 'Edit Settings'}
                                </button>
                            </div>

                            {isEditing ? (
                                <form onSubmit={handleSaveConfig} className="drawer-config-form">
                                    <div className="form-group">
                                        <label htmlFor="cfg-name">Camera Name *</label>
                                        <input
                                            id="cfg-name"
                                            type="text"
                                            className="form-control"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cfg-loc">Deployment Location</label>
                                        <input
                                            id="cfg-loc"
                                            type="text"
                                            className="form-control"
                                            value={formData.location}
                                            onChange={e => setFormData({...formData, location: e.target.value})}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cfg-storage">Storage Capacity (GB)</label>
                                        <input
                                            id="cfg-storage"
                                            type="number"
                                            className="form-control"
                                            value={formData.storage_capacity}
                                            onChange={e => setFormData({...formData, storage_capacity: parseFloat(e.target.value)})}
                                            min="1"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cfg-interval">Reporting Interval (seconds)</label>
                                        <input
                                            id="cfg-interval"
                                            type="number"
                                            className="form-control"
                                            value={formData.reporting_interval}
                                            onChange={e => setFormData({...formData, reporting_interval: parseInt(e.target.value)})}
                                            min="5"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cfg-fault">Fault Probability (0.0 - 1.0)</label>
                                        <input
                                            id="cfg-fault"
                                            type="number" step="0.01"
                                            className="form-control"
                                            value={formData.fault_probability}
                                            onChange={e => setFormData({...formData, fault_probability: parseFloat(e.target.value)})}
                                            min="0" max="1"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cfg-offline">Offline Probability (0.0 - 1.0)</label>
                                        <input
                                            id="cfg-offline"
                                            type="number" step="0.01"
                                            className="form-control"
                                            value={formData.offline_probability}
                                            onChange={e => setFormData({...formData, offline_probability: parseFloat(e.target.value)})}
                                            min="0" max="1"
                                        />
                                    </div>
                                    <div className="form-group full-width">
                                        <label htmlFor="cfg-notes">Administrative Notes</label>
                                        <textarea
                                            id="cfg-notes"
                                            className="form-control"
                                            value={formData.notes}
                                            onChange={e => setFormData({...formData, notes: e.target.value})}
                                            rows="3"
                                        />
                                    </div>
                                    <button type="submit" className="btn btn--success full-width" style={{ marginTop: '10px' }}>
                                        Save Configuration Changes
                                    </button>
                                </form>
                            ) : (
                                <div className="drawer-config-details">
                                    <div className="config-detail-row">
                                        <span>Camera ID:</span>
                                        <strong className="font-mono">{camera.id}</strong>
                                    </div>
                                    <div className="config-detail-row">
                                        <span>Camera Name:</span>
                                        <strong>{camera.name || camera.id}</strong>
                                    </div>
                                    <div className="config-detail-row">
                                        <span>Location:</span>
                                        <strong>{camera.location || 'Not Specified'}</strong>
                                    </div>
                                    <div className="config-detail-row">
                                        <span>Storage Capacity:</span>
                                        <strong>{camera.storage_capacity || 100} GB</strong>
                                    </div>
                                    <div className="config-detail-row">
                                        <span>Reporting Interval:</span>
                                        <strong>{camera.reporting_interval || 30} seconds</strong>
                                    </div>
                                    <div className="config-detail-row">
                                        <span>Fault Probability:</span>
                                        <strong>{Math.round((camera.fault_probability || 0.05) * 100)}%</strong>
                                    </div>
                                    <div className="config-detail-row">
                                        <span>Offline Probability:</span>
                                        <strong>{Math.round((camera.offline_probability || 0.03) * 100)}%</strong>
                                    </div>
                                    <div className="config-detail-row">
                                        <span>Admin Notes:</span>
                                        <p className="config-detail-notes">{camera.notes || 'No administrative notes registered.'}</p>
                                    </div>
                                    
                                    <div className="config-detail-actions">
                                        <button 
                                            className={`btn full-width ${camera.is_enabled ? 'btn--danger' : 'btn--success'}`}
                                            onClick={handleToggleState}
                                        >
                                            {camera.is_enabled ? <Power size={14} /> : <Check size={14} />}
                                            {camera.is_enabled ? 'Disable Camera Telemetry' : 'Enable Camera Telemetry'}
                                        </button>
                                    </div>
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
