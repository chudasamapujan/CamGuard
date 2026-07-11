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
export const fetchCameras = () => api.get('/cameras');
export const fetchCamera = (id) => api.get(`/cameras/${id}`);
export const fetchCameraHistory = (id, hours = 24) => api.get(`/history/${id}?hours=${hours}`);

// Dashboard endpoints
export const fetchDashboardSummary = () => api.get('/dashboard/summary');
export const fetchDashboardHistory = (hours = 24) => api.get(`/dashboard/history?hours=${hours}`);

// Alerts endpoints
export const fetchAlerts = (activeOnly = false, limit = 50, cameraId = null) => {
    let url = `/alerts?active=${activeOnly}&limit=${limit}`;
    if (cameraId) url += `&camera_id=${cameraId}`;
    return api.get(url);
};
export const resolveAlert = (id) => api.put(`/alerts/${id}/resolve`);

// Config / Settings endpoints
export const fetchSettings = () => api.get('/settings');
export const updateSettings = (settings) => api.post('/settings', settings);

export default api;
