import React, { useEffect, useState, useCallback } from 'react';
import {
    X, MapPin, Clock, Cpu, MemoryStick, HardDrive, Globe,
    Activity, Zap, Download, Heart,
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchCameraHistory } from '../services/api';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { computeHealthScore, healthScoreColor, formatTime, formatRelativeTime, exportToCSV } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function CameraDrawer({ camera, onClose }) {
    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [chartHours, setChartHours] = useState(1);

    const loadHistory = useCallback(async () => {
        if (!camera) return;
        setHistoryLoading(true);
        try {
            const res = await fetchCameraHistory(camera.id, chartHours);
            setHistory(res.data);
        } catch { /* ignore */ }
        setHistoryLoading(false);
    }, [camera, chartHours]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    // Escape key closes drawer
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!camera) return null;

    const health = camera.latest_health;
    const score = computeHealthScore(health);
    const scoreColor = healthScoreColor(score);
    const isOnline = health?.is_online;

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
                position: 'bottom',
                labels: {
                    color: 'var(--color-text-secondary)',
                    usePointStyle: true,
                    padding: 16,
                    font: { family: "'Inter', sans-serif", size: 11 },
                },
            },
            tooltip: {
                backgroundColor: 'var(--color-surface)',
                titleColor: 'var(--color-text)',
                bodyColor: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                titleFont: { family: "'Inter', sans-serif", weight: '600' },
                bodyFont: { family: "'Inter', sans-serif" },
            },
        },
        scales: {
            x: {
                ticks: { color: 'var(--color-text-muted)', maxTicksLimit: 8, font: { size: 10 } },
                grid: { color: 'var(--color-border)' },
            },
            y: {
                min: 0, max: 100,
                ticks: { color: 'var(--color-text-muted)', font: { size: 10 } },
                grid: { color: 'var(--color-border)' },
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
                        <h2 className="drawer__title">{camera.name}</h2>
                        <p className="drawer__id">{camera.id}</p>
                    </div>
                    <button className="drawer__close" onClick={onClose} aria-label="Close details panel">
                        <X size={20} />
                    </button>
                </div>

                <div className="drawer__body">
                    {/* General info */}
                    <section className="drawer__section">
                        <h3 className="drawer__section-title">General Information</h3>
                        <div className="drawer__info-grid">
                            <div className="drawer__info-item">
                                <span className="drawer__info-label"><MapPin size={14} /> Location</span>
                                <span className="drawer__info-value">{camera.location}</span>
                            </div>
                            <div className="drawer__info-item">
                                <span className="drawer__info-label"><Activity size={14} /> Status</span>
                                <StatusBadge status={camera.status} />
                            </div>
                            <div className="drawer__info-item">
                                <span className="drawer__info-label"><Heart size={14} /> Health Score</span>
                                <span className="drawer__info-value" style={{ color: scoreColor, fontWeight: 700, fontSize: '1.25rem' }}>
                                    {score}/100
                                </span>
                            </div>
                            <div className="drawer__info-item">
                                <span className="drawer__info-label"><Clock size={14} /> Last Heartbeat</span>
                                <span className="drawer__info-value">{formatRelativeTime(camera.last_heartbeat)}</span>
                            </div>
                        </div>
                    </section>

                    {/* Current Metrics */}
                    {isOnline && health && (
                        <section className="drawer__section">
                            <h3 className="drawer__section-title">Current Metrics</h3>
                            <div className="drawer__metrics">
                                {[
                                    { label: 'CPU', value: health.cpu_usage, icon: Cpu, warn: 75, crit: 90 },
                                    { label: 'Memory', value: health.memory_usage, icon: MemoryStick, warn: 75, crit: 90 },
                                    { label: 'Storage', value: health.storage_usage, icon: HardDrive, warn: 80, crit: 95 },
                                ].map(m => {
                                    const color = m.value >= m.crit ? 'var(--color-critical)' : m.value >= m.warn ? 'var(--color-warning)' : 'var(--color-success)';
                                    return (
                                        <div key={m.label} className="drawer__metric-row">
                                            <div className="drawer__metric-label"><m.icon size={14} /> {m.label}</div>
                                            <div className="drawer__metric-bar-wrapper">
                                                <div className="progress__track" style={{ flex: 1 }}>
                                                    <div className="progress__fill" style={{ width: `${m.value}%`, backgroundColor: color }} />
                                                </div>
                                                <span className="drawer__metric-val" style={{ color }}>{m.value.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="drawer__metric-row">
                                    <div className="drawer__metric-label"><Globe size={14} /> Latency</div>
                                    <span className="drawer__metric-val" style={{
                                        color: health.network_latency > 500 ? 'var(--color-critical)' : health.network_latency > 200 ? 'var(--color-warning)' : 'var(--color-success)'
                                    }}>
                                        {health.network_latency.toFixed(0)} ms
                                    </span>
                                </div>
                                {health.fault_type && (
                                    <div className="drawer__fault">
                                        <Zap size={14} /> {health.fault_type}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Charts */}
                    <section className="drawer__section">
                        <div className="drawer__section-header">
                            <h3 className="drawer__section-title">Performance History</h3>
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
                            <div className="drawer__chart-placeholder">Loading chart data...</div>
                        ) : records.length === 0 ? (
                            <EmptyState type="history" />
                        ) : (
                            <div className="drawer__charts">
                                <div className="drawer__chart-box">
                                    <h4>CPU / Memory / Storage</h4>
                                    <div className="drawer__chart-canvas">
                                        <Line
                                            data={{
                                                labels,
                                                datasets: [
                                                    makeDataset('CPU', 'cpu_usage', '#2563EB'),
                                                    makeDataset('Memory', 'memory_usage', '#7C3AED'),
                                                    makeDataset('Storage', 'storage_usage', '#F59E0B'),
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
                                                datasets: [makeDataset('Latency (ms)', 'network_latency', '#DC2626')],
                                            }}
                                            options={latencyOptions}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Recent Heartbeats */}
                    {records.length > 0 && (
                        <section className="drawer__section">
                            <h3 className="drawer__section-title">Recent Heartbeats</h3>
                            <div className="drawer__heartbeats">
                                {records.slice(-8).reverse().map((r, i) => (
                                    <div key={r.id || i} className="drawer__heartbeat-row">
                                        <span className="drawer__hb-time">{formatTime(r.timestamp)}</span>
                                        <span className={`drawer__hb-dot ${r.is_online ? 'drawer__hb-dot--on' : 'drawer__hb-dot--off'}`} />
                                        <span className="drawer__hb-cpu">CPU {r.cpu_usage.toFixed(1)}%</span>
                                        <span className="drawer__hb-mem">MEM {r.memory_usage.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </aside>
        </>
    );
}

export default React.memo(CameraDrawer);
