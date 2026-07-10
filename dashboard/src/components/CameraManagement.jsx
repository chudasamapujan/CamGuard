import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert, Check, X } from 'lucide-react';
import { fetchCameras, createCamera, updateCamera, deleteCamera, toggleCamera } from '../services/api';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

export default function CameraManagement({ addToast, onCameraChange }) {
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState(null);
    
    // Form fields
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        location: '',
        storage_capacity: 100,
        reporting_interval: 30,
        fault_probability: 0.05,
        offline_probability: 0.03,
        is_enabled: true,
        notes: ''
    });

    // Delete Confirmation
    const [deletingCameraId, setDeletingCameraId] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchCameras();
            setCameras(res.data);
        } catch (err) {
            console.error(err);
            if (addToast) addToast('Failed to load cameras list', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleOpenAdd = () => {
        setEditingCamera(null);
        setFormData({
            id: '',
            name: '',
            location: '',
            storage_capacity: 100,
            reporting_interval: 30,
            fault_probability: 0.05,
            offline_probability: 0.03,
            is_enabled: true,
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (cam) => {
        setEditingCamera(cam);
        setFormData({
            id: cam.id,
            name: cam.name,
            location: cam.location,
            storage_capacity: cam.storage_capacity || 100,
            reporting_interval: cam.reporting_interval || 30,
            fault_probability: cam.fault_probability || 0.05,
            offline_probability: cam.offline_probability || 0.03,
            is_enabled: cam.is_enabled !== false,
            notes: cam.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleToggleEnable = async (id, currentVal) => {
        try {
            await toggleCamera(id, !currentVal);
            addToast(`Camera ${id} ${!currentVal ? 'enabled' : 'disabled'} successfully`, 'success');
            load();
            if (onCameraChange) onCameraChange();
        } catch (err) {
            addToast('Failed to toggle camera state', 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteCamera(id);
            addToast(`Camera ${id} successfully deleted`, 'success');
            setDeletingCameraId(null);
            load();
            if (onCameraChange) onCameraChange();
        } catch (err) {
            addToast('Failed to delete camera', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.id.trim()) {
            addToast('Camera ID is required', 'error');
            return;
        }

        try {
            if (editingCamera) {
                // Update camera
                await updateCamera(editingCamera.id, formData);
                addToast('Camera updated successfully', 'success');
            } else {
                // Add camera
                await createCamera(formData);
                addToast('New camera registered successfully', 'success');
            }
            setIsModalOpen(false);
            load();
            if (onCameraChange) onCameraChange();
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Failed to save camera';
            addToast(errMsg, 'error');
        }
    };

    const filteredCameras = cameras.filter(cam => 
        cam.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="management-page">
            <div className="management-header">
                <div>
                    <h2 className="page-title">Camera Administration</h2>
                    <p className="page-subtitle">Configure, add, toggle, or register cameras in your fleet.</p>
                </div>
                <button className="btn btn--primary btn-add-cam" onClick={handleOpenAdd}>
                    <Plus size={16} /> Add Camera
                </button>
            </div>

            {/* Search filter bar */}
            <div className="management-filter-bar">
                <input
                    type="text"
                    className="form-control search-input"
                    placeholder="Search by Camera Name, ID, or Location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search cameras"
                />
            </div>

            {/* List Table */}
            {loading ? (
                <div className="skeleton-grid">
                    <Skeleton height="50px" count={6} />
                </div>
            ) : filteredCameras.length === 0 ? (
                <EmptyState type="cameras" />
            ) : (
                <div className="management-table-wrapper">
                    <table className="management-table">
                        <thead>
                            <tr>
                                <th>Camera ID</th>
                                <th>Name</th>
                                <th>Location</th>
                                <th>Interval</th>
                                <th>Storage</th>
                                <th>Fault Rate</th>
                                <th>Offline Rate</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCameras.map((cam) => (
                                <tr key={cam.id} className={!cam.is_enabled ? 'row--disabled' : ''}>
                                    <td className="cell-mono font-bold">{cam.id}</td>
                                    <td>{cam.name}</td>
                                    <td>{cam.location}</td>
                                    <td>{cam.reporting_interval || 30}s</td>
                                    <td>{cam.storage_capacity || 100} GB</td>
                                    <td>{Math.round((cam.fault_probability || 0.05) * 100)}%</td>
                                    <td>{Math.round((cam.offline_probability || 0.03) * 100)}%</td>
                                    <td>
                                        <button 
                                            className={`badge-toggle badge-toggle--${cam.is_enabled ? 'enabled' : 'disabled'}`}
                                            onClick={() => handleToggleEnable(cam.id, cam.is_enabled)}
                                            title={cam.is_enabled ? "Click to Disable" : "Click to Enable"}
                                            aria-label={`Toggle active state for camera ${cam.id}`}
                                        >
                                            {cam.is_enabled ? <Check size={12} /> : <X size={12} />}
                                            <span>{cam.is_enabled ? 'Enabled' : 'Disabled'}</span>
                                        </button>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="actions-cell">
                                            <button 
                                                className="btn btn--sm btn--ghost" 
                                                onClick={() => handleOpenEdit(cam)}
                                                title="Edit Config"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                className="btn btn--sm btn--ghost text-danger" 
                                                onClick={() => setDeletingCameraId(cam.id)}
                                                title="Delete Camera"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Dialog for Add/Edit */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="modal-header">
                            <h3 id="modal-title">{editingCamera ? 'Edit Camera Settings' : 'Register New Camera'}</h3>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)} aria-label="Close dialog">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="cam-id">Camera ID *</label>
                                    <input
                                        id="cam-id"
                                        type="text"
                                        className="form-control"
                                        disabled={!!editingCamera}
                                        value={formData.id}
                                        onChange={(e) => setFormData({...formData, id: e.target.value})}
                                        placeholder="e.g. CAM-011"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cam-name">Camera Name *</label>
                                    <input
                                        id="cam-name"
                                        type="text"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g. Back Alley View"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cam-location">Location</label>
                                    <input
                                        id="cam-location"
                                        type="text"
                                        className="form-control"
                                        value={formData.location}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        placeholder="e.g. Warehouse Zone C"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cam-storage">Storage Capacity (GB)</label>
                                    <input
                                        id="cam-storage"
                                        type="number"
                                        className="form-control"
                                        value={formData.storage_capacity}
                                        onChange={(e) => setFormData({...formData, storage_capacity: parseFloat(e.target.value)})}
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cam-interval">Reporting Interval (seconds)</label>
                                    <input
                                        id="cam-interval"
                                        type="number"
                                        className="form-control"
                                        value={formData.reporting_interval}
                                        onChange={(e) => setFormData({...formData, reporting_interval: parseInt(e.target.value)})}
                                        min="5"
                                        max="3600"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cam-fault">Fault Probability (0.0 - 1.0)</label>
                                    <input
                                        id="cam-fault"
                                        type="number"
                                        step="0.01"
                                        className="form-control"
                                        value={formData.fault_probability}
                                        onChange={(e) => setFormData({...formData, fault_probability: parseFloat(e.target.value)})}
                                        min="0"
                                        max="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cam-offline">Offline Probability (0.0 - 1.0)</label>
                                    <input
                                        id="cam-offline"
                                        type="number"
                                        step="0.01"
                                        className="form-control"
                                        value={formData.offline_probability}
                                        onChange={(e) => setFormData({...formData, offline_probability: parseFloat(e.target.value)})}
                                        min="0"
                                        max="1"
                                    />
                                </div>
                                <div className="form-group toggle-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_enabled}
                                            onChange={(e) => setFormData({...formData, is_enabled: e.target.checked})}
                                        />
                                        <span>Enable Telemetry Simulation</span>
                                    </label>
                                </div>
                            </div>
                            <div className="form-group full-width">
                                <label htmlFor="cam-notes">Administrative Notes</label>
                                <textarea
                                    id="cam-notes"
                                    className="form-control"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Add any hardware or deployment notes..."
                                    rows="3"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn--ghost" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn--primary">
                                    {editingCamera ? 'Save Changes' : 'Add Camera'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Alert */}
            {deletingCameraId && (
                <div className="modal-overlay" onClick={() => setDeletingCameraId(null)}>
                    <div className="modal-content modal-content--sm confirm-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
                        <div className="confirm-icon text-danger">
                            <ShieldAlert size={36} />
                        </div>
                        <h3 id="confirm-title" className="confirm-title">Delete Camera Configuration?</h3>
                        <p id="confirm-desc" className="confirm-desc">
                            Are you sure you want to delete camera <strong>{deletingCameraId}</strong>? This action will permanently wipe all telemetry history logs and alerts from the database.
                        </p>
                        <div className="confirm-actions">
                            <button className="btn btn--ghost" onClick={() => setDeletingCameraId(null)}>
                                Cancel
                            </button>
                            <button className="btn btn--danger" onClick={() => handleDelete(deletingCameraId)}>
                                Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
