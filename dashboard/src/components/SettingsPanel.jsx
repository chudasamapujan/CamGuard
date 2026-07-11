import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Cpu, Sparkles } from 'lucide-react';
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
            const res = await updateSettings(settings);
            setSettings(res.data.settings);
            setOriginal({ ...res.data.settings });
            if (addToast) addToast('Global system configurations successfully updated', 'success');
        } catch (err) {
            console.error('Failed to update settings:', err);
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
                    <div className="skeleton-card" style={{ height: '220px' }}></div>
                    <div className="skeleton-card" style={{ height: '220px' }}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="management-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h2 className="page-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>System Configurations</h2>
                    <p className="page-subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        Configure dynamic telemetry settings and metric thresholds stored in the database.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave} className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                    
                    {/* Section: Simulator Configurations */}
                    <div className="settings-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
                        <div className="settings-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                            <Sparkles size={18} style={{ color: 'var(--color-success)' }} />
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Telemetry Simulator Settings</h3>
                        </div>
                        <div className="settings-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label htmlFor="set-cam-count" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Camera Count</label>
                                <input
                                    id="set-cam-count"
                                    type="number"
                                    className="form-control"
                                    value={settings.camera_count ?? 10}
                                    onChange={e => handleChange('camera_count', parseInt(e.target.value))}
                                    min="1" max="100" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-interval" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Reporting Interval (seconds)</label>
                                <input
                                    id="set-interval"
                                    type="number"
                                    className="form-control"
                                    value={settings.reporting_interval ?? 30}
                                    onChange={e => handleChange('reporting_interval', parseInt(e.target.value))}
                                    min="5" max="3600" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-fault-prob" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Fault Probability (0.0 - 1.0)</label>
                                <input
                                    id="set-fault-prob"
                                    type="number" step="0.01"
                                    className="form-control"
                                    value={settings.fault_probability ?? 0.05}
                                    onChange={e => handleChange('fault_probability', parseFloat(e.target.value))}
                                    min="0" max="1" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Metrics Thresholds */}
                    <div className="settings-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
                        <div className="settings-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                            <Cpu size={18} style={{ color: 'var(--color-warning)' }} />
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Health Thresholds</h3>
                        </div>
                        <div className="settings-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label htmlFor="set-cpu" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>CPU Threshold (%)</label>
                                <input
                                    id="set-cpu"
                                    type="number"
                                    className="form-control"
                                    value={settings.cpu_threshold ?? 75}
                                    onChange={e => handleChange('cpu_threshold', parseFloat(e.target.value))}
                                    min="1" max="100" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-mem" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Memory Threshold (%)</label>
                                <input
                                    id="set-mem"
                                    type="number"
                                    className="form-control"
                                    value={settings.memory_threshold ?? 75}
                                    onChange={e => handleChange('memory_threshold', parseFloat(e.target.value))}
                                    min="1" max="100" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-storage" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Storage Threshold (%)</label>
                                <input
                                    id="set-storage"
                                    type="number"
                                    className="form-control"
                                    value={settings.storage_threshold ?? 80}
                                    onChange={e => handleChange('storage_threshold', parseFloat(e.target.value))}
                                    min="1" max="100" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-latency" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Latency Threshold (ms)</label>
                                <input
                                    id="set-latency"
                                    type="number"
                                    className="form-control"
                                    value={settings.latency_threshold ?? 200}
                                    onChange={e => handleChange('latency_threshold', parseFloat(e.target.value))}
                                    min="1" max="5000" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="set-timeout" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Offline Timeout (seconds)</label>
                                <input
                                    id="set-timeout"
                                    type="number"
                                    className="form-control"
                                    value={settings.offline_timeout ?? 90}
                                    onChange={e => handleChange('offline_timeout', parseInt(e.target.value))}
                                    min="10" max="1200" required
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', color: 'inherit' }}
                                />
                            </div>
                        </div>
                    </div>

                </div>

                <div className="settings-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                    <button type="button" className="btn btn--ghost" onClick={handleReset} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'transparent', cursor: 'pointer', color: 'inherit' }}>
                        <RotateCcw size={15} /> Reset Form
                    </button>
                    <button type="submit" className="btn btn--primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '4px', background: 'var(--color-primary)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        <Save size={15} /> {saving ? 'Saving Configurations...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
