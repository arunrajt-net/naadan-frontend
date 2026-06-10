import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Edit3, Leaf, LogOut, MapPin, Package, Phone, Star, User, ShieldAlert } from 'lucide-react';
import { auth } from '../firebaseConfig';
import { authAPI } from '../api';
import { CompactBadgeRow } from '../components/VerificationBadges';

const Profile = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const activeRole = localStorage.getItem('activeRole') || (user.is_farmer ? 'farmer' : 'buyer');
  
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saved, setSaved] = useState(false);

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

  const handleSave = async () => {
    try {
      const res = await authAPI.sync({ name, phone });
      const u = res.data.user;
      // Complete profile save simplification (Condition 11)
      localStorage.setItem('user', JSON.stringify(u));
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
      // Force page update
      window.location.reload();
    } catch (err) {
      alert("Profile update failed. Reason: " + (err.response?.data?.error || err.response?.data?.msg || err.message));
    }
  };

  const handleSwitchRole = (newRole) => {
    localStorage.setItem('activeRole', newRole);
    if (newRole === 'farmer') {
      navigate('/farmer/dashboard');
    } else if (newRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/buyer/search');
    }
  };

  const handleEnableRole = async (roleToEnable) => {
    try {
      const res = await authAPI.enableRole(roleToEnable);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('activeRole', roleToEnable);
      alert(`Capability ${roleToEnable.toUpperCase()} enabled successfully!`);
      handleSwitchRole(roleToEnable);
    } catch (err) {
      alert("Failed to enable capability: " + (err.response?.data?.msg || err.message));
    }
  };

  const initial = (user.name || 'U').charAt(0).toUpperCase();
  
  // Dynamic badge and label
  const roleLabel = activeRole === 'farmer' ? 'Active Mode: Farmer' : activeRole === 'admin' ? 'Active Mode: Admin' : 'Active Mode: Buyer';
  const roleColor = activeRole === 'farmer' ? 'bg-green-100 text-green-700' : activeRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 border-none cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-extrabold text-lg text-gray-900">My Profile</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Avatar card */}
        <div className="bg-white rounded-3xl p-6 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-green-700 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-3xl font-extrabold">{initial}</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">{user.name || 'User'}</h2>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          <span className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold ${roleColor}`}>
            {activeRole === 'farmer' ? <Leaf size={12} /> : <User size={12} />}
            {roleLabel}
          </span>
          {user.is_farmer && (
            <div className="mt-3 flex items-center justify-center">
              <CompactBadgeRow farmer={user} />
            </div>
          )}
        </div>

        {/* User Mode Switching (Condition 10) */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-extrabold text-gray-900 mb-3">Account Modes</h3>
          <div className="space-y-2">
            {user.is_buyer && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">🛒 Customer/Buyer Mode</span>
                {activeRole === 'buyer' ? (
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">Active</span>
                ) : (
                  <button onClick={() => handleSwitchRole('buyer')}
                    className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all">
                    Switch
                  </button>
                )}
              </div>
            )}
            
            {user.is_farmer && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">🌾 Farmer/Seller Mode</span>
                {activeRole === 'farmer' ? (
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">Active</span>
                ) : (
                  <button onClick={() => handleSwitchRole('farmer')}
                    className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all">
                    Switch
                  </button>
                )}
              </div>
            )}

            {user.is_admin && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">🛠️ Admin Dashboard Mode</span>
                {activeRole === 'admin' ? (
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md">Active</span>
                ) : (
                  <button onClick={() => handleSwitchRole('admin')}
                    className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all">
                    Switch
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Capability Activation Controls (Condition 10) */}
        {(!user.is_buyer || !user.is_farmer) && (
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-extrabold text-gray-900 mb-3">Activate Additional Modes</h3>
            <div className="space-y-2">
              {!user.is_buyer && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div>
                    <span className="block text-sm font-semibold text-gray-700">Customer Mode</span>
                    <span className="block text-xs text-gray-400">Buy fresh farm produce directly</span>
                  </div>
                  <button onClick={() => handleEnableRole('buyer')}
                    className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all">
                    Activate
                  </button>
                </div>
              )}
              
              {!user.is_farmer && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div>
                    <span className="block text-sm font-semibold text-gray-700">Farmer Mode</span>
                    <span className="block text-xs text-gray-400">List and sell your own produce</span>
                  </div>
                  <button onClick={() => handleEnableRole('farmer')}
                    className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all">
                    Activate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Details */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-gray-900">Personal Details</h3>
            <button onClick={() => editing ? handleSave() : setEditing(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-green-700 border-none bg-transparent cursor-pointer">
              <Edit3 size={15} />
              {editing ? (saved ? 'Saved!' : 'Save') : 'Edit'}
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <User size={18} className="text-gray-400 flex-shrink-0" />
              {editing ? (
                <input className="w-full bg-white text-sm border border-gray-200 rounded-lg p-2 focus:border-green-500 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{minHeight:'40px'}} />
              ) : (
                <span className="text-sm font-semibold text-gray-700">{user.name || 'Not set'}</span>
              )}
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Phone size={18} className="text-gray-400 flex-shrink-0" />
              {editing ? (
                <input className="w-full bg-white text-sm border border-gray-200 rounded-lg p-2 focus:border-green-500 outline-none" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" style={{minHeight:'40px'}} />
              ) : (
                <span className="text-sm font-semibold text-gray-700">{user.phone || 'Not set'}</span>
              )}
            </div>
            {user.upi_id && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <CreditCard size={18} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-700">{user.upi_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {activeRole === 'buyer' && (
            <button onClick={() => navigate('/buyer/orders')}
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer border-none bg-transparent text-left">
              <Package size={20} className="text-green-700" />
              <span className="font-semibold text-gray-800">My Orders</span>
              <span className="ml-auto text-gray-300">→</span>
            </button>
          )}
          {activeRole === 'farmer' && (
            <button onClick={() => navigate('/farmer/dashboard')}
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer border-none bg-transparent text-left">
              <Leaf size={20} className="text-green-700" />
              <span className="font-semibold text-gray-800">Farmer Dashboard</span>
              <span className="ml-auto text-gray-300">→</span>
            </button>
          )}
        </div>

        {/* App Info */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-400 font-medium">Naadan v1.0 • Farm Fresh Direct</p>
          <p className="text-xs text-gray-300 mt-1">Built for Kerala farmers 🍀</p>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 text-red-600 font-extrabold border-none cursor-pointer hover:bg-red-100 transition-all">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
