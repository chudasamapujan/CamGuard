import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SettingsPanel from './components/SettingsPanel';
import ToastContainer from './components/Toast';
import { fetchCameras, fetchDashboardSummary, fetchAlerts } from './services/api';
import './App.css';

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [cameras, setCameras] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [apiStatus, setApiStatus] = useState('online');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { toasts, addToast, removeToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [camRes, sumRes, alertRes] = await Promise.all([
        fetchCameras(),
        fetchDashboardSummary(),
        fetchAlerts(false, 100)
      ]);
      setCameras(camRes.data);
      setSummary(sumRes.data);
      setAlerts(alertRes.data);
      setApiStatus('online');
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Data fetch error:', err);
      setApiStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll data every 5 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData();
    addToast('Dashboard data refreshed', 'info');
  }, [loadData, addToast]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            cameras={cameras}
            summary={summary}
            alerts={alerts}
            loading={loading}
            onRefresh={loadData}
            addToast={addToast}
          />
        );
      case 'settings':
        return (
          <SettingsPanel
            addToast={addToast}
          />
        );
      default:
        return (
          <Dashboard
            cameras={cameras}
            summary={summary}
            alerts={alerts}
            loading={loading}
            onRefresh={loadData}
            addToast={addToast}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <div className="app-main-layout">
        <Header
          apiStatus={apiStatus}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
        />
        <main className="app-main-content">
          {renderPage()}
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
