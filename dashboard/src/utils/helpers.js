/**
 * Utility helpers for formatting, calculations, and data export.
 */

/** Calculate a 0-100 health score from camera metrics */
export function computeHealthScore(health) {
    if (!health || !health.is_online) return 0;

    const cpuScore = Math.max(0, 100 - health.cpu_usage);
    const memScore = Math.max(0, 100 - health.memory_usage);
    const stoScore = Math.max(0, 100 - health.storage_usage);
    const latScore = health.network_latency <= 50
        ? 100
        : health.network_latency <= 200
            ? 70
            : health.network_latency <= 500
                ? 40
                : 10;

    const faultPenalty = health.fault_type ? 30 : 0;
    const raw = (cpuScore * 0.3 + memScore * 0.25 + stoScore * 0.2 + latScore * 0.25) - faultPenalty;
    return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Get color class for a health score */
export function healthScoreColor(score) {
    if (score >= 80) return 'var(--color-success)';
    if (score >= 60) return 'var(--color-warning)';
    return 'var(--color-critical)';
}

/** Format ISO date string to readable time */
export function formatTime(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
}

/** Format ISO date string to date + time */
export function formatDateTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

/** Format relative time (e.g., "2m ago") */
export function formatRelativeTime(isoStr) {
    if (!isoStr) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

/** Export data to CSV and trigger download */
export function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(',')
        ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Clamp a number */
export function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
