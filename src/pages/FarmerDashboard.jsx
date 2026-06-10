import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Award, Bell, Calendar, Check, ChevronDown, ChevronUp, Clock, Eye, Leaf, Loader2, MapPin, Mic, MicOff, Navigation, Package, Phone, Plus, Search, ShieldAlert, ShieldCheck, ShoppingBag, Sparkles, Star, Tag, Trash2, TrendingUp, Truck, User, X, History, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, ordersAPI, authAPI, marketAPI } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import FarmerVerificationTab from '../components/FarmerVerificationTab';
import { FarmerBottomNav } from '../components/BottomNav';

// Customer Visibility & Price Advisory Calculator Component
const AdvisorySlider = ({ intelligenceData, sliderPrice, setSliderPrice }) => {
  const medianPrice = intelligenceData.median_price || 1;
  const ratio = sliderPrice / medianPrice;
  
  let visibilityText = "";
  let scoreText = "";
  let cardClass = "";
  let adviceText = "";
  
  if (ratio <= 0.8) {
    visibilityText = "Maximum Click-through Boost (+50% Visibility Boost)";
    scoreText = "Excellent (10/10)";
    cardClass = "bg-green-50 border-green-200 text-green-800";
    adviceText = "Pricing below market median attracts rapid buyer attention and boosts recommendation priority in buyer searches.";
  } else if (ratio <= 1.05) {
    visibilityText = "Balanced Visibility (Standard Marketplace Exposure)";
    scoreText = "Good (8/10)";
    cardClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
    adviceText = "Standard competitive pricing. Excellent balance between optimal profit margins and steady listing conversion.";
  } else if (ratio <= 1.25) {
    visibilityText = "Reduced Visibility (-20% Visibility)";
    scoreText = "Fair (6/10)";
    cardClass = "bg-amber-50 border-amber-200 text-amber-800";
    adviceText = "Pricing slightly above median. Visibility is marginally reduced to favor standard market rates. Buyers might hesitate.";
  } else {
    visibilityText = "Low Visibility (-50% Visibility)";
    scoreText = "Poor (3/10)";
    cardClass = "bg-red-50 border-red-200 text-red-800";
    adviceText = "High price might slow down your sales. Consider adding delivery service or group bundles to justify the premium.";
  }

  const minSlider = Math.round(intelligenceData.min_price * 0.5);
  const maxSlider = Math.round(intelligenceData.max_price * 1.5);

  return (
    <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="text-left">
        <h4 className="font-black text-gray-900 flex items-center gap-1.5">
          <Tag size={20} className="text-green-700" /> Customer Visibility & Price Advisory Calculator
        </h4>
        <p className="text-xs text-gray-500 font-semibold mt-0.5">Drag the slider to test how listing your crop at different prices affects your search rank and customer click-through visibility.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-600">Proposed Price:</span>
          <span className="text-3xl font-black text-green-700">&#8377;{sliderPrice}/kg</span>
        </div>
        
        <div className="relative">
          <input 
            type="range" 
            min={minSlider} 
            max={maxSlider} 
            value={sliderPrice} 
            onChange={(e) => setSliderPrice(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
            <span>Min Range: &#8377;{minSlider}</span>
            <span className="text-green-700 border-b border-dashed border-green-500">Market Median: &#8377;{intelligenceData.median_price}</span>
            <span>Max Range: &#8377;{maxSlider}</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${cardClass} space-y-2 transition-all duration-300 text-left`}>
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider">Search Rank Score: <span className="underline">{scoreText}</span></span>
            <span className="text-xs font-black uppercase tracking-wider">{visibilityText}</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed">{adviceText}</p>
        </div>
      </div>
    </div>
  );
};


function MapEventsHandler({ setCoords }) {
  useMapEvents({
    click(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('harvests'); // 'harvests', 'insights', 'verification', 'orders'
  const [products, setProducts] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState(''); // '', 'listening', 'recording', 'success', 'error'
  const [cropVoiceStatus, setCropVoiceStatus] = useState(''); // '', 'listening', 'recording', 'success', 'error'
  const [isCropListening, setIsCropListening] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#orders') {
        setActiveTab('orders');
      } else if (hash === '#insights') {
        setActiveTab('insights');
      } else if (hash === '#verification') {
        setActiveTab('verification');
      } else if (hash === '#harvests') {
        setActiveTab('harvests');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModeSelector, setShowModeSelector] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }
    const userState = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('activeRole');
    if (!role) {
      if (userState.is_farmer && userState.is_buyer) {
        setShowModeSelector(true);
      } else if (userState.is_farmer) {
        localStorage.setItem('activeRole', 'farmer');
      } else if (userState.is_buyer) {
        localStorage.setItem('activeRole', 'buyer');
        navigate('/buyer/search');
      } else if (userState.is_admin) {
        localStorage.setItem('activeRole', 'admin');
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } else if (role !== 'farmer') {
      if (role === 'buyer') {
        navigate('/buyer/search');
      } else if (role === 'admin') {
        navigate('/admin');
      }
    }
  }, [navigate]);

  const handleSwitchRole = (newRole) => {
    localStorage.setItem('activeRole', newRole);
    if (newRole === 'buyer') {
      navigate('/buyer/search');
    } else if (newRole === 'admin') {
      navigate('/admin');
    }
  };

  const selectMode = (mode) => {
    localStorage.setItem('activeRole', mode);
    setShowModeSelector(false);
    if (mode === 'farmer') {
      window.location.reload();
    } else if (mode === 'buyer') {
      navigate('/buyer/search');
    }
  };
  
  // Farm & location preferences
  const [farmLocation, setFarmLocation] = useState({ lat: 10.0, lng: 76.0 });
  const [deliveryPref, setDeliveryPref] = useState({ available: false, rate: 10.0 });
  const [customCoords, setCustomCoords] = useState({ lat: 10.0, lng: 76.0 });
  const [userProfile, setUserProfile] = useState({ name: '', role: '', is_verified: false, verification_status: 'NONE' });
  const [locationPrivacy, setLocationPrivacy] = useState('public');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [pickupLandmark, setPickupLandmark] = useState('');
  const [farmName, setFarmName] = useState('');
  const [confirmingMove, setConfirmingMove] = useState(false);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [pendingChangeMethod, setPendingChangeMethod] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);

  // Add Product form states
  const [newProduct, setNewProduct] = useState({ name: '', price: '', quantity: '', category: 'Produce' });
  const [showAdd, setShowAdd] = useState(false);
  const [priceWarning, setPriceWarning] = useState(null); // { marketAvg: X } or null
  const [loadingPriceCheck, setLoadingPriceCheck] = useState(false);
  const [harvestLocation, setHarvestLocation] = useState('farm');

  // Market Price Comparison states
  const [marketSearch, setMarketSearch] = useState('');
  const [bestPriceData, setBestPriceData] = useState(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [sliderPrice, setSliderPrice] = useState(0);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const [upiId, setUpiId] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);

  // Verification Form states
  const [verificationForm, setVerificationForm] = useState({
    phone: '',
    aadhaar_number: '',
    panchayat_id: ''
  });

  const recognitionRef = useRef(null);
  const cropRecognitionRef = useRef(null);

  // Load farmer performance data when switching to insights tab
  useEffect(() => {
    if (activeTab === 'insights') {
      const fetchPerformance = async () => {
        try {
          setLoadingPerformance(true);
          const res = await marketAPI.getFarmerPerformance();
          setPerformanceData(res.data);
        } catch (err) {
          console.error("Error fetching farmer performance data", err);
        } finally {
          setLoadingPerformance(false);
        }
      };
      fetchPerformance();
    }
  }, [activeTab]);

  // Initialize Speech Recognition for Market Search
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Default to Indian English / mixed

      recognitionRef.current.onstart = () => {
        setVoiceStatus('listening');
        setTimeout(() => {
          setVoiceStatus(prev => prev === 'listening' ? 'recording' : prev);
        }, 800);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const query = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
        setMarketSearch(query);
        handleSearchMarket(query);
        setVoiceStatus('success');
        setTimeout(() => setVoiceStatus(''), 2500);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setVoiceStatus('error');
        setTimeout(() => setVoiceStatus(''), 3000);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'denied') {
          alert('Microphone access is blocked! Please enable it to use voice search.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      setMarketError('');
      recognitionRef.current?.start();
    }
  };

  // Initialize Speech Recognition for Crop Name Dictation
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      cropRecognitionRef.current = new SpeechRecognition();
      cropRecognitionRef.current.continuous = false;
      cropRecognitionRef.current.interimResults = false;
      cropRecognitionRef.current.lang = 'en-IN';

      cropRecognitionRef.current.onstart = () => {
        setCropVoiceStatus('listening');
        setTimeout(() => {
          setCropVoiceStatus(prev => prev === 'listening' ? 'recording' : prev);
        }, 800);
      };

      cropRecognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const query = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
        setNewProduct(prev => ({ ...prev, name: query }));
        checkPriceBenchmark(query, newProduct.price);
        setCropVoiceStatus('success');
        setTimeout(() => setCropVoiceStatus(''), 2500);
        setIsCropListening(false);
      };

      cropRecognitionRef.current.onerror = (event) => {
        console.error('Crop Speech recognition error:', event.error);
        setCropVoiceStatus('error');
        setTimeout(() => setCropVoiceStatus(''), 3000);
        setIsCropListening(false);
        if (event.error === 'not-allowed' || event.error === 'denied') {
          alert('Microphone access is blocked! Please enable it to use crop name dictation.');
        }
      };

      cropRecognitionRef.current.onend = () => {
        setIsCropListening(false);
      };
    }
  }, [newProduct.price]);

  const toggleCropListening = () => {
    if (isCropListening) {
      cropRecognitionRef.current?.stop();
    } else {
      setIsCropListening(true);
      cropRecognitionRef.current?.start();
    }
  };

  useEffect(() => {
    setCustomCoords(farmLocation);
  }, [farmLocation]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const prodRes = await productsAPI.getFarmerProducts();
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || []);
      
      const ordRes = await ordersAPI.getFarmerOrders();
      setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data.orders || []);
      
      const profileRes = await authAPI.sync({});
      if (profileRes.data?.user) {
        const u = profileRes.data.user;
        setUserProfile(u);
        const latVal = u.lat !== null && u.lat !== undefined ? u.lat : 10.0;
        const lngVal = u.lng !== null && u.lng !== undefined ? u.lng : 76.0;
        setFarmLocation({ lat: latVal, lng: lngVal });
        setCustomCoords({ lat: latVal, lng: lngVal });
        setDeliveryPref({
          available: !!u.delivery_available,
          rate: u.delivery_price_per_km !== undefined ? u.delivery_price_per_km : 10.0
        });
        
        setVerificationForm({
          phone: u.phone || '',
          aadhaar_number: u.aadhaar_number || '',
          panchayat_id: u.panchayat_id || ''
        });
        setUpiId(u.upi_id || (u.phone ? u.phone + '@upi' : ''));
        setLocationPrivacy(u.location_privacy || 'public');
        setPickupInstructions(u.pickup_instructions || '');
        setFarmName(u.farm_name || '');
        setPickupLandmark(u.pickup_landmark || '');
        try {
          const histRes = await authAPI.locationHistory();
          if (Array.isArray(histRes.data)) {
            setLocationHistory(histRes.data);
          }
        } catch (histErr) {
          console.warn("Could not load location history:", histErr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Check pricing benchmark client-side to alert about suspicious pricing
  const checkPriceBenchmark = async (prodName, enteredPrice) => {
    if (!prodName || !enteredPrice) return;
    try {
      setLoadingPriceCheck(true);
      const res = await marketAPI.getBest(prodName);
      if (res.data && res.data.price) {
        const marketAvg = res.data.price;
        if (parseFloat(enteredPrice) > marketAvg * 3) {
          setPriceWarning({ marketAvg });
        } else {
          setPriceWarning(null);
        }
      } else {
        setPriceWarning(null);
      }
    } catch (e) {
      // ignore 404s when no benchmark exists
      setPriceWarning(null);
    } finally {
      setLoadingPriceCheck(false);
    }
  };

  // Search market benchmarks & community intelligence
  const handleSearchMarket = async (queryText = marketSearch) => {
    if (!queryText.trim()) return;
    try {
      setLoadingMarket(true);
      setMarketError('');
      setBestPriceData(null);
      setIntelligenceData(null);

      // Fetch dynamic community intelligence
      const intelRes = await marketAPI.getIntelligence(queryText);
      setIntelligenceData(intelRes.data);
      setSliderPrice(intelRes.data.median_price);

      // Fetch benchmark physical market centers (if available)
      try {
        const res = await marketAPI.getBest(queryText);
        setBestPriceData(res.data);
      } catch (err) {
        console.warn("No physical market benchmarks found, proceeding with community intelligence alone.");
      }
    } catch (err) {
      console.error(err);
      setMarketError('Failed to fetch market intelligence details.');
    } finally {
      setLoadingMarket(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!verificationForm.phone) {
      alert('Phone number is mandatory for reputation verification.');
      return;
    }
    try {
      setLoading(true);
      const res = await marketAPI.submitVerification(verificationForm);
      setUserProfile(prev => ({ ...prev, verification_status: res.data.status }));
      alert('Verification details submitted successfully! A Panchayat Market Manager will review them.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit verification details.');
    } finally {
      setLoading(false);
    }
  };

  const startLiveFarmTracking = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracy(accuracy);
        setFarmLocation({ lat: latitude, lng: longitude });
        setCustomCoords({ lat: latitude, lng: longitude });
      },
      (err) => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    alert('Route Simulation tracking preview started! Your coordinates are simulating live movement. Refresh page to stop.');
    return watchId;
  };

  const calculateDistanceJs = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const updateFarmerLocation = async (newLat, newLng, changeMethod = 'Manual Map Pin', forceConfirm = false, accuracyOverride = null) => {
    const currentAccuracy = accuracyOverride !== null ? accuracyOverride : gpsAccuracy;
    if (changeMethod === 'GPS Detection' && currentAccuracy > 100) {
      alert(`Error: GPS accuracy is too low (${currentAccuracy.toFixed(1)}m). Must be within 100 meters.`);
      return;
    }
    
    if (!forceConfirm) {
      const activeStatuses = ['Accepted', 'Packed', 'Out For Delivery', 'Waiting Customer Confirmation'];
      const activeOrdersCount = orders.filter(o => activeStatuses.includes(o.status)).length;
      
      const distance = calculateDistanceJs(farmLocation.lat, farmLocation.lng, newLat, newLng);
      const isLargeMove = distance > 200;
      
      if (activeOrdersCount > 0 || isLargeMove) {
        setPendingCoords({ lat: newLat, lng: newLng });
        setPendingChangeMethod(changeMethod);
        setConfirmingMove(true);
        return;
      }
    }
    
    try {
      setLoading(true);
      const res = await authAPI.sync({
        lat: newLat,
        lng: newLng,
        gps_accuracy: currentAccuracy,
        change_method: changeMethod,
        confirm_active_orders: true
      });
      if (res.data?.user) {
        const u = res.data.user;
        setFarmLocation({ lat: u.lat, lng: u.lng });
        setCustomCoords({ lat: u.lat, lng: u.lng });
        setUserProfile(u);
        alert(`Farm location successfully updated to coordinates (${newLat.toFixed(4)}, ${newLng.toFixed(4)})!`);
        // Refresh history
        const histRes = await authAPI.locationHistory();
        if (Array.isArray(histRes.data)) {
          setLocationHistory(histRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to update farm location', err);
      alert('Error updating farm location: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setConfirmingMove(false);
    }
  };

  const updateDeliveryPreference = async (available, rateVal = deliveryPref.rate) => {
    try {
      setLoading(true);
      const res = await authAPI.sync({
        delivery_available: available,
        delivery_price_per_km: parseFloat(rateVal) || 0
      });
      if (res.data?.user) {
        const u = res.data.user;
        setDeliveryPref({
          available: !!u.delivery_available,
          rate: u.delivery_price_per_km
        });
        alert(`Transportation settings saved! Available: ${u.delivery_available ? 'Yes' : 'No'} (&#8377;${u.delivery_price_per_km}/km)`);
      }
    } catch (err) {
      console.error('Failed to update delivery settings', err);
      alert('Error updating delivery settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      fetchData();
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Error: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleSaveUpiId = async () => {
    if (!upiId.trim()) { alert('Please enter your UPI ID'); return; }
    setSavingUpi(true);
    try {
      await authAPI.sync({ upi_id: upiId.trim() });
      alert('UPI ID saved successfully!');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.msg || err.message));
    } finally {
      setSavingUpi(false);
    }
  };

  const handleSavePrivacySettings = async () => {
    setSavingPrivacy(true);
    try {
      await authAPI.sync({
        location_privacy: locationPrivacy,
        pickup_instructions: pickupInstructions,
        farm_name: farmName,
        pickup_landmark: pickupLandmark
      });
      alert('Privacy & pickup settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings: ' + (err.response?.data?.msg || err.message));
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleConfirmPayment = async (orderId) => {
    if (!window.confirm('Confirm you have received the UPI payment? This will mark the order as Confirmed.')) return;
    try {
      await ordersAPI.farmerConfirm(orderId);
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to remove this product listing?")) return;
    try {
      setLoading(true);
      await productsAPI.deleteProduct(id);
      alert("Product listing removed successfully.");
      fetchData();
    } catch (err) {
      alert("Error: " + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRestockPrompt = async (product) => {
    const defaultQty = product.available_stock !== undefined ? `${product.available_stock} ${product.unit || 'kg'}` : product.quantity;
    const input = prompt(`Enter new quantity for ${product.name} (e.g. 50 kg, 100):`, defaultQty);
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) {
      alert("Quantity must be greater than zero.");
      return;
    }
    
    const qtyMatch = trimmed.match(/^([\d\.\-]+)/);
    if (!qtyMatch) {
      alert("Quantity must be greater than zero.");
      return;
    }
    const qtyVal = parseFloat(qtyMatch[1]);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      alert("Quantity must be greater than zero.");
      return;
    }
    
    try {
      setLoading(true);
      await productsAPI.restock(product.id, trimmed);
      alert(`${product.name} quantity updated to: ${trimmed}`);
      fetchData();
    } catch (err) {
      alert("Failed to restock: " + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Waiting Farmer Confirmation' || status === 'WaitingFarmerConfirmation') return 'bg-amber-100 text-amber-800 border border-amber-300';
    if (status === 'Pending Payment' || status === 'PendingPayment') return 'bg-gray-100 text-gray-600 border border-gray-200';
    if (status === 'Confirmed' || status === 'Accepted' || status === 'ACCEPTED') return 'bg-green-100 text-green-800 border border-green-200';
    if (status === 'Packed') return 'bg-yellow-100 text-yellow-800 border border-yellow-250';
    if (status === 'Shipped' || status === 'Out For Delivery') return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (status === 'Delivered' || status === 'Waiting Customer Confirmation') return 'bg-teal-100 text-teal-800 border border-teal-200';
    if (status === 'Completed') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (status === 'Rejected') return 'bg-red-100 text-red-800 border border-red-200';
    if (status === 'Disputed') return 'bg-red-100 text-red-800 border border-red-250 animate-pulse';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'PendingPayment': 'Pending Payment',
      'Pending Payment': 'Pending Payment',
      'WaitingFarmerConfirmation': 'Awaiting Your Confirmation',
      'Waiting Farmer Confirmation': 'Awaiting Your Confirmation',
      'Confirmed': 'Confirmed',
      'Accepted': 'Accepted',
      'Packed': 'Packed',
      'Shipped': 'Out For Delivery',
      'Out For Delivery': 'Out For Delivery',
      'Delivered': 'Waiting Customer Confirmation',
      'Waiting Customer Confirmation': 'Waiting Customer Confirmation',
      'Completed': 'Completed',
      'Rejected': 'Rejected',
      'Disputed': 'Disputed (Admin Review)',
    };
    return labels[status] || status;
  };

  // Helper to compute HSL color for charts (higher price = greener)
  const getChartColor = (index, total) => {
    const hue = 140 - (index / total) * 60; // 140 is green, 80 is yellow-green
    return `hsl(${hue}, 70%, 45%)`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans text-gray-900">
      {showModeSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Choose Your Mode</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">Select which dashboard interface you'd like to access right now.</p>
            <div className="space-y-3">
              <button onClick={() => selectMode('buyer')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl border-none cursor-pointer transition-all shadow-md">
                🛒 Buyer Mode
              </button>
              <button onClick={() => selectMode('farmer')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl border-none cursor-pointer transition-all shadow-md">
                🌾 Farmer Mode
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 rounded-[2.5rem] p-8 md:p-12 text-white mb-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-[-10%] bottom-[-20%] opacity-15 hidden md:block">
          <Leaf size={300} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              👨‍🌾 Farmer Dashboard
            </span>
            {userProfile.is_verified && (
              <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                <ShieldCheck size={14} /> Verified Farmer
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Welcome Back, {userProfile.name}!</h1>
          <p className="text-green-100 font-semibold text-lg mb-4">Manage your harvests, analyze market trends, and verify your credentials to build neighborhood trust.</p>
          {userProfile.is_buyer && (
            <button 
              onClick={() => handleSwitchRole('buyer')}
              className="bg-white hover:bg-green-50 text-green-800 font-bold px-4 py-2.5 rounded-xl text-sm border-none cursor-pointer shadow-sm transition-all"
            >
              🛒 Switch to Buyer Mode
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto gap-8">
        <button 
          onClick={() => { setActiveTab('harvests'); window.location.hash = 'harvests'; }}
          className={`pb-4 px-1 font-bold text-lg cursor-pointer transition-all border-none bg-transparent ${activeTab === 'harvests' ? 'text-green-700 border-b-4 border-green-700 font-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          My Harvests
        </button>
        <button 
          onClick={() => { setActiveTab('orders'); window.location.hash = 'orders'; }}
          className={`pb-4 px-1 font-bold text-lg cursor-pointer transition-all border-none bg-transparent ${activeTab === 'orders' ? 'text-green-700 border-b-4 border-green-700 font-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          My Orders
        </button>
        <button 
          onClick={() => { setActiveTab('insights'); window.location.hash = 'insights'; }}
          className={`pb-4 px-1 font-bold text-lg cursor-pointer transition-all border-none bg-transparent ${activeTab === 'insights' ? 'text-green-700 border-b-4 border-green-700 font-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Market Insights Guidance
        </button>
        <button 
          onClick={() => { setActiveTab('verification'); window.location.hash = 'verification'; }}
          className={`pb-4 px-1 font-bold text-lg cursor-pointer transition-all border-none bg-transparent ${activeTab === 'verification' ? 'text-green-700 border-b-4 border-green-700 font-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Reputation & Verification
        </button>
      </div>

      {/* ERROR NOTICES */}
      {loading && products.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="text-green-700 animate-spin" />
        </div>
      )}

      {/* TAB CONTENT: HARVESTS */}
      {activeTab === 'harvests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Harvest Listing & Add Form */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Package className="text-green-700" /> Active Harvest Listings
              </h2>
              <button 
                onClick={() => setShowAdd(!showAdd)}
                className="btn btn-primary flex items-center justify-center gap-1.5 font-bold py-3 px-6 shadow-md shadow-green-700/10 cursor-pointer"
              >
                <Plus size={18} /> {showAdd ? 'Close Form' : 'List Harvest'}
              </button>
            </div>

            {/* Add Product Form */}
            {showAdd && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-150 rounded-[2rem] p-8 shadow-sm overflow-hidden"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Sparkles size={20} className="text-green-600 animate-pulse" /> Describe Your Produce
                </h3>
                
                <form onSubmit={async e => {
                  e.preventDefault();
                  
                  // Price validation
                  const priceVal = parseFloat(newProduct.price);
                  if (isNaN(priceVal) || priceVal <= 0) {
                    alert("Price must be greater than zero.");
                    return;
                  }

                  // Quantity validation
                  const qtyStr = (newProduct.quantity || '').trim();
                  if (!qtyStr) {
                    alert("Quantity must be greater than zero.");
                    return;
                  }
                  
                  const qtyMatch = qtyStr.match(/^([\d\.\-]+)/);
                  if (!qtyMatch) {
                    alert("Quantity must be greater than zero.");
                    return;
                  }
                  
                  const qtyVal = parseFloat(qtyMatch[1]);
                  if (isNaN(qtyVal) || qtyVal <= 0) {
                    alert("Quantity must be greater than zero.");
                    return;
                  }
                  
                  try {
                    const finalQty = newProduct.quantity || '1 kg';
                    await productsAPI.add({
                      name: newProduct.name,
                      price: priceVal,
                      quantity: finalQty,
                      category: newProduct.category,
                      lat: customCoords.lat,
                      lng: customCoords.lng
                    });
                    setNewProduct({ name: '', price: '', quantity: '', category: 'Produce' });
                    setPriceWarning(null);
                    setShowAdd(false);
                    fetchData();
                    alert("Harvest successfully listed on the map!");
                  } catch (err) {
                    console.error(err);
                    alert("Failed to list product: " + (err.response?.data?.msg || err.message));
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Crop Name</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={newProduct.name} 
                            onChange={e => {
                              setNewProduct({...newProduct, name: e.target.value});
                              checkPriceBenchmark(e.target.value, newProduct.price);
                            }} 
                            placeholder="e.g. Tomato, Coconut"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold text-gray-800"
                            required
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={toggleCropListening}
                          className={`p-3 rounded-xl border-none cursor-pointer transition-all ${isCropListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                          title="Speak Crop Name"
                        >
                          {isCropListening ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                      </div>
                      {cropVoiceStatus && (
                        <div className="flex items-center gap-2 mt-1 px-1 text-[11px] font-bold">
                          {cropVoiceStatus === 'listening' && (
                            <span className="text-blue-600 flex items-center gap-1 animate-pulse">
                              <Mic size={12} className="animate-bounce" /> Listening...
                            </span>
                          )}
                          {cropVoiceStatus === 'recording' && (
                            <span className="text-red-600 flex items-center gap-1 animate-pulse">
                              <span className="w-2 h-2 bg-red-600 rounded-full inline-block animate-ping" /> Recording...
                            </span>
                          )}
                          {cropVoiceStatus === 'success' && (
                            <span className="text-green-600 flex items-center gap-1">
                              ✅ Voice Captured
                            </span>
                          )}
                          {cropVoiceStatus === 'error' && (
                            <span className="text-red-500 flex items-center gap-1">
                              ❌ Please speak again.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Category</label>
                      <select
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none font-semibold text-gray-700 cursor-pointer"
                      >
                        <option value="Produce">Fresh Vegetables & Fruits</option>
                        <option value="Grains">Grains & Rice</option>
                        <option value="Spices">Spices</option>
                        <option value="Other">Other Goods</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Price (&#8377; / unit)</label>
                      <input 
                        type="number" 
                        min="0.01"
                        step="0.01"
                        value={newProduct.price} 
                        onChange={e => {
                          const val = e.target.value;
                          // Reject negative or zero values immediately
                          if (val !== '' && parseFloat(val) <= 0) {
                            setNewProduct({...newProduct, price: ''});
                            return;
                          }
                          setNewProduct({...newProduct, price: val});
                          checkPriceBenchmark(newProduct.name, val);
                        }} 
                        onKeyDown={e => {
                          if (['-', '+', 'e', 'E'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={e => {
                          const pasted = e.clipboardData.getData('text');
                          if (parseFloat(pasted) <= 0 || isNaN(parseFloat(pasted))) {
                            e.preventDefault();
                          }
                        }}
                        placeholder="e.g. 40"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold text-gray-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Selling Unit / Quantity</label>
                      <input 
                        type="text" 
                        value={newProduct.quantity} 
                        onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} 
                        placeholder="e.g. 1 kg, 1 bunch"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-semibold text-gray-800"
                        required
                      />
                    </div>
                  </div>

                  {/* AI Price Check warning alerts */}
                  {loadingPriceCheck && (
                    <div className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Verifying price benchmarking...
                    </div>
                  )}

                  {priceWarning && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3 text-sm text-orange-850 font-bold items-start animate-fade-in">
                      <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold mb-1">Friendly Suggestion</p>
                        <p className="font-medium leading-relaxed">
                          This price is higher than the local market average of &#8377;{priceWarning.marketAvg}. Reducing it may help you sell faster.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Coordinate Override selector */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 text-xs">
                    <span className="block text-gray-500 font-bold mb-2 uppercase">Harvest Location</span>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2 flex-wrap">
                        <button 
                          type="button" 
                          onClick={() => {
                            setCustomCoords(farmLocation);
                            setHarvestLocation('farm');
                          }}
                          className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer text-[10px] ${harvestLocation === 'farm' ? 'bg-green-700 text-white' : 'bg-white text-gray-700'}`}
                        >
                          My Farm Location
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const { latitude, longitude } = pos.coords;
                                  setCustomCoords({ lat: latitude, lng: longitude });
                                  setHarvestLocation('gps');
                                },
                                () => alert('Could not access GPS. Please enable location permissions.')
                              );
                            } else {
                              alert('Geolocation not supported in this browser.');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer text-[10px] ${harvestLocation === 'gps' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700'}`}
                        >
                          GPS — Detect Now
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setHarvestLocation('manual')}
                          className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer text-[10px] ${harvestLocation === 'manual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                        >
                          Enter Manually
                        </button>
                      </div>
                      {harvestLocation === 'manual' && (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            step="0.0001"
                            placeholder="Latitude (e.g. 10.5276)"
                            onChange={e => setCustomCoords(prev => ({ ...prev, lat: parseFloat(e.target.value) || prev.lat }))}
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-xs"
                          />
                          <input
                            type="number"
                            step="0.0001"
                            placeholder="Longitude (e.g. 76.5623)"
                            onChange={e => setCustomCoords(prev => ({ ...prev, lng: parseFloat(e.target.value) || prev.lng }))}
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-xs"
                          />
                        </div>
                      )}
                      <span className="text-gray-400 font-semibold font-mono text-[10px]">
                        Coordinates: {customCoords.lat.toFixed(4)}, {customCoords.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer border-none flex items-center justify-center gap-1.5"
                  >
                    Confirm Listing
                  </button>
                </form>
              </motion.div>
            )}

            {/* Products Grid */}
            {products.length === 0 && !loading ? (
              <div className="bg-white border border-gray-150 rounded-[2.5rem] p-12 text-center text-gray-500 flex flex-col items-center">
                <Package size={48} className="text-gray-300 mb-4" />
                <p className="font-bold text-lg mb-1">No crops listed</p>
                <p className="text-sm">Click "List Harvest" to begin sharing your yields.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map(p => {
                  const availableLimit = p.available_stock !== undefined ? p.available_stock : parseFloat(p.quantity) || 0;
                  const totalLimit = p.total_stock !== undefined ? p.total_stock : parseFloat(p.quantity) || 0;
                  const reservedLimit = p.reserved_stock !== undefined ? p.reserved_stock : 0;
                  const unitLabel = p.unit || 'kg';
                  return (
                    <div key={p.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                      {availableLimit <= 0 && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[0.5px] z-10 flex items-center justify-center pointer-events-none">
                          <span className="bg-red-650 text-white font-black text-xs uppercase px-4 py-2 rounded-full shadow-lg tracking-widest pointer-events-auto">Out of Stock</span>
                        </div>
                      )}
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-green-50 text-green-700 border border-green-150 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            {p.category}
                          </span>
                          <button 
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer z-25"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{p.name}</h3>
                        
                        {/* Real-time Inventory Specs */}
                        <div className="mt-4 mb-5 space-y-2.5 text-xs font-semibold text-gray-500 text-left bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span>🌾 Current Stock:</span>
                            <span className="text-gray-900 font-bold">{totalLimit} {unitLabel}</span>
                          </div>
                          <div className="flex justify-between items-center text-orange-600">
                            <span>🔒 Reserved Stock:</span>
                            <span className="font-extrabold">{reservedLimit} {unitLabel}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-gray-700 font-bold">📦 Available Stock:</span>
                            <span className={`font-black text-sm ${availableLimit <= 0 ? 'text-red-650' : availableLimit <= 5 ? 'text-amber-600' : 'text-green-700'}`}>
                              {availableLimit} {unitLabel}
                            </span>
                          </div>
                          
                          {/* Warnings & Alerts */}
                          {availableLimit > 0 && availableLimit <= 5 && (
                            <div className="mt-2 text-center py-1 bg-amber-50 text-amber-700 border border-amber-250 rounded-lg text-[9px] font-black uppercase tracking-wider">
                              ⚠ Low Stock Alert
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100 relative z-20">
                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Your Price</span>
                          <span className="text-2xl font-black text-green-700">&#8377;{p.price}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <button 
                            onClick={() => handleRestockPrompt(p)}
                            className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold py-1.5 px-4 rounded-full border-none cursor-pointer shadow-sm transition-all active:scale-95 flex items-center gap-1"
                          >
                            Restock
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Settings & Buyer Orders */}
          <div className="space-y-8">
            
            {/* Quick Stats Panel */}
            <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-700" /> Farm Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                  <span className="block text-2xl font-black text-green-700">{products.length}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Harvests</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                  <span className="block text-2xl font-black text-orange-600">
                    {orders.filter(o => (o.status || '').toLowerCase() === 'completed').length}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Orders Filled</span>
                </div>
              </div>
            </div>

            {/* Farm Location Settings */}
            <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-green-700" /> Farm Location Settings
              </h3>
              
              <div className="space-y-4">
                {/* Interactive Leaflet Map for Pin Placement */}
                <div className="w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200" style={{ height: '280px' }}>
                  <MapContainer center={[customCoords.lat || 10.0, customCoords.lng || 76.0]} zoom={11} style={{ width: '100%', height: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[customCoords.lat || 10.0, customCoords.lng || 76.0]} />
                    <MapEventsHandler setCoords={setCustomCoords} />
                  </MapContainer>
                </div>
                
                <p className="text-[10px] text-gray-400 font-medium text-center">
                  💡 Click anywhere on the map to place your manual farm pin marker.
                </p>

                {/* Kerala boundary warning banner */}
                {((customCoords.lat < 8.15 || customCoords.lat > 12.85) || (customCoords.lng < 74.85 || customCoords.lng > 77.5)) && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-3 text-[10px] font-bold">
                    ⚠️ Note: Naadan primarily serves Kerala. Your selected farm pin is outside the state boundaries.
                  </div>
                )}

                {/* Route Simulation Buttons */}
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setGpsAccuracy(10);
                      setCustomCoords({ lat: 10.0, lng: 76.0 });
                      updateFarmerLocation(10.0, 76.0, 'Simulate Kochi Route');
                    }}
                    className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 text-xs cursor-pointer"
                  >
                    Simulate Kochi Route
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setGpsAccuracy(15);
                      setCustomCoords({ lat: 11.9151, lng: 75.1969 });
                      updateFarmerLocation(11.9151, 75.1969, 'Simulate Kannur Route');
                    }}
                    className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 text-xs cursor-pointer"
                  >
                    Simulate Kannur Route
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const { latitude, longitude, accuracy } = pos.coords;
                            setGpsAccuracy(accuracy);
                            setCustomCoords({ lat: latitude, lng: longitude });
                            updateFarmerLocation(latitude, longitude, 'GPS Detection', false, accuracy);
                          },
                          (err) => {
                            alert("Could not access GPS. Please check location permissions.");
                          },
                          { enableHighAccuracy: true }
                        );
                      } else {
                        alert("Geolocation not supported.");
                      }
                    }}
                    className="flex-1 py-2.5 px-4 bg-green-700 hover:bg-green-800 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm text-xs"
                  >
                    <MapPin size={14} /> Detect My Location (GPS)
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      startLiveFarmTracking();
                    }}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm text-xs"
                  >
                    <Navigation size={14} /> Route Simulation Preview <span className="bg-red-500 text-white text-[8px] px-1 py-0.2 rounded font-mono">SIMULATION</span>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold font-mono">
                    <span>Selected Lat:</span>
                    <span>{customCoords.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold font-mono">
                    <span>Selected Lng:</span>
                    <span>{customCoords.lng.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold font-mono">
                    <span>GPS Fix Accuracy:</span>
                    <span>{gpsAccuracy ? `${gpsAccuracy.toFixed(1)}m` : 'N/A (Map Pin)'}</span>
                  </div>

                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${customCoords.lat},${customCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-green-50 hover:bg-green-100 text-green-700 font-extrabold text-center block rounded-xl text-xs border border-green-200"
                  >
                    🗺️ Verify Farm Location on Google Maps
                  </a>

                  <button 
                    type="button"
                    onClick={() => updateFarmerLocation(customCoords.lat, customCoords.lng, 'Manual Map Pin')}
                    className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white font-black rounded-xl border-none cursor-pointer text-xs"
                  >
                    Confirm & Save Selected Coordinates
                  </button>
                </div>
              </div>
            </div>

            {/* Location History Log Card */}
            <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <History size={20} className="text-blue-600" /> GPS Location History Logs
              </h3>
              {locationHistory.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium italic text-center py-4">No coordinate updates logged yet.</p>
              ) : (
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {locationHistory.map(log => (
                    <div key={log.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span className="font-bold text-gray-700">{log.change_method}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono">
                        From ({log.old_lat?.toFixed(4) || 'N/A'}, {log.old_lng?.toFixed(4) || 'N/A'}) 
                        to ({log.new_lat?.toFixed(4)}, {log.new_lng?.toFixed(4)})
                      </div>
                      {log.change_distance_km > 0 && (
                        <div className="text-[9px] font-bold text-green-700">
                          Shift Distance: {log.change_distance_km.toFixed(2)} km
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transportation Delivery settings */}
            <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Package size={20} className="text-orange-500" /> Transportation Deliveries
              </h3>
              
              <p className="text-xs text-gray-500 font-medium mb-4">Will you transport and deliver harvests directly to buyer locations?</p>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <button 
                  type="button"
                  onClick={() => updateDeliveryPreference(true)}
                  className={`py-3.5 px-3 rounded-xl border text-center font-extrabold text-xs cursor-pointer transition-all ${deliveryPref.available ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  🚚 Available
                </button>
                <button 
                  type="button"
                  onClick={() => updateDeliveryPreference(false)}
                  className={`py-3.5 px-3 rounded-xl border text-center font-extrabold text-xs cursor-pointer transition-all ${!deliveryPref.available ? 'bg-red-700 text-white border-red-700 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  ❌ Pickup Only
                </button>
              </div>

              {deliveryPref.available ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-2 animate-fade-in text-xs">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Delivery Charge (&#8377; per km)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={deliveryPref.rate} 
                      onChange={e => setDeliveryPref({ ...deliveryPref, rate: parseFloat(e.target.value) || 0 })} 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-xs"
                      min="1"
                    />
                    <button 
                      onClick={() => updateDeliveryPreference(true, deliveryPref.rate)}
                      className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-lg text-xs border-none cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-[10px] font-bold text-center">
                  Pickup Only. Buyers must collect directly from farm.
                </div>
              )}
            </div>

            {/* Location Privacy & Pickup Settings Card */}
            <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Eye size={20} className="text-green-700" /> Privacy & Pickup Settings
              </h3>
              
              <div className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                    Location Privacy on Search
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <button 
                      type="button"
                      onClick={() => setLocationPrivacy('public')}
                      className={`py-2 px-3 rounded-xl border text-center font-extrabold text-[11px] cursor-pointer transition-all ${locationPrivacy === 'public' ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      Public (Exact Pin)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLocationPrivacy('approximate')}
                      className={`py-2 px-3 rounded-xl border text-center font-extrabold text-[11px] cursor-pointer transition-all ${locationPrivacy === 'approximate' ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-55'}`}
                    >
                      Approximate
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mb-3 leading-relaxed">
                    Approximate mode hides your exact farm location from guest/buyer search pins until after they place an order.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                      Farm Name
                    </label>
                    <input
                      type="text"
                      value={farmName}
                      onChange={e => setFarmName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg text-gray-800 text-xs font-medium focus:ring-1 focus:ring-green-700 outline-none"
                      placeholder="e.g. Green Valley Farm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                      Pickup Landmark
                    </label>
                    <input
                      type="text"
                      value={pickupLandmark}
                      onChange={e => setPickupLandmark(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg text-gray-800 text-xs font-medium focus:ring-1 focus:ring-green-700 outline-none"
                      placeholder="e.g. Near Panchayat Office"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                    Pickup Instructions
                  </label>
                  <textarea
                    value={pickupInstructions}
                    onChange={e => setPickupInstructions(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg text-gray-800 text-xs font-medium focus:ring-1 focus:ring-green-700 outline-none"
                    placeholder="e.g. Turn left at the big banyan tree, green gate. Ring bell."
                    rows={3}
                  />
                  <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
                    Revealed only to verified buyers of Pickup orders.
                  </p>
                </div>
                
                <button 
                  type="button"
                  onClick={handleSavePrivacySettings}
                  disabled={savingPrivacy}
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white font-extrabold rounded-xl border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm text-xs"
                >
                  {savingPrivacy ? "Saving..." : "Save Privacy & Pickup Settings"}
                </button>
              </div>
            </div>

            {/* Buyer Orders */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag size={20} className="text-orange-500" /> Buyer Orders
              </h3>
              {orders.length === 0 ? (
                <div className="bg-white border border-gray-150 rounded-[2rem] p-6 text-center text-gray-400 font-semibold text-sm">
                  No orders placed yet.
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order #{o.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(o.status)}`}>
                        {getStatusLabel(o.status)}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-gray-900 mb-1">{o.product_name}</h4>
                    <p className="text-gray-500 text-xs font-bold mb-3">Quantity: <span className="text-gray-800">{o.quantity_ordered} unit(s)</span></p>
                    
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs font-medium space-y-1.5 mb-4">
                      <p className="text-gray-700 flex items-center gap-1.5"><User size={12} /> {o.buyer_name}</p>
                      {o.buyer_phone && <p className="text-gray-700 flex items-center gap-1.5"><Phone size={12} /> {o.buyer_phone}</p>}
                      {o.buyer_address && <p className="text-gray-650 flex items-start gap-1"><MapPin size={12} className="shrink-0 mt-0.5" /> {o.buyer_address}</p>}
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase">Amount</span>
                        <span className="text-lg font-black text-green-700">&#8377;{o.total_price}</span>
                      </div>
                      {/* Waiting Farmer Confirmation */}
                      {(o.status === 'WaitingFarmerConfirmation' || o.status === 'Waiting Farmer Confirmation') && (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleOrderStatus(o.id, 'Rejected')}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-extrabold rounded-lg border border-red-200 cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <X size={12} /> Reject
                          </button>
                          <button
                            onClick={() => handleConfirmPayment(o.id)}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <Check size={12} /> Confirm Payment Received
                          </button>
                        </div>
                      )}

                      {/* Accepted: farmer marks as Packed */}
                      {(o.status === 'Accepted' || o.status === 'ACCEPTED' || o.status === 'Confirmed') && (
                        <button
                          onClick={() => handleOrderStatus(o.id, 'Packed')}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer flex items-center gap-1.5"
                        >
                          <Package size={12} /> Mark Packed
                        </button>
                      )}

                      {/* Packed: farmer marks as Out For Delivery */}
                      {o.status === 'Packed' && (
                        <button
                          onClick={() => { if(window.confirm('Mark as Out For Delivery?')) handleOrderStatus(o.id, 'Out For Delivery'); }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer flex items-center gap-1.5"
                        >
                          <Truck size={12} /> Mark Out for Delivery
                        </button>
                      )}

                      {/* Out For Delivery: farmer marks as Waiting Customer Confirmation */}
                      {(o.status === 'Out For Delivery' || o.status === 'Shipped') && (
                        <button
                          onClick={() => { if(window.confirm('Mark as Delivered? This will notify the customer to confirm.')) handleOrderStatus(o.id, 'Waiting Customer Confirmation'); }}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer flex items-center gap-1.5"
                        >
                          <Check size={12} /> Mark Delivered
                        </button>
                      )}

                      {/* Waiting Customer Confirmation: show waiting message */}
                      {(o.status === 'Waiting Customer Confirmation' || o.status === 'Delivered') && (
                        <span className="text-[10px] font-bold text-gray-400">Waiting Customer Confirmation</span>
                      )}

                      {/* Disputed: show admin review message */}
                      {o.status === 'Disputed' && (
                        <span className="text-[10px] font-bold text-red-500 animate-pulse">Disputed - Under Review</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="text-orange-500" /> Buyer Orders
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="bg-white hover:bg-gray-50 text-gray-800 font-bold px-4 py-2.5 rounded-xl text-sm border border-gray-200 cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('harvests');
                  window.location.hash = 'harvests';
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-805 font-bold px-4 py-2.5 rounded-xl text-sm border-none cursor-pointer transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border border-gray-150 rounded-[2rem] p-12 text-center shadow-sm max-w-lg mx-auto mt-10">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <ShoppingBag size={40} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-805 mb-2">No Orders Yet</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Customer orders will appear here once buyers place orders.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={fetchData}
                  className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm border-none cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={16} /> Refresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('harvests');
                    window.location.hash = 'harvests';
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold px-6 py-2.5 rounded-xl text-sm border-none cursor-pointer transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orders.map(o => (
                <div key={o.id} className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order #{o.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(o.status)}`}>
                      {getStatusLabel(o.status)}
                    </span>
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 mb-1">{o.product_name}</h4>
                  <p className="text-gray-500 text-xs font-bold mb-3">Quantity: <span className="text-gray-800">{o.quantity_ordered} unit(s)</span></p>
                  
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs font-medium space-y-1.5 mb-4">
                    <p className="text-gray-700 flex items-center gap-1.5"><User size={12} /> {o.buyer_name}</p>
                    {o.buyer_phone && <p className="text-gray-700 flex items-center gap-1.5"><Phone size={12} /> {o.buyer_phone}</p>}
                    {o.buyer_address && <p className="text-gray-650 flex items-start gap-1"><MapPin size={12} className="shrink-0 mt-0.5" /> {o.buyer_address}</p>}
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <div>
                      <span className="block text-[8px] text-gray-400 uppercase">Amount</span>
                      <span className="text-lg font-black text-green-700">&#8377;{o.total_price}</span>
                    </div>
                    {/* Waiting Farmer Confirmation */}
                    {(o.status === 'WaitingFarmerConfirmation' || o.status === 'Waiting Farmer Confirmation') && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOrderStatus(o.id, 'Rejected')}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-extrabold rounded-lg border border-red-200 cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <X size={12} /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmPayment(o.id)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Check size={12} /> Confirm Payment Received
                        </button>
                      </div>
                    )}

                    {/* Accepted: farmer marks as Packed */}
                    {(o.status === 'Accepted' || o.status === 'ACCEPTED' || o.status === 'Confirmed') && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatus(o.id, 'Packed')}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer flex items-center gap-1.5"
                      >
                        <Package size={12} /> Mark Packed
                      </button>
                    )}

                    {/* Packed: farmer marks as Out For Delivery */}
                    {o.status === 'Packed' && (
                      <button
                        type="button"
                        onClick={() => { if(window.confirm('Mark as Out For Delivery?')) handleOrderStatus(o.id, 'Out For Delivery'); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer flex items-center gap-1.5"
                      >
                        <Truck size={12} /> Mark Out for Delivery
                      </button>
                    )}

                    {/* Out For Delivery: farmer marks as Waiting Customer Confirmation */}
                    {(o.status === 'Out For Delivery' || o.status === 'Shipped') && (
                      <button
                        type="button"
                        onClick={() => { if(window.confirm('Mark as Delivered? This will notify the customer to confirm.')) handleOrderStatus(o.id, 'Waiting Customer Confirmation'); }}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-extrabold rounded-lg border-none cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={12} /> Mark Delivered
                      </button>
                    )}

                    {/* Waiting Customer Confirmation: show waiting message */}
                    {(o.status === 'Waiting Customer Confirmation' || o.status === 'Delivered') && (
                      <span className="text-[10px] font-bold text-gray-400">Waiting Customer Confirmation</span>
                    )}

                    {/* Disputed: show admin review message */}
                    {o.status === 'Disputed' && (
                      <span className="text-[10px] font-bold text-red-500 animate-pulse">Disputed - Under Review</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-8">
          
          {/* 1. Farmer Business Performance Scorecard */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Award className="text-green-700" size={24} /> Farmer Business Scorecard
                </h3>
                <p className="text-sm text-gray-500 font-semibold mt-0.5">Real-time breakdown of your marketplace reputation and performance metrics.</p>
              </div>
              {loadingPerformance && <Loader2 size={20} className="text-green-700 animate-spin" />}
            </div>

            {performanceData ? (
              <div className="space-y-8">
                {/* Scorecard 1: Business Reputation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50/50 border border-green-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-green-800 font-bold uppercase tracking-wider">Total Sales</span>
                    <span className="text-2xl font-black text-green-700 block mt-1">&#8377;{performanceData.total_sales}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">Lifetime completed sales</span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Monthly Revenue</span>
                    <span className="text-2xl font-black text-emerald-700 block mt-1">&#8377;{performanceData.monthly_revenue}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">Last 30 days earnings</span>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-blue-800 font-bold uppercase tracking-wider">Satisfaction Rate</span>
                    {performanceData.total_ratings > 0 && performanceData.satisfaction !== null ? (
                      <>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-2xl font-black text-blue-700">{performanceData.satisfaction}%</span>
                          <Star size={14} className="text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold text-gray-600">({performanceData.average_rating})</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-semibold">{performanceData.total_ratings} customer ratings</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-black text-blue-700 block mt-1">No Ratings Yet</span>
                        <span className="text-[10px] text-gray-400 font-semibold">0 customer ratings</span>
                      </>
                    )}
                  </div>
                  <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-purple-800 font-bold uppercase tracking-wider">Repeat Customers</span>
                    <span className="text-2xl font-black text-purple-700 block mt-1">{performanceData.repeat_buyers}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">Response: <span className="font-bold text-purple-800">{performanceData.response_speed}</span></span>
                  </div>
                </div>

                {/* Scorecard 2: Inventory & Volume Analytics */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="mb-4 text-left">
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-green-700" /> Inventory & Volume Analytics
                    </h4>
                    <p className="text-xs text-gray-450 font-semibold mt-0.5">Summary of physical crop movements, inventory levels, and customer product demand.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
                    <div className="bg-green-50/30 border border-green-100/50 p-4 rounded-2xl">
                      <span className="block text-[10px] text-green-750 font-bold uppercase tracking-wider">Total Quantity Sold</span>
                      <span className="text-xl font-black text-green-700 block mt-1">
                        {performanceData.total_qty_sold !== undefined ? `${performanceData.total_qty_sold} kg` : '0 kg'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">Lifetime volume sold</span>
                    </div>
                    <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl">
                      <span className="block text-[10px] text-emerald-705 font-bold uppercase tracking-wider">Remaining Inventory</span>
                      <span className="text-xl font-black text-emerald-700 block mt-1">
                        {performanceData.remaining_inventory !== undefined ? `${performanceData.remaining_inventory} kg` : '0 kg'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">Available across listings</span>
                    </div>
                    <div className="bg-amber-50/30 border border-amber-100/50 p-4 rounded-2xl">
                      <span className="block text-[10px] text-amber-700 font-bold uppercase tracking-wider">Reserved Inventory</span>
                      <span className="text-xl font-black text-amber-600 block mt-1">
                        {performanceData.reserved_inventory !== undefined ? `${performanceData.reserved_inventory} kg` : '0 kg'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">Committed to active orders</span>
                    </div>
                    <div className="bg-blue-50/30 border border-blue-100/50 p-4 rounded-2xl">
                      <span className="block text-[10px] text-blue-750 font-bold uppercase tracking-wider">Monthly Quantity Sold</span>
                      <span className="text-xl font-black text-blue-700 block mt-1">
                        {performanceData.monthly_qty_sold !== undefined ? `${performanceData.monthly_qty_sold} kg` : '0 kg'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">Volume sold this month</span>
                    </div>
                    <div className="bg-purple-50/30 border border-purple-100/50 p-4 rounded-2xl col-span-2 md:col-span-1">
                      <span className="block text-[10px] text-purple-750 font-bold uppercase tracking-wider">Most Popular Crop</span>
                      <span className="text-lg font-black text-purple-700 block mt-1 truncate" title={performanceData.most_popular_product || "None"}>
                        {performanceData.most_popular_product || "None"}
                      </span>
                      <span className="text-[9px] text-gray-400 font-semibold mt-1 block">Top crop by total demand</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="bg-gray-50 h-24 rounded-2xl border border-gray-100" />
                ))}
              </div>
            )}
          </div>

          {/* 2. Crop Search Input */}
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2">
              <TrendingUp size={28} className="text-green-700" /> Market Guidance Center
            </h2>
            <p className="text-gray-500 font-semibold">
              Farmers keep complete freedom to decide pricing. Use these benchmark insights as supportive local guidance to sell your crops faster.
            </p>
            
            {/* Search Input and Voice group */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                <input 
                  type="text" 
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchMarket()}
                  placeholder="Enter crop name (e.g. Tomato, Coconut)..."
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-green-500 outline-none font-semibold text-gray-800"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => handleSearchMarket()}
                  className="px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-md border-none cursor-pointer transition-all"
                >
                  Search Intelligence
                </button>
                <button 
                  onClick={toggleListening}
                  className={`p-3.5 rounded-2xl border-none cursor-pointer transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  title="Speak to Search"
                >
                  {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
              </div>
            </div>
            {voiceStatus && (
              <div className="flex items-center justify-center gap-2 mt-2 px-2 text-sm font-bold">
                {voiceStatus === 'listening' && (
                  <span className="text-blue-600 flex items-center gap-1 animate-pulse">
                    <Mic size={16} className="animate-bounce" /> Listening...
                  </span>
                )}
                {voiceStatus === 'recording' && (
                  <span className="text-red-600 flex items-center gap-1 animate-pulse">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block animate-ping" /> Recording...
                  </span>
                )}
                {voiceStatus === 'success' && (
                  <span className="text-green-600 flex items-center gap-1">
                    ✅ Voice Captured
                  </span>
                )}
                {voiceStatus === 'error' && (
                  <span className="text-red-500 flex items-center gap-1">
                    ❌ Please speak again.
                  </span>
                )}
              </div>
            )}
            {marketError && <p className="text-sm text-red-600 font-bold">{marketError}</p>}
          </div>

          {loadingMarket && (
            <div className="flex justify-center items-center py-20">
              <Loader2 size={32} className="text-green-700 animate-spin" />
            </div>
          )}

          {/* 3. Market Intelligence Output */}
          {intelligenceData && (
            <div className="space-y-8">
              
              {/* Row 1: Dynamic Market Benchmarks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Benchmark Card 1: Prices */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest block">Community Price Benchmarks</span>
                  <div className="text-center py-2">
                    <span className="text-5xl font-black text-gray-900">&#8377;{intelligenceData.median_price}</span>
                    <span className="text-sm text-gray-500 font-bold block mt-1">Median Selling Price</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-center">
                    <div>
                      <span className="text-xs text-gray-400 font-bold block uppercase">Min listed</span>
                      <span className="font-extrabold text-gray-700">&#8377;{intelligenceData.min_price}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 font-bold block uppercase">Max listed</span>
                      <span className="font-extrabold text-gray-700">&#8377;{intelligenceData.max_price}</span>
                    </div>
                  </div>
                </div>

                {/* Benchmark Card 2: Volume & Listings */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest block mb-2">Marketplace Supply</span>
                    <div className="space-y-3 mt-2">
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                        <span className="text-sm text-gray-500 font-semibold">Active Listings</span>
                        <span className="font-extrabold text-gray-800">{intelligenceData.listings_count} farmers listing</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                        <span className="text-sm text-gray-500 font-semibold">Total Stock</span>
                        <span className="font-extrabold text-green-700">{intelligenceData.total_quantity} kg available</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">Derived from active neighborhood farmer posts.</div>
                </div>

                {/* Benchmark Card 3: Demand & Competition Indicator */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest block">Demand & Competition</span>
                    
                    <div className="space-y-4 mt-3">
                      <div>
                        {/* Demand confidence rule check */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-semibold">
                            {intelligenceData.confidence.startsWith('Low') ? 'Estimated Demand' : 'Demand Indicator'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            intelligenceData.confidence.startsWith('Low') ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {intelligenceData.confidence.startsWith('Low') ? 'Low Confidence' : 'High Confidence'}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline mt-1">
                          <span className="text-2xl font-black text-gray-800">{intelligenceData.demand}</span>
                          <span className="text-xs text-gray-400 font-semibold">
                            Source: {intelligenceData.source}
                          </span>
                        </div>
                        {/* Live activity numbers */}
                        <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-gray-500 font-bold bg-gray-50 p-2 rounded-lg text-center">
                          <div>
                            <span className="block text-gray-400 font-medium text-[9px]">Searches</span>
                            <span>{intelligenceData.analytics_details.searches}</span>
                          </div>
                          <div>
                            <span className="block text-gray-400 font-medium text-[9px]">Cart Adds</span>
                            <span>{intelligenceData.analytics_details.cart_adds}</span>
                          </div>
                          <div>
                            <span className="block text-gray-400 font-medium text-[9px]">Orders</span>
                            <span>{intelligenceData.analytics_details.orders}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                        <span className="text-xs text-gray-500 font-semibold">Competition Level</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          intelligenceData.competition === 'Low' ? 'bg-green-100 text-green-800' :
                          intelligenceData.competition === 'Medium' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>{intelligenceData.competition}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 2: Opportunity Suggestion Alert */}
              <div className="bg-gradient-to-r from-green-50/50 via-emerald-50/30 to-blue-50/20 border-2 border-emerald-200/50 rounded-3xl p-6 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shrink-0">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-left">AI Market Insights & Recommendation</h4>
                  <p className="text-gray-700 font-semibold text-sm mt-1 leading-relaxed text-left">
                    {intelligenceData.opportunity}
                  </p>
                </div>
              </div>

              {/* Row 3: Interactive Advisory Price Slider */}
              <AdvisorySlider intelligenceData={intelligenceData} sliderPrice={sliderPrice} setSliderPrice={setSliderPrice} />

              {/* Row 4: Map & Benchmark Hubs */}
              {bestPriceData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Price Charts */}
                  <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-lg text-gray-900 text-left">Benchmark Panchayat Market Index</h4>
                    <div className="space-y-4">
                      {bestPriceData.all_markets && bestPriceData.all_markets.map((m, idx) => {
                        const totalMarkets = bestPriceData.all_markets.length;
                        const percentage = (m.price / bestPriceData.price) * 100;
                        return (
                          <div key={m.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                              <span>{m.marketName} ({m.location})</span>
                              <span className="text-green-700">&#8377;{m.price}/kg</span>
                            </div>
                            <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${percentage}%`, 
                                  backgroundColor: getChartColor(idx, totalMarkets)
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Leaflet Map of Matching Markets */}
                  <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col justify-between min-h-[400px]">
                    <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-1.5">
                      <MapPin size={20} className="text-green-700" /> Nearby Benchmark Hub Locations
                    </h4>
                    
                    <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-inner relative" style={{ minHeight: '320px' }}>
                      <MapContainer center={[bestPriceData.lat || 10.0, bestPriceData.lng || 76.0]} zoom={9} style={{ width: '100%', height: '100%', borderRadius: '1rem' }}>
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; OpenStreetMap contributors'
                        />
                        {bestPriceData.all_markets && bestPriceData.all_markets.map(m => {
                          if (!m.lat || !m.lng) return null;
                          return (
                            <Marker key={m.id} position={[m.lat, m.lng]}>
                              <Popup>
                                <div className="p-1 font-sans text-xs">
                                  <p className="font-black text-gray-900 text-sm mb-1">{m.marketName}</p>
                                  <p className="text-gray-500 font-semibold mb-1.5">{m.location}</p>
                                  <span className="font-black text-green-700 text-md">&#8377;{m.price}/kg</span>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}
                      </MapContainer>
                    </div>
                  </div>

                </div>
              )}

              {/* Row 5: Transparency & Audit Footer */}
              <div className="bg-gray-50 border border-gray-150 rounded-3xl p-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex flex-col sm:flex-row justify-between gap-2">
                <span>Update Frequency: Real-Time / Community Sourced</span>
                <span>Analysed records: {intelligenceData.listings_count} active listings</span>
                <span>Last Updated: {intelligenceData.updated_at}</span>
              </div>

            </div>
          )}

          {!intelligenceData && !loadingMarket && (
            <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-md max-w-md mx-auto">
              🌾 Search a crop name to check price benchmarks, local demand, and visibility scores.
            </div>
          )}

        </div>
      )}
      {/* TAB CONTENT: VERIFICATION */}
      {activeTab === 'verification' && (
        <FarmerVerificationTab />
      )}

      {/* Large Move / Active Orders warning modal */}
      {confirmingMove && pendingCoords && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-lg font-black text-red-600 flex items-center gap-2">
              ⚠️ Warning: Location Change Advisory
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              You currently have active orders or are shifting your farm by a large distance ({calculateDistanceJs(farmLocation.lat, farmLocation.lng, pendingCoords.lat, pendingCoords.lng).toFixed(1)} km).
            </p>
            <p className="text-xs text-gray-500 font-bold">
              Changing farm location may affect customer navigation, shipping costs, and order tracking. Do you want to proceed?
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setConfirmingMove(false)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-750 font-bold rounded-xl border-none cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => updateFarmerLocation(pendingCoords.lat, pendingCoords.lng, pendingChangeMethod, true)}
                className="flex-1 py-2 bg-red-650 hover:bg-red-700 text-white font-black rounded-xl border-none cursor-pointer text-xs"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
      <FarmerBottomNav orderCount={orders.filter(o => o.status === 'Pending' || o.status === 'PENDING').length} />
    </div>
  );
};

export default FarmerDashboard;
