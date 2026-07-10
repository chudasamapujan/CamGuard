import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Cpu, MemoryStick, HardDrive, Globe, Clock, Sparkles } from 'lucide-react';
import { fetchSettings, updateSettings } from '../services/api';

export default function SettingsPanel({ addToast }) {
    const [settings, setSettings] = useState(null);
    const [original, setOriginal] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await fetchSettings();
            setSettings(res.data);
            setOriginal(res.data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            if (addToast) addToast('Failed to load global configurations', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleChange = (key, val) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateSettings(settings);
            setOriginal({ ...settings });
            if (addToast) addToast('Global system configurations successfully updated', 'success');
        } catch (err) {
            if (addToast) addToast('Failed to update system configurations', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (original) {
            setSettings({ ...original });
            if (addToast) addToast('Form reset to last saved state', 'info');
        }
    };

    if (loading) {
        return (
            <div className="settings-page">
                <h2 className="page-title">Global Settings</h2>
                <div className="skeleton-grid" style={{ marginTop: '20px' }}>
                    <div className="skeleton-card" style={{ height: '250px' }}></div>
                    <div className="skeleton-card" style={{ height: '250px' }}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="management-header">
                <div>
                    <h2 className="page-title">System Configurations</h2>
                    <p className="page-subtitle">Configure thresholds and global simulator parameters stored in the database.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="settings-form">
                <div className="settings-grid">
                    
                    {/* Section: Metrics Thresholds */}
                    <div className="settings-card">
                        <div className="settings-card-header">
                            <Cpu size={18} />
                            <h3>Telemetry Alerts Thresholds</h3>
                        </div>
                        <div className="settings-card-body">
                            <p className="settings-section-desc">Warning thresholds. Critical thresholds are computed automatically at ~1.2x warning levels.</p>
                            
                            <div className="form-group">
                                <label htmlFor="set-cpu">CPU Warning Threshold (%)</label>
                                <input
                                    id="set-cpu"
                                    type="number"
                                    className="form-control"
                                    value={settings.cpu_threshold ?? 75}
                                    onChange={e => handleChange('cpu_threshold', parseFloat(e.target.value))}
                                    min="1" max="100" required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-mem">Memory Warning Threshold (%)</label>
                                <input
                                    id="set-mem"
                                    type="number"
                                    className="form-control"
                                    value={settings.memory_threshold ?? 75}
                                    onChange={e => handleChange('memory_threshold', parseFloat(e.target.value))}
                                    min="1" max="100" required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-storage">Storage Warning Threshold (%)</label>
                                <input
                                    id="set-storage"
                                    type="number"
                                    className="form-control"
                                    value={settings.storage_threshold ?? 80}
                                    onChange={e => handleChange('storage_threshold', parseFloat(e.target.value))}
                                    min="1" max="100" required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-latency">Network Latency Warning Threshold (ms)</label>
                                <input
                                    id="set-latency"
                                    type="number"
                                    className="form-control"
                                    value={settings.latency_threshold ?? 200}
                                    onChange={e => handleChange('latency_threshold', parseFloat(e.target.value))}
                                    min="1" max="5000" required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Simulator Configurations */}
                    <div className="settings-card">
                        <div className="settings-card-header">
                            <Sparkles size={18} />
                            <h3>Global Telemetry Simulator Defaults</h3>
                        </div>
                        <div className="settings-card-body">
                            <p className="settings-section-desc">Default parameters loaded by the simulator orchestrator for camera nodes.</p>

                            <div className="form-group">
                                <label htmlFor="set-cam-count">Default Camera Spawn Count</label>
                                <input
                                    id="set-cam-count"
                                    type="number"
                                    className="form-control"
                                    value={settings.camera_count ?? 10}
                                    onChange={e => handleChange('camera_count', parseInt(e.target.value))}
                                    min="1" max="100" required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-interval">Default Reporting Interval (seconds)</label>
                                <input
                                    id="set-interval"
                                    type="number"
                                    className="form-control"
                                    value={settings.default_reporting_interval ?? 30}
                                    onChange={e => handleChange('default_reporting_interval', parseInt(e.target.value))}
                                    min="5" max="3600" required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-fault-prob">Default Fault Probability (0.0 - 1.0)</label>
                                <input
                                    id="set-fault-prob"
                                    type="number" step="0.01"
                                    className="form-control"
                                    value={settings.fault_probability ?? 0.05}
                                    onChange={e => handleChange('fault_probability', parseFloat(e.target.value))}
                                    min="0" max="1" required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-offline-prob">Default Offline Probability (0.0 - 1.0)</label>
                                <input
                                    id="set-offline-prob"
                                    type="number" step="0.01"
                                    className="form-control"
                                    value={settings.offline_probability ?? 0.03}
                                    onChange={e => handleChange('offline_probability', parseFloat(e.target.value))}
                                    min="0" max="1" required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Heartbeat Configuration */}
                    <div className="settings-card full-width">
                        <div className="settings-card-header">
                            <Clock size={18} />
                            <h3>Liveness Detection Config</h3>
                        </div>
                        <div className="settings-card-body">
                            <div className="form-group">
                                <label htmlFor="set-timeout">Heartbeat Offline Timeout (seconds)</label>
                                <input
                                    id="set-timeout"
                                    type="number"
                                    className="form-control"
                                    value={settings.heartbeat_timeout ?? 90}
                                    onChange={e => handleChange('heartbeat_timeout', parseInt(e.target.value))}
                                    min="10" max="1200" required
                                    style={{ maxWidth: '300px' }}
                                />
                                <small className="form-text text-muted" style={{ display: 'block', marginTop: '6px' }}>
                                    Duration of telemetry silence after which a camera is flagged as "Offline".
                                </small>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="settings-actions-bar">
                    <button type="button" className="btn btn--ghost" onClick={handleReset} disabled={saving}>
                        <RotateCcw size={15} /> Reset Form
                    </button>
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                        <Save size={15} /> {saving ? 'Saving Configurations...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
