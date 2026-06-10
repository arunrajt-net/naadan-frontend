import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../api';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await notificationsAPI.getAll();
      if (res.data) {
        setNotifications(res.data);
      }
    } catch (e) {
      console.warn("Failed to fetch notifications:", e);
    }
  }, []);

  // Poll for notifications every 30s if logged in
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const addNotification = useCallback(async (type, message, orderId = null) => {
    // Trigger a backend-driven fetch to sync
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await notificationsAPI.markRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.warn("Failed to mark notifications read:", e);
    }
  }, []);

  const clearAll = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
    } catch (e) {
      console.warn("Failed to clear notifications:", e);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllRead, clearAll, unreadCount, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
