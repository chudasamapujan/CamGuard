import React, { useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { fetchCameras, fetchDashboardSummary, fetchAlerts } from '../services/api';
import SummaryCards from '../components/SummaryCards';
import CameraGrid from '../components/CameraGrid';
import CameraDrawer from '../components/CameraDrawer';
import AlertCenter from '../components/AlertCenter';
import { RefreshCw } from 'lucide-react';

function Dashboard({ addToast }) {
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [activeTab, setActiveTab] = useState('cameras');

    const { data: cameras, loading: camerasLoading, error: camerasError, refresh: refreshCameras } =
        usePolling(fetchCameras, 5000);
    const { data: summary, loading: summaryLoading, refresh: refreshSummary } =
        usePolling(fetchDashboardSummary, 5000);
    const { data: alerts, loading: alertsLoading, refresh: refreshAlerts } =
        usePolling(() => fetchAlerts(false, 100), 5000);

    const handleCameraClick = useCallback((camera) => {
        setSelectedCamera(camera);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setSelectedCamera(null);
    }, []);

    const handleAlertResolved = useCallback(() => {
        refreshAlerts();
        refreshSummary();
        refreshCameras();
        if (addToast) addToast('Alert resolved successfully', 'success');
    }, [refreshAlerts, refreshSummary, refreshCameras, addToast]);

    const handleRefreshAll = useCallback(() => {
        refreshCameras();
        refreshSummary();
        refreshAlerts();
        if (addToast) addToast('Dashboard refreshed', 'info');
    }, [refreshCameras, refreshSummary, refreshAlerts, addToast]);

    return (
        <div className="dashboard">
            {/* KPI Row */}
            <SummaryCards summary={summary} cameras={cameras} loading={summaryLoading && camerasLoading} />

            {/* Tab navigation */}
            <div className="dashboard__tabs">
                <div className="tab-group" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === 'cameras'}
                        className={`tab ${activeTab === 'cameras' ? 'tab--active' : ''}`}
                        onClick={() => setActiveTab('cameras')}
                    >
                        Camera Fleet
                        {cameras && <span className="tab__badge">{cameras.length}</span>}
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'alerts'}
                        className={`tab ${activeTab === 'alerts' ? 'tab--active' : ''}`}
                        onClick={() => setActiveTab('alerts')}
                    >
                        Alert Center
                        {alerts && (
                            <span className="tab__badge tab__badge--alert">
                                {alerts.filter(a => !a.resolved).length}
                            </span>
                        )}
                    </button>
                </div>

                <button
                    className="btn btn--ghost btn--sm"
                    onClick={handleRefreshAll}
                    title="Refresh all data"
                    aria-label="Refresh all data"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Connection error */}
            {camerasError && (
                <div className="dashboard__error" role="alert">
                    <span>⚠ Unable to connect to the API. Check that the Flask backend is running.</span>
                    <button className="btn btn--sm btn--ghost" onClick={handleRefreshAll}>Retry</button>
                </div>
            )}

            {/* Tab content */}
            <div className="dashboard__content" role="tabpanel">
                {activeTab === 'cameras' && (
                    <CameraGrid
                        cameras={cameras}
                        loading={camerasLoading}
                        onCameraClick={handleCameraClick}
                    />
                )}
                {activeTab === 'alerts' && (
                    <AlertCenter
                        alerts={alerts}
                        loading={alertsLoading}
                        onAlertResolved={handleAlertResolved}
                    />
                )}
            </div>

            {/* Camera Detail Drawer */}
            {selectedCamera && (
                <CameraDrawer
                    camera={selectedCamera}
                    onClose={handleCloseDrawer}
                />
            )}
        </div>
    );
}

export default React.memo(Dashboard);
