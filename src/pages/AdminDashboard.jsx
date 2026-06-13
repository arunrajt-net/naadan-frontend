import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, marketAPI } from '../api';
import { ArrowLeft, CheckCircle, Edit2, Loader2, MapPin, Plus, Search, ShieldAlert, ShieldCheck, Sliders, Trash2, XCircle, User, X } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'prices', 'verifications'
  
  // States for Market Prices
  const [prices, setPrices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [priceForm, setPriceForm] = useState({
    productName: '',
    marketName: '',
    price: '',
    location: '',
    lat: '',
    lng: ''
  });

  // States for Farmer Verifications
  const [verifications, setVerifications] = useState([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  
  // States for Dashboard stats
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [smsStats, setSmsStats] = useState(null);
  const [loadingSms, setLoadingSms] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedAdminProofUrl, setSelectedAdminProofUrl] = useState(null);

  // General State
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchSmsStats = async () => {
    try {
      setLoadingSms(true);
      const res = await adminAPI.getSmsStats();
      setSmsStats(res.data);
    } catch (err) {
      console.error("Failed to fetch SMS stats:", err);
    } finally {
      setLoadingSms(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const res = await adminAPI.getPayments();
      setPayments(res.data);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      showError("Failed to fetch payment audits.");
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments' && isAdmin) {
      fetchPayments();
    }
  }, [activeTab, isAdmin]);

  // Check auth and role
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    if (!token || user.role !== 'admin') {
      navigate('/admin-login');
    } else {
      setIsAdmin(true);
      fetchMarketPrices();
      fetchPendingVerifications();
      fetchDashboardStats();
      fetchSmsStats();
    }
  }, [navigate]);

  // 15-minute inactivity auto-logout
  useEffect(() => {
    if (!isAdmin) return;

    let timeoutId;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeRole');
        alert("Session expired due to 15 minutes of inactivity. Please log in again.");
        navigate('/admin-login');
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer(); // Initialize timer

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAdmin, navigate]);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const res = await adminAPI.getDashboardStats();
      setStats(res.data.stats);
      setRecentActivity(res.data.recent_activity);
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  // --- Market Prices Handlers ---

  const fetchMarketPrices = async () => {
    try {
      setLoadingPrices(true);
      const res = await marketAPI.getAll();
      setPrices(res.data);
    } catch (err) {
      console.error(err);
      showError('Failed to fetch market price benchmarks.');
    } finally {
      setLoadingPrices(false);
    }
  };

  const handlePriceFormChange = (e) => {
    setPriceForm({
      ...priceForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddOrUpdatePrice = async (e) => {
    e.preventDefault();
    if (!priceForm.productName || !priceForm.marketName || !priceForm.price || !priceForm.location) {
      showError('Please fill out all mandatory fields.');
      return;
    }

    const payload = {
      productName: priceForm.productName.trim(),
      marketName: priceForm.marketName.trim(),
      price: parseFloat(priceForm.price),
      location: priceForm.location.trim(),
      lat: priceForm.lat ? parseFloat(priceForm.lat) : null,
      lng: priceForm.lng ? parseFloat(priceForm.lng) : null
    };

    try {
      if (editingPriceId) {
        await adminAPI.updateMarketPrice(editingPriceId, payload);
        showSuccess('Market price benchmark updated successfully.');
      } else {
        await adminAPI.addMarketPrice(payload);
        showSuccess('New market price benchmark added successfully.');
      }
      
      // Reset form
      setPriceForm({ productName: '', marketName: '', price: '', location: '', lat: '', lng: '' });
      setEditingPriceId(null);
      fetchMarketPrices();
    } catch (err) {
      console.error(err);
      showError('Failed to save market price benchmark.');
    }
  };

  const handleEditPrice = (item) => {
    setEditingPriceId(item.id);
    setPriceForm({
      productName: item.productName,
      marketName: item.marketName,
      price: item.price.toString(),
      location: item.location,
      lat: item.lat ? item.lat.toString() : '',
      lng: item.lng ? item.lng.toString() : ''
    });
  };

  const handleDeletePrice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this market benchmark?')) return;
    try {
      await adminAPI.deleteMarketPrice(id);
      showSuccess('Market benchmark deleted.');
      fetchMarketPrices();
    } catch (err) {
      console.error(err);
      showError('Failed to delete benchmark.');
    }
  };

  // --- Verification Handlers ---

  const fetchPendingVerifications = async () => {
    try {
      setLoadingVerifications(true);
      const res = await adminAPI.getPendingVerifications();
      setVerifications(res.data);
    } catch (err) {
      console.error(err);
      showError('Failed to fetch pending farmer verifications.');
    } finally {
      setLoadingVerifications(false);
    }
  };

  const handleApproveFarmer = async (userId) => {
    try {
      await adminAPI.approveFarmer(userId);
      showSuccess('Farmer verified successfully. Badges will update instantly.');
      fetchPendingVerifications();
    } catch (err) {
      console.error(err);
      showError('Failed to approve farmer verification.');
    }
  };

  const handleRejectFarmer = async (userId) => {
    try {
      await adminAPI.rejectFarmer(userId);
      showSuccess('Farmer verification request rejected.');
      fetchPendingVerifications();
    } catch (err) {
      console.error(err);
      showError('Failed to reject farmer verification.');
    }
  };

  const filteredPrices = prices.filter(p => 
    p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.marketName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded-3xl shadow-sm">
          <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-black mb-2">Access Denied</h2>
          <p className="font-semibold mb-6">{errorMsg || 'Only registered admins can access this page.'}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary cursor-pointer w-full py-3.5">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 font-bold border-none bg-transparent cursor-pointer mb-2"
          >
            <ArrowLeft size={16} /> Home
          </button>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sliders size={32} className="text-purple-600" /> Market Management Center
          </h1>
          <p className="text-gray-500 font-semibold mt-1">Manage local crop price benchmarks and farmer reputation verification requests.</p>
        </div>
        
        {/* Tab Selector */}
        <div className="flex gap-2 bg-gray-150 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2.5 rounded-xl font-bold cursor-pointer transition-all border-none ${activeTab === 'overview' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('prices')}
            className={`px-6 py-2.5 rounded-xl font-bold cursor-pointer transition-all border-none ${activeTab === 'prices' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Price Benchmarks
          </button>
          <button 
            onClick={() => setActiveTab('verifications')}
            className={`px-6 py-2.5 rounded-xl font-bold cursor-pointer transition-all border-none ${activeTab === 'verifications' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Farmer Verifications {verifications.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1 animate-pulse">{verifications.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-2.5 rounded-xl font-bold cursor-pointer transition-all border-none ${activeTab === 'payments' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Payment Audits
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl mb-8 font-bold text-center animate-fade-in">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-8 font-bold text-center animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {loadingStats && !stats ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="text-purple-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Analytics Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center shrink-0">
                    <User size={24} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Farmers</span>
                    <span className="text-2xl font-black text-gray-900">{stats?.total_farmers || 0}</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center shrink-0">
                    <User size={24} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Customers</span>
                    <span className="text-2xl font-black text-gray-900">{stats?.total_buyers || 0}</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center shrink-0">
                    <Sliders size={24} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Products (Active)</span>
                    <span className="text-2xl font-black text-gray-900">
                      {stats?.active_products || 0} <span className="text-xs text-gray-400 font-semibold">/ {stats?.total_products || 0}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-orange-50 text-orange-700 rounded-2xl flex items-center justify-center shrink-0">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Orders Filled</span>
                    <span className="text-2xl font-black text-gray-900">
                      {stats?.completed_orders || 0} <span className="text-xs text-gray-400 font-semibold">/ {stats?.total_orders || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* SMS Telemetry Section */}
              <div className="bg-white border border-gray-150 rounded-[2rem] p-8 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Sliders className="text-purple-600 animate-pulse" size={24} /> SMS Telemetry &amp; Cost Control
                </h3>
                {loadingSms && !smsStats ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="animate-spin text-purple-600" size={24} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sent Today</span>
                      <span className="text-xl font-extrabold text-gray-800">{smsStats?.sent_today || 0}</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sent This Month</span>
                      <span className="text-xl font-extrabold text-gray-800">{smsStats?.sent_this_month || 0}</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">OTPs Sent</span>
                      <span className="text-xl font-extrabold text-gray-800">{smsStats?.otp_count || 0}</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Alerts</span>
                      <span className="text-xl font-extrabold text-gray-800">{smsStats?.order_alert_count || 0}</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Failed SMS</span>
                      <span className="text-xl font-extrabold text-red-600">{smsStats?.failed_count || 0}</span>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-2xl">
                      <span className="block text-[10px] font-bold text-purple-600 uppercase tracking-wider">Estimated Cost</span>
                      <span className="text-xl font-black text-purple-700">&#8377;{smsStats?.estimated_cost || "0.00"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activity Log Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Users List */}
                <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <User size={18} className="text-purple-600" /> Recent Registrations
                  </h3>
                  {!recentActivity?.users || recentActivity.users.length === 0 ? (
                    <p className="text-sm text-gray-400 font-semibold py-4 text-center">No recent signups.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.users.map(u => (
                        <div key={u.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-800">{u.name}</p>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-600">{u.role}</span>
                          </div>
                          <span className="text-[10px] text-gray-450 font-bold">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Listings List */}
                <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Sliders size={18} className="text-green-600" /> Recent Crop Listings
                  </h3>
                  {!recentActivity?.products || recentActivity.products.length === 0 ? (
                    <p className="text-sm text-gray-400 font-semibold py-4 text-center">No recent listings.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.products.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-800">{p.name}</p>
                            <span className="text-xs text-green-700 font-extrabold">&#8377;{p.price} <span className="text-gray-400 font-semibold">({p.quantity})</span></span>
                          </div>
                          <span className="text-[10px] text-gray-450 font-bold">{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orders List */}
                <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <CheckCircle size={18} className="text-orange-600" /> Recent Orders
                  </h3>
                  {!recentActivity?.orders || recentActivity.orders.length === 0 ? (
                    <p className="text-sm text-gray-400 font-semibold py-4 text-center">No recent orders.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.orders.map(o => (
                        <div key={o.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-2xl border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-800">Order #{o.id}</p>
                            <span className="text-xs text-orange-600 font-extrabold">&#8377;{o.total_price} <span className="text-gray-400 font-semibold">({o.status})</span></span>
                          </div>
                          <span className="text-[10px] text-gray-450 font-bold">{o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: PRICES */}
      {activeTab === 'prices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Price Benchmark Entry Form */}
          <div className="bg-white border border-gray-150 rounded-[2rem] p-8 shadow-sm h-fit">
            <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
              {editingPriceId ? 'Edit Benchmark' : 'Add Price Benchmark'}
            </h2>
            <form onSubmit={handleAddOrUpdatePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Product Crop Name</label>
                <input 
                  type="text" 
                  name="productName"
                  value={priceForm.productName}
                  onChange={priceFormChange => handlePriceFormChange(priceFormChange)}
                  placeholder="e.g. Tomato, Coconut, Paddy"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-semibold text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Market Hub Name</label>
                <input 
                  type="text" 
                  name="marketName"
                  value={priceForm.marketName}
                  onChange={priceFormChange => handlePriceFormChange(priceFormChange)}
                  placeholder="e.g. Ernakulam Wholesale Market"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-semibold text-gray-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Price (&#8377;/kg or unit)</label>
                  <input 
                    type="number" 
                    name="price"
                    value={priceForm.price}
                    onChange={priceFormChange => handlePriceFormChange(priceFormChange)}
                    placeholder="e.g. 45"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-semibold text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">City/District</label>
                  <input 
                    type="text" 
                    name="location"
                    value={priceForm.location}
                    onChange={priceFormChange => handlePriceFormChange(priceFormChange)}
                    placeholder="e.g. Kochi"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-semibold text-gray-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Latitude (Optional)</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    name="lat"
                    value={priceForm.lat}
                    onChange={priceFormChange => handlePriceFormChange(priceFormChange)}
                    placeholder="e.g. 9.9816"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-semibold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Longitude (Optional)</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    name="lng"
                    value={priceForm.lng}
                    onChange={priceFormChange => handlePriceFormChange(priceFormChange)}
                    placeholder="e.g. 76.2999"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:bg-white outline-none font-semibold text-gray-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer border-none flex items-center justify-center gap-1.5"
                >
                  <Plus size={18} /> {editingPriceId ? 'Update Price' : 'Add Price'}
                </button>
                {editingPriceId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingPriceId(null);
                      setPriceForm({ productName: '', marketName: '', price: '', location: '', lat: '', lng: '' });
                    }}
                    className="px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Benchmarks List Table */}
          <div className="bg-white border border-gray-150 rounded-[2rem] p-8 shadow-sm lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Active Price Benchmarks</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter benchmarks..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 outline-none text-sm font-semibold"
                />
              </div>
            </div>

            {loadingPrices ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={32} className="text-purple-600 animate-spin" />
              </div>
            ) : filteredPrices.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-bold">
                No active price benchmarks found. Add one above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-150 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Crop Name</th>
                      <th className="py-3 px-4">Market Hub</th>
                      <th className="py-3 px-4">Benchmark Price</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-800 text-sm">
                    {filteredPrices.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{item.productName}</td>
                        <td className="py-3.5 px-4">{item.marketName}</td>
                        <td className="py-3.5 px-4 text-purple-700 font-extrabold">&#8377;{item.price} / kg</td>
                        <td className="py-3.5 px-4 text-gray-500 flex items-center gap-1">
                          <MapPin size={14} /> {item.location} {item.lat && <span className="text-[10px] text-gray-400 font-medium">({item.lat.toFixed(2)}, {item.lng.toFixed(2)})</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleEditPrice(item)}
                              className="p-2 hover:bg-purple-50 text-purple-600 hover:text-purple-700 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                              title="Edit Benchmark"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeletePrice(item.id)}
                              className="p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                              title="Delete Benchmark"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: VERIFICATIONS */}
      {activeTab === 'verifications' && (
        <div className="bg-white border border-gray-150 rounded-[2rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldCheck size={28} className="text-green-600" /> Pending Farmer Reputation Requests
            </h2>
            <button onClick={fetchPendingVerifications} className="btn bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold border-none py-2 px-4 rounded-xl cursor-pointer">
              Refresh List
            </button>
          </div>

          {loadingVerifications ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="text-green-600 animate-spin" />
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">
              🎉 No pending farmer verifications under review!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifications.map((farmer) => (
                <div key={farmer.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{farmer.name}</h3>
                    <p className="text-xs text-gray-400 font-bold mb-4">MEMBER SINCE {farmer.created_at}</p>
                    
                    <div className="space-y-2 mb-6">
                      <div className="bg-white p-3 rounded-xl border border-gray-150 text-sm">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Aadhaar Number (Optional)</span>
                        <span className="font-extrabold text-gray-800 tracking-wider">{farmer.aadhaar_number || 'Not Provided'}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-150 text-sm">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Panchayat ID (Optional)</span>
                        <span className="font-extrabold text-gray-800">{farmer.panchayat_id || 'Not Provided'}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-150 text-sm">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase">Verified Phone</span>
                        <span className="font-extrabold text-green-700">{farmer.phone || 'Mandatory Field Missing'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApproveFarmer(farmer.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl border-none shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={18} /> Approve Verified Badge
                    </button>
                    <button 
                      onClick={() => handleRejectFarmer(farmer.id)}
                      className="p-3.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold rounded-xl border-none transition-colors cursor-pointer flex items-center justify-center"
                      title="Decline Request"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PAYMENTS (AUDITS) */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-gray-150 rounded-[2rem] p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldCheck size={28} className="text-purple-600" /> Direct UPI Payment Audit Ledger
            </h2>
            <button onClick={fetchPayments} className="btn bg-gray-50 hover:bg-gray-100 text-gray-705 font-bold border-none py-2 px-4 rounded-xl cursor-pointer">
              Refresh Ledger
            </button>
          </div>
          
          {loadingPayments ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="text-purple-600 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">
              No payment transaction logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4">Farmer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">UTR Number</th>
                    <th className="py-3 px-4">Proof</th>
                    <th className="py-3 px-4">Verified By</th>
                    <th className="py-3 px-4">Rejection Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-semibold text-gray-800 text-sm">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">#{p.id}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-bold">{p.buyer_name}</p>
                        <p className="text-[10px] text-gray-400">ID: {p.buyer_id}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-bold">{p.farmer_name}</p>
                        <p className="text-[10px] text-gray-400">ID: {p.farmer_id}</p>
                      </td>
                      <td className="py-3.5 px-4 text-purple-700 font-extrabold">&#8377;{p.total_price}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          p.payment_status === 'PAYMENT_CONFIRMED' ? 'bg-green-100 text-green-800' :
                          p.payment_status === 'PAYMENT_SUBMITTED' ? 'bg-amber-100 text-amber-800' :
                          p.payment_status === 'PAYMENT_REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-650'
                        }`}>
                          {p.payment_status || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-650">{p.utr_number || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        {p.payment_screenshot_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                                ? 'http://localhost:5000/api'
                                : 'https://naadan-backend-ebd6e.onrender.com/api';
                              setSelectedAdminProofUrl(`${API_URL}/uploads/${p.payment_screenshot_url}`);
                            }}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-bold border border-purple-200 cursor-pointer"
                          >
                            Inspect
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-gray-600">
                        {p.payment_verified_by ? (
                          <div>
                            <p className="font-bold">{p.payment_verified_by}</p>
                            {p.payment_verified_at && <p className="text-[9px] text-gray-400">{new Date(p.payment_verified_at).toLocaleDateString()}</p>}
                          </div>
                        ) : 'Unverified'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-red-650">{p.payment_rejection_reason || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Screenshot Zoom Modal */}
      {selectedAdminProofUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setSelectedAdminProofUrl(null)} />
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl z-10 border border-gray-200">
            <button 
              type="button"
              onClick={() => setSelectedAdminProofUrl(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 border-none cursor-pointer z-20 flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
            <div className="p-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
              <span className="font-extrabold text-sm text-gray-800">Direct UPI Payment Audit Screenshot</span>
            </div>
            <div className="overflow-auto p-2 flex items-center justify-center bg-gray-900 max-h-[75vh]">
              <img 
                src={selectedAdminProofUrl} 
                alt="Admin High resolution proof" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
            <div className="p-4 bg-white border-t border-gray-100 text-center">
              <button 
                type="button"
                onClick={() => setSelectedAdminProofUrl(null)}
                className="bg-gray-900 hover:bg-black text-white font-extrabold px-6 py-2 rounded-xl text-xs border-none cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
