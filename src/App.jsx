import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, User, Settings } from 'lucide-react';
import './index.css';

import Home from './pages/Home';
import Auth from './pages/Auth';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerSearch from './pages/BuyerSearch';
import AIAssistant from './pages/AIAssistant';
import Checkout from './pages/Checkout';
import OrderTracker from './pages/OrderTracker';
import MyOrders from './pages/MyOrders';
import AdminDashboard from './pages/AdminDashboard';
import NotificationCenter from './pages/NotificationCenter';
import Profile from './pages/Profile';
import TermsAndConditions from './pages/TermsAndConditions';
import GlobalAIAssistant from './components/GlobalAIAssistant';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { auth } from './firebaseConfig';
import { ordersAPI } from './api';
import logo from './assets/logo.png';

// Pages that show no header (full-screen mobile pages)
const NO_HEADER_PATHS = ['/buyer/search', '/farmer', '/farmer/dashboard'];

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { unreadCount } = useNotifications();

  const hideHeader = NO_HEADER_PATHS.some(p => location.pathname.startsWith(p));
  if (hideHeader) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
    localStorage.removeItem('cart');
    localStorage.removeItem('naadan_notifs');
    localStorage.removeItem('deliveryVehicle');
    auth.signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline outline-none">
            <img src={logo} alt="Naadan" className="h-10 w-10 rounded-xl object-cover ring-1 ring-green-100" />
            <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-800 to-green-600">
              Naadan
            </span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {user.role === 'admin' && (
              <button onClick={() => navigate('/admin')}
                className="btn bg-purple-50 text-purple-700 font-bold border-none shadow-sm flex items-center gap-2 cursor-pointer" style={{minHeight:'40px',padding:'0 14px'}}>
                <Settings size={17} />
                <span className="hidden sm:inline text-sm">Admin</span>
              </button>
            )}

            {token && (
              <>
                {/* Notification bell */}
                <button onClick={() => navigate('/notifications')}
                  className="relative w-11 h-11 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-all">
                  <Bell size={20} className="text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="notif-dot" style={{top:'-2px',right:'-2px'}}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {/* Profile */}
                <button onClick={() => navigate('/profile')}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-green-700 text-white font-extrabold text-base border-none cursor-pointer hover:bg-green-800 transition-all">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </button>
              </>
            )}

            {!token && (
              <Link to="/auth" className="btn btn-primary text-sm font-bold cursor-pointer" style={{minHeight:'40px',padding:'0 16px'}}>
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

function App() {
  return (
    <NotificationProvider>
      <Router>
        <AppHeader />
        <main className="w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-login" element={<Auth isAdminLogin={true} />} />
            <Route path="/farmer" element={<FarmerDashboard />} />
            <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
            <Route path="/buyer/search" element={<BuyerSearch />} />
            <Route path="/farmer/ai-assistant" element={<AIAssistant />} />
            <Route path="/buyer/checkout" element={<Checkout />} />
            <Route path="/buyer/orders" element={<MyOrders />} />
            <Route path="/buyer/track/:orderId" element={<OrderTracker />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            </Routes>
        </main>
        <GlobalAIAssistant />
      </Router>
    </NotificationProvider>
  );
}

export default App;
