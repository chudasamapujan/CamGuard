import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SettingsPanel from './components/SettingsPanel';
import AlertCenter from './components/AlertCenter';
import ToastContainer from './components/Toast';
import { fetchCameras, fetchDashboardSummary, fetchAlerts, fetchSettings } from './services/api';
import { socket } from './services/socket';
import './App.css';

export function AppContent() {
  const [cameras, setCameras] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [apiStatus, setApiStatus] = useState('offline');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { toasts, addToast, removeToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [camRes, sumRes, alertRes, setRes] = await Promise.all([
        fetchCameras(),
        fetchDashboardSummary(),
        fetchAlerts(false, 100),
        (typeof fetchSettings === 'function' ? fetchSettings() : Promise.resolve({ data: null }))
      ]);
      setCameras(camRes.data);
      setSummary(sumRes.data);
      setAlerts(alertRes.data);
      if (setRes && setRes.data) setSettings(setRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Initial data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize socket connections and baseline data
  useEffect(() => {
    // 1. Initial REST fetch for startup sync
    loadData();

    // 2. Sync socket connection status
    if (socket.connected) {
      setApiStatus('online');
    }

    const onConnect = () => {
      setApiStatus('online');
      addToast('Real-time telemetry channel established', 'success');
      loadData(); // Sync up state in case we were disconnected
    };

    const onDisconnect = () => {
      setApiStatus('offline');
      addToast('Lost real-time telemetry link', 'error');
    };

    // Live telemetry updates
    const onCameraUpdate = (data) => {
      setLastUpdated(new Date());
      setCameras(prev => {
        const exists = prev.some(c => c.id === data.id);
        if (exists) {
          return prev.map(c => c.id === data.id ? { ...c, ...data } : c);
        } else {
          return [...prev, data].sort((a, b) => a.id.localeCompare(b.id));
        }
      });
    };

    // Live aggregated summaries
    const onDashboardSummary = (data) => {
      setSummary(data);
    };

    // Live alert configurations
    const onAlertCreated = (data) => {
      setAlerts(prev => {
        const exists = prev.some(a => a.id === data.id);
        if (exists) return prev;
        return [data, ...prev].slice(0, 100);
      });
      addToast(data.message, data.severity === 'critical' ? 'error' : 'warning');
    };

    const onAlertResolved = (data) => {
      setAlerts(prev => prev.map(a => a.id === data.id ? { ...a, resolved: true, resolved_at: data.resolved_at } : a));
      addToast(`Incident resolved: ${data.message}`, 'success');
    };

    const onSettingsUpdated = (data) => {
      addToast('System configuration options dynamically reloaded', 'info');
      if (data) {
        setSettings(prev => ({ ...prev, ...data }));
      }
      if (data && data.camera_count) {
        const count = parseInt(data.camera_count, 10);
        setCameras(prev => prev.filter(c => {
          try {
            const num = parseInt(c.id.split('-')[1], 10);
            return num <= count;
          } catch (e) {
            return true;
          }
        }));
        setAlerts(prev => prev.filter(a => {
          try {
            const num = parseInt(a.camera_id.split('-')[1], 10);
            return num <= count;
          } catch (e) {
            return true;
          }
        }));
      }
    };

    const onCameraActivated = (data) => {
      setCameras(prev => {
        const exists = prev.some(c => c.id === data.id);
        if (exists) {
          return prev.map(c => c.id === data.id ? { ...c, ...data, active: true } : c);
        } else {
          return [...prev, { ...data, active: true }].sort((a, b) => a.id.localeCompare(b.id));
        }
      });
      addToast(`Camera activated: ${data.name}`, 'success');
    };

    const onCameraDeactivated = (data) => {
      setCameras(prev => prev.filter(c => c.id !== data.id));
      setAlerts(prev => prev.filter(a => a.camera_id !== data.id));
      addToast(`Camera deactivated: ${data.name}`, 'info');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('camera_update', onCameraUpdate);
    socket.on('dashboard_summary', onDashboardSummary);
    socket.on('alert_created', onAlertCreated);
    socket.on('alert_resolved', onAlertResolved);
    socket.on('settings_updated', onSettingsUpdated);
    socket.on('camera_activated', onCameraActivated);
    socket.on('camera_deactivated', onCameraDeactivated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('camera_update', onCameraUpdate);
      socket.off('dashboard_summary', onDashboardSummary);
      socket.off('alert_created', onAlertCreated);
      socket.off('alert_resolved', onAlertResolved);
      socket.off('settings_updated', onSettingsUpdated);
      socket.off('camera_activated', onCameraActivated);
      socket.off('camera_deactivated', onCameraDeactivated);
    };
  }, [loadData, addToast]);

  const handleRefresh = useCallback(() => {
    loadData();
    addToast('Dashboard data refreshed manually', 'info');
  }, [loadData, addToast]);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="app-main-layout">
        <Header
          apiStatus={apiStatus}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
        />
        <main className="app-main-content">
          <Routes>
            <Route path="/" element={
              <Dashboard
                cameras={cameras}
                summary={summary}
                alerts={alerts}
                loading={loading}
                settings={settings}
                onRefresh={loadData}
                addToast={addToast}
              />
            } />
            <Route path="/alerts" element={
              <AlertCenter
                alerts={alerts}
                onAlertResolved={loadData}
                addToast={addToast}
              />
            } />
            <Route path="/settings" element={
              <SettingsPanel
                addToast={addToast}
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
