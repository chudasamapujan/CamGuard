/**
 * API Service
 * -----------
 * Centralized Axios client for all backend communication.
 * Base URL points to Flask API on port 5000.
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Camera endpoints
export const fetchCameras = () => api.get('/api/cameras');
export const fetchCamera = (id) => api.get(`/api/cameras/${id}`);
export const fetchCameraHistory = (id, hours = 24) =>
    api.get(`/api/cameras/${id}/history?hours=${hours}`);
export const createCamera = (data) => api.post('/api/cameras', data);
export const updateCamera = (id, data) => api.put(`/api/cameras/${id}`, data);
export const deleteCamera = (id) => api.delete(`/api/cameras/${id}`);
export const toggleCamera = (id, isEnabled) => api.put(`/api/cameras/${id}/toggle`, { is_enabled: isEnabled });

// Dashboard
export const fetchDashboardSummary = () => api.get('/api/dashboard/summary');
export const fetchDashboardHistory = (hours = 24) => api.get(`/api/dashboard/history?hours=${hours}`);

// Alerts
export const fetchAlerts = (activeOnly = false, limit = 50, cameraId = null) => {
    let url = `/api/alerts?active=${activeOnly}&limit=${limit}`;
    if (cameraId) url += `&camera_id=${cameraId}`;
    return api.get(url);
};
export const fetchAlertsSummary = () => api.get('/api/alerts/summary');
export const resolveAlert = (id) => api.put(`/api/alerts/${id}/resolve`);

// Config / Settings
export const fetchThresholds = () => api.get('/api/config/thresholds');
export const updateThresholds = (thresholds) =>
    api.put('/api/config/thresholds', thresholds);
export const fetchSettings = () => api.get('/api/settings');
export const updateSettings = (settings) => api.put('/api/settings', settings);

export default api;
