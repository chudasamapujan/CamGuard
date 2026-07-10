/**
 * MetricChart Component
 * ----------------------
 * Line chart for historical camera metrics using Chart.js.
 * Shows CPU, Memory, and Storage over time.
 * Responsive, with gradient fills and smooth curves.
 */

import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchCameraHistory, fetchDashboardHistory } from '../services/api';
import { Activity } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function MetricChart({ cameraId, cameraName }) {
    const [history, setHistory] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState('resources'); // resources, latency, health

    useEffect(() => {
        const load = async () => {
            try {
                const res = cameraId
                    ? await fetchCameraHistory(cameraId, 1)
                    : await fetchDashboardHistory(1);
                
                if (cameraId) {
                    setHistory(res.data);
                } else {
                    setHistory({
                        camera_id: 'FLEET',
                        records: res.data
                    });
                }
            } catch (err) {
                console.error('Failed to load history:', err);
            }
        };

        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, [cameraId]);

    if (!history || !history.records || history.records.length === 0) {
        return (
            <div className="metric-chart-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--color-text-secondary)' }}>
                <Activity size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No historical telemetry logs found for this timeframe.</p>
            </div>
        );
    }

    const labels = history.records.map((r) => {
        const d = new Date(r.timestamp);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });

    const getDatasets = () => {
        if (selectedMetric === 'latency') {
            return [
                {
                    label: 'Latency (ms)',
                    data: history.records.map((r) => r.network_latency),
                    borderColor: '#FF7675',
                    backgroundColor: 'rgba(255,118,117,0.1)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 1.5,
                    pointHoverRadius: 4,
                }
            ];
        }
        if (selectedMetric === 'health') {
            return [
                {
                    label: 'Health Score %',
                    data: history.records.map((r) => {
                        if (cameraId) {
                            if (!r.is_online) return 0;
                            let score = 100;
                            if (r.cpu_usage > 75) score -= (r.cpu_usage - 75) * 0.5;
                            if (r.memory_usage > 75) score -= (r.memory_usage - 75) * 0.5;
                            if (r.storage_usage > 85) score -= (r.storage_usage - 85) * 0.5;
                            if (r.network_latency > 200) score -= (r.network_latency - 200) * 0.1;
                            if (r.fault_type) score -= 40;
                            return Math.max(0, Math.round(score));
                        }
                        return r.health_score ?? 100;
                    }),
                    borderColor: '#2ECC71',
                    backgroundColor: 'rgba(46,204,113,0.1)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 1.5,
                    pointHoverRadius: 4,
                }
            ];
        }
        return [
            {
                label: 'CPU %',
                data: history.records.map((r) => r.cpu_usage),
                borderColor: '#00D4FF',
                backgroundColor: 'rgba(0,212,255,0.08)',
                fill: true,
                tension: 0.35,
                pointRadius: 1.5,
                pointHoverRadius: 4,
            },
            {
                label: 'Memory %',
                data: history.records.map((r) => r.memory_usage),
                borderColor: '#6C5CE7',
                backgroundColor: 'rgba(108,92,231,0.08)',
                fill: true,
                tension: 0.35,
                pointRadius: 1.5,
                pointHoverRadius: 4,
            },
            {
                label: 'Storage %',
                data: history.records.map((r) => r.storage_usage),
                borderColor: '#FFB800',
                backgroundColor: 'rgba(255,184,0,0.08)',
                fill: true,
                tension: 0.35,
                pointRadius: 1.5,
                pointHoverRadius: 4,
            },
        ];
    };

    const chartData = {
        labels,
        datasets: getDatasets(),
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#B2BEC3',
                    usePointStyle: true,
                    padding: 20,
                    font: { family: "'Inter', sans-serif", size: 11 },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#FFFFFF',
                bodyColor: '#94A3B8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                titleFont: { family: "'Inter', sans-serif" },
                bodyFont: { family: "'Inter', sans-serif" },
            },
        },
        scales: {
            x: {
                ticks: { color: '#636E72', maxTicksLimit: 8, font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
            y: {
                min: 0,
                max: selectedMetric === 'latency' ? undefined : 100,
                ticks: { color: '#636E72', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.04)' },
            },
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
    };

    return (
        <div className="metric-chart">
            <div className="metric-chart-header">
                <h3 className="metric-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} />
                    {cameraId ? `Camera ${cameraName || cameraId} Metrics` : 'Performance Overview'}
                </h3>
                <div className="metric-chart-tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={selectedMetric === 'resources'}
                        className={`metric-chart-tab ${selectedMetric === 'resources' ? 'metric-chart-tab--active' : ''}`}
                        onClick={() => setSelectedMetric('resources')}
                    >
                        Resources
                    </button>
                    <button
                        role="tab"
                        aria-selected={selectedMetric === 'latency'}
                        className={`metric-chart-tab ${selectedMetric === 'latency' ? 'metric-chart-tab--active' : ''}`}
                        onClick={() => setSelectedMetric('latency')}
                    >
                        Latency
                    </button>
                    <button
                        role="tab"
                        aria-selected={selectedMetric === 'health'}
                        className={`metric-chart-tab ${selectedMetric === 'health' ? 'metric-chart-tab--active' : ''}`}
                        onClick={() => setSelectedMetric('health')}
                    >
                        Health
                    </button>
                </div>
            </div>
            <div className="metric-chart-container">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}
