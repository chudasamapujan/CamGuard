import React, { useState, useCallback } from 'react';
import SummaryCards from '../components/SummaryCards';
import CameraGrid from '../components/CameraGrid';
import CameraDrawer from '../components/CameraDrawer';
import AlertCenter from '../components/AlertCenter';
import AlertBanner from '../components/AlertBanner';
import MetricChart from '../components/MetricChart';

function Dashboard({
    cameras,
    summary,
    alerts,
    loading,
    onRefresh,
    addToast
}) {
    const [selectedCamera, setSelectedCamera] = useState(null);

    const handleCameraClick = useCallback((camera) => {
        setSelectedCamera(camera);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setSelectedCamera(null);
    }, []);

    return (
        <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
            <AlertBanner alerts={alerts} onAlertResolved={onRefresh} addToast={addToast} />
            
            {/* Section 1: KPI Top Summary Cards */}
            <div className="dashboard-section">
                <SummaryCards summary={summary} loading={loading} />
            </div>

            {/* Section 2: Responsive Camera Grid */}
            <div className="dashboard-section" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Camera Fleet Status</h3>
                </div>
                <CameraGrid
                    cameras={cameras}
                    loading={loading}
                    onCameraClick={handleCameraClick}
                />
            </div>

            {/* Section 3: Historical Charts */}
            <div className="dashboard-section" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', minHeight: '300px' }}>
                <MetricChart />
            </div>

            {/* Section 4: Recent Alerts Table */}
            <div className="dashboard-section">
                <AlertCenter
                    alerts={alerts}
                    loading={loading}
                    onAlertResolved={onRefresh}
                    addToast={addToast}
                />
            </div>

            {/* Camera Detail Drawer Overlay */}
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
