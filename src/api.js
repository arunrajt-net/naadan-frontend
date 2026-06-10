import axios from 'axios';

// Simple API response cache (60 second TTL for nearby products)
const _cache = {};
const _getCached = (key) => {
  const entry = _cache[key];
  if (entry && Date.now() - entry.ts < 60000) return entry.data;
  return null;
};
const _setCache = (key, data) => { _cache[key] = { data, ts: Date.now() }; };

import { auth } from './firebaseConfig';

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://naadan-backend-ebd6e.onrender.com/api';

const api = axios.create({
  timeout: 15000,
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  let token = null;
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
      if (token) {
        localStorage.setItem('token', token);
      }
    } catch (e) {
      console.warn("Could not retrieve Firebase token from auth.currentUser", e);
    }
  }
  if (!token) {
    token = localStorage.getItem('token');
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeRole = localStorage.getItem('activeRole');
  if (activeRole) {
    config.headers['X-Active-Role'] = activeRole;
  }
  return config;
});

export const authAPI = {
  sync: (data) => api.post('/auth/sync', data),
  linkAccounts: () => api.post('/auth/link-accounts'),
  enableRole: (role) => api.post('/auth/enable-role', { role }),
  locationHistory: () => api.get('/auth/location-history'),
  adminLogin: (username, password) => api.post('/auth/admin-login', { username, password }),
  forgotPassword: (phone) => api.post('/auth/forgot-password', { phone }),
  verifyRecoveryOtp: (phone, otp) => api.post('/auth/verify-recovery-otp', { phone, otp }),
  resetPassword: (phone, resetToken, newPassword) => api.post('/auth/reset-password', { phone, reset_token: resetToken, new_password: newPassword }),
  resetPasswordFirebase: (phone, firebaseIdToken, newPassword) => api.post('/auth/reset-password-firebase', { phone, firebase_id_token: firebaseIdToken, new_password: newPassword }),
};

export const productsAPI = {
  add: (data) => api.post('/products/', data),
  getFarmerProducts: () => api.get('/products/farmer'),
  getNearby: (lat, lng, radius) => api.get(`/products/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
  restock: (id, quantity) => api.put(`/products/${id}/restock`, { quantity }),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

export const ordersAPI = {
  markPaid: (id, data) => api.post(`/orders/${id}/pay`, data),
  farmerConfirm: (id) => api.post(`/orders/${id}/farmer-confirm`),
  create: (data) => api.post('/orders/', data),
  getFarmerOrders: () => api.get('/orders/farmer'),
  getBuyerOrders: () => api.get('/orders/buyer'),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  getDetail: (id) => api.get(`/orders/${id}`),
};

export const marketAPI = {
  getAll: () => api.get('/market/all'),
  getBest: (productName) => api.get(`/market/best/${encodeURIComponent(productName)}`),
  submitVerification: (data) => api.post('/market/verify/submit', data),
  rateOrder: (orderId, rating, feedback) => api.post(`/orders/${orderId}/rate`, { rating, feedback }),
  logEvent: (eventType, payload) => api.post('/market/event', { event_type: eventType, payload }),
  getIntelligence: (crop) => api.get(`/market/intelligence?crop=${encodeURIComponent(crop)}`),
  getFarmerPerformance: () => api.get('/market/performance'),
};

export const adminAPI = {
  addMarketPrice: (data) => api.post('/market/add', data),
  updateMarketPrice: (id, data) => api.put(`/market/update/${id}`, data),
  deleteMarketPrice: (id) => api.delete(`/market/delete/${id}`),
  getPendingVerifications: () => api.get('/market/verify/pending'),
  approveFarmer: (userId) => api.post(`/market/verify/approve/${userId}`),
  rejectFarmer: (userId) => api.post(`/market/verify/reject/${userId}`),
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
};

export const paymentAPI = {
  createOrder: (data) => api.post('/payment/create-order', data),
  verifyPayment: (data) => api.post('/payment/verify', data),
};

export const notificationsAPI = {
  getAll: () => api.get('/orders/notifications'),
  markRead: () => api.post('/orders/notifications/mark-read'),
  clearAll: () => api.delete('/orders/notifications'),
};

export default api;

// ---- Verification API ----
export const verificationAPI = {
  getStatus: () => api.get('/verify/status'),
  verifyPhone: (phone) => api.post('/verify/phone', { phone }),
  submitFarmPhotos: (formData) => api.post('/verify/farm', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submitCommunityDoc: (formData) => api.post('/verify/community', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submitRating: (data) => api.post('/verify/rating', data),
  getFarmerProfile: (farmerId) => api.get(`/verify/farmer/${farmerId}`),
};
