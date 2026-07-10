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
import { fetchCameraHistory } from '../services/api';

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

    useEffect(() => {
        if (!cameraId) return;

        const load = async () => {
            try {
                const res = await fetchCameraHistory(cameraId, 1);
                setHistory(res.data);
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
            <div className="metric-chart-empty">
                <p>📊 No historical data available yet</p>
            </div>
        );
    }

    const labels = history.records.map((r) => {
        const d = new Date(r.timestamp);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });

    const chartData = {
        labels,
        datasets: [
            {
                label: 'CPU %',
                data: history.records.map((r) => r.cpu_usage),
                borderColor: '#00D4FF',
                backgroundColor: 'rgba(0,212,255,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
            {
                label: 'Memory %',
                data: history.records.map((r) => r.memory_usage),
                borderColor: '#6C5CE7',
                backgroundColor: 'rgba(108,92,231,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
            {
                label: 'Storage %',
                data: history.records.map((r) => r.storage_usage),
                borderColor: '#FFB800',
                backgroundColor: 'rgba(255,184,0,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
        ],
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
                    font: { family: "'Inter', sans-serif", size: 12 },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(20,20,40,0.95)',
                titleFont: { family: "'Inter', sans-serif" },
                bodyFont: { family: "'Inter', sans-serif" },
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                ticks: { color: '#636E72', maxTicksLimit: 10, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.05)' },
            },
            y: {
                min: 0,
                max: 100,
                ticks: { color: '#636E72', font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.05)' },
            },
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
    };

    return (
        <div className="metric-chart">
            <h3 className="metric-chart-title">
                📊 {cameraName || cameraId} — Performance History (1h)
            </h3>
            <div className="metric-chart-container">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}
