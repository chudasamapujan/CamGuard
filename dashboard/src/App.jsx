import React, { useState, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import SettingsPanel from './components/SettingsPanel';
import ToastContainer from './components/Toast';
import './App.css';

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

  const handleSettingsSaved = useCallback((msg, isError) => {
    addToast(msg, isError ? 'error' : 'success');
    if (!isError) setSettingsOpen(false);
  }, [addToast]);

  return (
    <div className="app">
      <Header onOpenSettings={handleOpenSettings} />
      <main className="app__main">
        <Dashboard addToast={addToast} />
      </main>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={handleCloseSettings}
        onSaved={handleSettingsSaved}
      />

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
