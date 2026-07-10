import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, RotateCcw, Cpu, MemoryStick, HardDrive, Globe, Clock } from 'lucide-react';
import { fetchThresholds, updateThresholds } from '../services/api';

function SettingsPanel({ isOpen, onClose, onSaved }) {
    const [thresholds, setThresholds] = useState(null);
    const [original, setOriginal] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        fetchThresholds()
            .then(res => {
                setThresholds({ ...res.data });
                setOriginal({ ...res.data });
            })
            .catch(() => { });
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const handleChange = useCallback((key, value) => {
        setThresholds(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateThresholds(thresholds);
            setOriginal({ ...thresholds });
            if (onSaved) onSaved('Thresholds updated successfully');
        } catch {
            if (onSaved) onSaved('Failed to update thresholds', true);
        }
        setSaving(false);
    };

    const handleReset = () => {
        if (original) setThresholds({ ...original });
    };

    if (!isOpen) return null;

    const fields = [
        {
            group: 'CPU Thresholds', icon: Cpu, items: [
                { key: 'cpu_warning', label: 'Warning (%)', min: 0, max: 100 },
                { key: 'cpu_critical', label: 'Critical (%)', min: 0, max: 100 },
            ]
        },
        {
            group: 'Memory Thresholds', icon: MemoryStick, items: [
                { key: 'memory_warning', label: 'Warning (%)', min: 0, max: 100 },
                { key: 'memory_critical', label: 'Critical (%)', min: 0, max: 100 },
            ]
        },
        {
            group: 'Storage Thresholds', icon: HardDrive, items: [
                { key: 'storage_warning', label: 'Warning (%)', min: 0, max: 100 },
                { key: 'storage_critical', label: 'Critical (%)', min: 0, max: 100 },
            ]
        },
        {
            group: 'Network Thresholds', icon: Globe, items: [
                { key: 'latency_warning', label: 'Warning (ms)', min: 0, max: 5000 },
                { key: 'latency_critical', label: 'Critical (ms)', min: 0, max: 5000 },
            ]
        },
        {
            group: 'Heartbeat', icon: Clock, items: [
                { key: 'heartbeat_timeout', label: 'Timeout (seconds)', min: 10, max: 600 },
            ]
        },
    ];

    return (
        <>
            <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
            <aside className="drawer drawer--settings" role="dialog" aria-label="Settings">
                <div className="drawer__header">
                    <h2 className="drawer__title">Settings</h2>
                    <button className="drawer__close" onClick={onClose} aria-label="Close settings">
                        <X size={20} />
                    </button>
                </div>

                <div className="drawer__body">
                    {!thresholds ? (
                        <p className="drawer__loading">Loading thresholds...</p>
                    ) : (
                        <>
                            {fields.map(group => (
                                <section key={group.group} className="drawer__section">
                                    <h3 className="drawer__section-title">
                                        <group.icon size={16} /> {group.group}
                                    </h3>
                                    <div className="settings__fields">
                                        {group.items.map(field => (
                                            <div key={field.key} className="settings__field">
                                                <label htmlFor={`setting-${field.key}`} className="settings__label">
                                                    {field.label}
                                                </label>
                                                <input
                                                    id={`setting-${field.key}`}
                                                    type="number"
                                                    className="settings__input"
                                                    value={thresholds[field.key] ?? ''}
                                                    onChange={e => handleChange(field.key, e.target.value)}
                                                    min={field.min}
                                                    max={field.max}
                                                    step={1}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}

                            <div className="settings__actions">
                                <button className="btn btn--ghost" onClick={handleReset} disabled={saving}>
                                    <RotateCcw size={15} /> Reset
                                </button>
                                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                                    <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}

export default React.memo(SettingsPanel);
