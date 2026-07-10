import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SummaryCards from '../components/SummaryCards';
import CameraGrid from '../components/CameraGrid';
import CameraDrawer from '../components/CameraDrawer';
import AlertCenter from '../components/AlertCenter';
import MetricChart from '../components/MetricChart';
import EmptyState from '../components/EmptyState';
import { toggleCamera, updateCamera } from '../services/api';
import { computeHealthScore } from '../utils/helpers';
import { X, AlertTriangle, TrendingUp, MapPin } from 'lucide-react';

function Dashboard({
    cameras,
    summary,
    alerts,
    loading,
    onRefresh,
    activeTab: initialTab = 'overview',
    setActivePage,
    addToast
}) {
    const [localTab, setLocalTab] = useState(initialTab);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [editingCamera, setEditingCamera] = useState(null);
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state tab with prop tab changes from App.jsx routing
    useEffect(() => {
        setLocalTab(initialTab);
    }, [initialTab]);

    const activeAlerts = useMemo(() => {
        return alerts ? alerts.filter(a => !a.resolved) : [];
    }, [alerts]);

    const criticalAlerts = useMemo(() => {
        return activeAlerts.filter(a => a.severity === 'critical');
    }, [activeAlerts]);

    const topCameras = useMemo(() => {
        if (!cameras) return [];
        return [...cameras]
            .filter(c => c.is_enabled && c.status !== 'offline')
            .map(c => ({
                ...c,
                score: computeHealthScore(c.latest_health)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
    }, [cameras]);

    const handleCameraClick = useCallback((camera) => {
        setSelectedCamera(camera);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setSelectedCamera(null);
    }, []);

    const handleToggleCamera = useCallback(async (camera) => {
        try {
            const nextState = !camera.is_enabled;
            await toggleCamera(camera.id, nextState);
            if (addToast) addToast(`Camera ${camera.id} is now ${nextState ? 'enabled' : 'disabled'}`, 'success');
            if (onRefresh) onRefresh();
        } catch (err) {
            if (addToast) addToast('Failed to toggle camera state', 'error');
        }
    }, [onRefresh, addToast]);

    const handleOpenEdit = useCallback((camera) => {
        setEditingCamera(camera);
        setFormError('');
    }, []);

    const handleSaveQuickEdit = async (e) => {
        e.preventDefault();
        if (!editingCamera) return;
        setFormError('');
        setIsSaving(true);
        try {
            await updateCamera(editingCamera.id, {
                name: editingCamera.name,
                location: editingCamera.location
            });
            if (addToast) addToast('Camera settings updated successfully', 'success');
            setEditingCamera(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            setFormError('Failed to update camera details');
            if (addToast) addToast('Failed to update camera details', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // If no cameras exist and finished loading, show onboarding empty state
    if (!loading && (!cameras || cameras.length === 0)) {
        return (
            <div className="dashboard">
                <EmptyState
                    type="setup"
                    onAction={() => setActivePage && setActivePage('management')}
                    actionLabel="Register Your First Camera"
                />
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* KPI Summary Cards */}
            <SummaryCards summary={summary} loading={loading} />

            {/* Tab navigation */}
            <div className="dashboard__tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="tab-group" role="tablist">
                    <button
                        role="tab"
                        aria-selected={localTab === 'overview'}
                        className={`tab ${localTab === 'overview' ? 'tab--active' : ''}`}
                        onClick={() => { setLocalTab('overview'); if (setActivePage) setActivePage('dashboard'); }}
                    >
                        Performance Overview
                    </button>
                    <button
                        role="tab"
                        aria-selected={localTab === 'cameras'}
                        className={`tab ${localTab === 'cameras' ? 'tab--active' : ''}`}
                        onClick={() => { setLocalTab('cameras'); if (setActivePage) setActivePage('cameras'); }}
                    >
                        Camera Fleet
                        {cameras && <span className="tab__badge">{cameras.length}</span>}
                    </button>
                    <button
                        role="tab"
                        aria-selected={localTab === 'alerts'}
                        className={`tab ${localTab === 'alerts' ? 'tab--active' : ''}`}
                        onClick={() => { setLocalTab('alerts'); if (setActivePage) setActivePage('alerts'); }}
                    >
                        Alert Center
                        {activeAlerts.length > 0 && (
                            <span className="tab__badge tab__badge--alert">{activeAlerts.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="dashboard__content" role="tabpanel">
                {localTab === 'overview' && (
                    <div className="overview-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Fleet performance line trend charts */}
                        <div className="overview-charts-row">
                            <MetricChart />
                        </div>

                        {/* Overview layout grid: Recent Alerts, Top Performing Cameras, System Activity */}
                        <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                            {/* Panel 1: Recent Critical Alerts */}
                            <div className="overview-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px' }}>
                                <div className="overview-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                                    <AlertTriangle size={18} style={{ color: 'var(--color-critical)' }} />
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>Active Critical Alerts</h4>
                                </div>
                                {criticalAlerts.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>All cameras reporting healthy. No active critical alerts.</p>
                                    </div>
                                ) : (
                                    <div className="alerts-critical-feed" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {criticalAlerts.slice(0, 4).map(alert => (
                                            <div key={alert.id} className="alert-critical-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem' }}>
                                                <span className="alert-critical-badge" style={{ background: 'var(--color-critical)', color: 'white', fontWeight: 700, fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px' }}>CRITICAL</span>
                                                <span className="alert-critical-cam" style={{ fontWeight: 600, color: 'var(--color-text)' }}>{alert.camera_id}</span>
                                                <span className="alert-critical-msg" style={{ flex: 1, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Panel 2: Top Performing Cameras */}
                            <div className="overview-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px' }}>
                                <div className="overview-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                                    <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>Top Performing Cameras</h4>
                                </div>
                                {topCameras.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No telemetry data available.</p>
                                    </div>
                                ) : (
                                    <div className="top-cameras-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {topCameras.map(cam => {
                                            const score = cam.score;
                                            const color = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-critical)';
                                            return (
                                                <div key={cam.id} className="top-camera-item" style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '10px', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem', gap: '12px' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--color-text)', width: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.name || cam.id}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)', fontSize: '0.75rem', flex: 1 }}>
                                                        <MapPin size={11} /> {cam.location || 'Unknown'}
                                                    </span>
                                                    <span style={{ fontWeight: 700, color: color }}>{score}% Health</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {localTab === 'cameras' && (
                    <CameraGrid
                        cameras={cameras}
                        loading={loading}
                        onCameraClick={handleCameraClick}
                        onToggle={handleToggleCamera}
                        onEdit={handleOpenEdit}
                        onAddCamera={() => setActivePage && setActivePage('management')}
                    />
                )}

                {localTab === 'alerts' && (
                    <AlertCenter
                        alerts={alerts}
                        loading={loading}
                        onAlertResolved={onRefresh}
                        addToast={addToast}
                    />
                )}
            </div>

            {/* Camera Detail Drawer */}
            {selectedCamera && (
                <CameraDrawer
                    camera={selectedCamera}
                    onClose={handleCloseDrawer}
                    onCameraChange={onRefresh}
                    addToast={addToast}
                />
            )}

            {/* Shared Quick Edit Modal Dialog */}
            {editingCamera && (
                <div className="modal-overlay" onClick={() => setEditingCamera(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
                        <div className="modal-header">
                            <h3 id="edit-modal-title">Quick Edit Settings: {editingCamera.id}</h3>
                            <button className="modal-close" onClick={() => setEditingCamera(null)} aria-label="Close edit dialog">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveQuickEdit} className="modal-form">
                            {formError && (
                                <div className="form-error-banner" role="alert">
                                    {formError}
                                </div>
                            )}
                            <div className="form-group">
                                <label htmlFor="quick-name">Camera Name *</label>
                                <input
                                    id="quick-name"
                                    type="text"
                                    className="form-control"
                                    value={editingCamera.name || ''}
                                    onChange={(e) => setEditingCamera({ ...editingCamera, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="quick-loc">Deployment Location</label>
                                <input
                                    id="quick-loc"
                                    type="text"
                                    className="form-control"
                                    value={editingCamera.location || ''}
                                    onChange={(e) => setEditingCamera({ ...editingCamera, location: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn--secondary" onClick={() => setEditingCamera(null)} disabled={isSaving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn--primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(Dashboard);
