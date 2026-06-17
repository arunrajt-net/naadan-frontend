import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, ChevronRight, List, Map, MapPin, Minus, Navigation, Plus, Search, ShoppingBag, Trash2, UserCircle2, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { productsAPI, marketAPI } from '../api';
import { BuyerBottomNav } from '../components/BottomNav';
import { CompactBadgeRow, FarmerTrustCard } from '../components/VerificationBadges';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// Leaflet configuration
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom animated marker for user location
const userIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div style="width: 20px; height: 20px; background-color: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(59, 130, 246, 0.9); animation: pulse 2s infinite;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Dynamic emoji resolver based on product name
const getProductEmoji = (name) => {
  const n = name.toLowerCase();
  if (n.includes('tomato') || n.includes('തക്കാളി')) return '🍅';
  if (n.includes('banana') || n.includes('പഴം') || n.includes('ഏത്തപ്പഴം')) return '🍌';
  if (n.includes('coconut') || n.includes('തേങ്ങ') || n.includes('കൊപ്ര')) return '🥥';
  if (n.includes('okra') || n.includes('വെണ്ടയ്ക്ക') || n.includes('lady')) return '🥒';
  if (n.includes('mango') || n.includes('മാങ്ങ')) return '🥭';
  if (n.includes('rice') || n.includes('അരി')) return '🌾';
  if (n.includes('milk') || n.includes('പാൽ')) return '🥛';
  if (n.includes('egg') || n.includes('മുട്ട')) return '🥚';
  if (n.includes('honey') || n.includes('തേൻ')) return '🍯';
  return '🌱'; // default
};

// Custom premium marker builder for products
const produceIcon = (productName) => L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div style="width: 38px; height: 38px; background-color: #1b5e20; border-radius: 50%; border: 3px solid white; box-shadow: 0 6px 12px rgba(27, 94, 32, 0.35); display: flex; align-items: center; justify-content: center; font-size: 20px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">${getProductEmoji(productName)}</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

// Helper component to recenter map when location changes seamlessly
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}


// Validate that farmer location is on land (basic bounding box for Kerala/India)
const isValidFarmerLocation = (lat, lng) => {
  if (!lat || !lng) return false;
  if (lat < 6 || lat > 37 || lng < 68 || lng > 97) return false; // Outside India
  // Kerala bounding box (more precise)
  if (lat < 8.0 || lat > 12.8 || lng < 74.8 || lng > 77.6) return false;
  return true;
};

const BuyerSearch = () => {
  const navigate = useNavigate();
  const [radius, setRadius] = useState(50);
  const [viewMode, setViewMode] = useState('map'); // mobile toggle
  const [centerPosition, setCenterPosition] = useState([10.0, 76.0]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  
  // Cart State
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [deliveryType, setDeliveryType] = useState('Pickup');
  
  const [showModeSelector, setShowModeSelector] = useState(false);
  const userProfile = JSON.parse(localStorage.getItem('user') || '{}');

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
      } else if (userState.is_buyer) {
        localStorage.setItem('activeRole', 'buyer');
      } else if (userState.is_farmer) {
        localStorage.setItem('activeRole', 'farmer');
        navigate('/farmer/dashboard');
      } else if (userState.is_admin) {
        localStorage.setItem('activeRole', 'admin');
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } else if (role !== 'buyer') {
      if (role === 'farmer') {
        navigate('/farmer/dashboard');
      } else if (role === 'admin') {
        navigate('/admin');
      }
    }
  }, [navigate]);

  const handleSwitchRole = (newRole) => {
    localStorage.setItem('activeRole', newRole);
    if (newRole === 'farmer') {
      navigate('/farmer/dashboard');
    } else if (newRole === 'admin') {
      navigate('/admin');
    }
  };

  const selectMode = (mode) => {
    localStorage.setItem('activeRole', mode);
    setShowModeSelector(false);
    if (mode === 'buyer') {
      window.location.reload();
    } else if (mode === 'farmer') {
      navigate('/farmer/dashboard');
    }
  };

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Debounced search query event logging
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    const delayDebounceFn = setTimeout(() => {
      marketAPI.logEvent('search', { crop: searchQuery.trim() })
        .catch(err => console.error("Error logging search event", err));
    }, 1000);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Listener for bottom-nav cart clicks
  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener('openCart', handleOpenCart);
    return () => window.removeEventListener('openCart', handleOpenCart);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCenterPosition([latitude, longitude]);
          fetchNearby(latitude, longitude, radius);
        },
        (err) => {
          console.error("GPS blocked, using default map center");
          fetchNearby(10.0, 76.0, radius);
        }
      );
    } else {
      fetchNearby(10.0, 76.0, radius);
    }
  }, [radius]);

  const fetchNearby = async (lat, lng, r) => {
    try {
      setLoading(true);
      const res = await productsAPI.getNearby(lat, lng, r);
      let prods = Array.isArray(res.data) ? res.data : res.data.products || [];
      
      // If no products found, expand search radius progressively
      if (prods.length === 0 && r < 200) {
        const expandedRadius = r * 2 > 200 ? 200 : r * 2;
        const res2 = await productsAPI.getNearby(lat, lng, expandedRadius);
        const prods2 = Array.isArray(res2.data) ? res2.data : res2.data.products || [];
        if (prods2.length > 0) {
          prods = prods2;
          console.log(`Expanded radius to ${expandedRadius}km, found ${prods2.length} products`);
        }
      }
      
      setProducts(prods);
    } catch (err) {
      console.error('Failed to fetch nearby products', err);
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = (product) => {
    setSelectedProduct(product);
    setOrderQty(1);
    setDeliveryType('Pickup');
    marketAPI.logEvent('view', { crop: product.name })
      .catch(err => console.error("Error logging view event", err));
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    const existing = cart.find(item => item.id === selectedProduct.id);
    const currentQtyInCart = existing ? existing.order_qty : 0;
    const newQtyTotal = currentQtyInCart + orderQty;
    
    if (newQtyTotal > selectedProduct.available_stock) {
      alert(`Cannot add to cart. Only ${selectedProduct.available_stock} ${selectedProduct.unit || 'kg'} currently available, and you already have ${currentQtyInCart} in your cart.`);
      return;
    }

    // Log event
    marketAPI.logEvent('cart_add', { crop: selectedProduct.name })
      .catch(err => console.error("Error logging cart_add event", err));

    let newCart;
    const estDeliveryFee = deliveryType === 'Delivery' ? Math.round(selectedProduct.distance_km * selectedProduct.delivery_price_per_km) : 0;
    
    if (existing) {
      newCart = cart.map(item => 
        item.id === selectedProduct.id 
          ? { ...item, order_qty: item.order_qty + orderQty, delivery_type: deliveryType, delivery_fee: estDeliveryFee }
          : item
      );
    } else {
      newCart = [
        ...cart, 
        { 
          ...selectedProduct, 
          order_qty: orderQty, 
          delivery_type: deliveryType,
          delivery_fee: estDeliveryFee,
          emoji: getProductEmoji(selectedProduct.name)
        }
      ];
    }
    setCart(newCart);
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const updateCartQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    
    const nextQty = item.order_qty + delta;
    if (delta > 0 && nextQty > item.available_stock) {
      alert(`Only ${item.available_stock} ${item.unit || 'kg'} currently available for ${item.name}.`);
      return;
    }
    
    const newCart = cart.map(item => {
      if (item.id === id) {
        return nextQty > 0 ? { ...item, order_qty: nextQty } : item;
      }
      return item;
    });
    setCart(newCart);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.order_qty), 0);

  const sortedProducts = [...products]
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.farmer_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      return a.distance_km - b.distance_km;
    });

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-gray-50 relative font-sans">
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
      
      {/* MOBILE FLOATING MAP/LIST TOGGLE - floats above bottom nav */}
      <div className="lg:hidden fixed left-1/2 -translate-x-1/2 z-[1001]" style={{ bottom: "calc(72px + env(safe-area-inset-bottom) + 16px)" }}>
         <motion.button
           initial={{ opacity: 0, y: 20, scale: 0.85 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.2 }}
           whileHover={{ scale: 1.06 }}
           whileTap={{ scale: 0.94 }}
           onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
           className="map-fab-toggle flex items-center gap-2.5 border-none cursor-pointer text-sm"
           title={viewMode === 'map' ? 'View as list' : 'View nearby farms on map'}
           aria-label={viewMode === 'map' ? 'Switch to list view' : 'Open map â View Nearby Farms'}
         >
           {viewMode === 'map'
             ? <><List size={18} strokeWidth={2.5} /><span>List View</span></>
             : <><Map size={18} strokeWidth={2.5} /><span>View Nearby Farms</span></>
           }
         </motion.button>
      </div>

      {/* FLOATING CART TRIGGER */}
      {cart.length > 0 && !isCartOpen && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed right-5 z-[1002] bg-green-700 hover:bg-green-800 text-white font-extrabold rounded-full w-16 h-16 shadow-2xl flex items-center justify-center border-none cursor-pointer cart-fab-pulse"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom) + 80px)" }}
          title="Open Cart"
          aria-label="Open shopping cart"
        >
          <div className="relative">
            <ShoppingBag size={26} />
            <span className="absolute top-[-8px] right-[-8px] bg-orange-500 text-white text-xs font-black rounded-full h-5 w-5 flex items-center justify-center border border-white">
              {cart.reduce((sum, item) => sum + item.order_qty, 0)}
            </span>
          </div>
        </button>
      )}

      {/* LEFT SIDEBAR - SEARCH & LISTINGS */}
      <AnimatePresence mode="wait">
        {(viewMode === 'list' || window.innerWidth >= 1024) && (
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className={`w-full lg:w-[460px] h-full bg-white border-r border-gray-150 flex flex-col z-10 shrink-0 ${viewMode !== 'list' ? 'hidden lg:flex' : 'flex'}`}
          >
             {/* Search Header */}
             <div className="p-6 border-b border-gray-150 space-y-4">
               {userProfile.is_farmer && (
                 <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex justify-between items-center mb-2">
                   <div className="text-left">
                     <span className="block text-xs font-black text-green-800 uppercase tracking-wide">Farmer Account Active</span>
                     <span className="block text-[11px] text-green-600 font-semibold mt-0.5">You can switch modes to sell produce.</span>
                   </div>
                   <button 
                     onClick={() => handleSwitchRole('farmer')}
                     className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl border-none cursor-pointer shadow-sm transition-all"
                   >
                     🌾 Sell Mode
                   </button>
                 </div>
               )}
               <div className="relative">
                 <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="Search fresh harvests nearby..." 
                   className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:border-green-500 focus:bg-white outline-none font-semibold text-gray-800 transition-all"
                 />
               </div>

               <div className="space-y-3">
                 <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                   <span>Radius: {radius} km</span>
                   <span>Sort By</span>
                 </div>
                 
                 <div className="flex gap-4 items-center justify-between">
                   <input 
                     type="range" 
                     min="1" 
                     max="100" 
                     value={radius} 
                     onChange={e => setRadius(parseInt(e.target.value))} 
                     className="w-1/2 accent-green-600 cursor-pointer h-1.5 bg-gray-100 rounded-lg appearance-none"
                   />
                   
                   <div className="flex gap-1.5">
                     <button 
                       onClick={() => setSortBy('distance')}
                       className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${sortBy === 'distance' ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                     >
                       📍 Distance
                     </button>
                     <button 
                       onClick={() => setSortBy('price')}
                       className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${sortBy === 'price' ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                     >
                       &#8377; Price
                     </button>
                   </div>
                 </div>

                 {/* Location Switch Override for Testing */}
                 <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-2">
                   <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                     <span>Search Center Location</span>
                   </div>
                   
                   <div className="flex gap-2">
                     <button
                       type="button"
                       onClick={() => {
                         setCenterPosition([10.0, 76.0]);
                         fetchNearby(10.0, 76.0, radius);
                       }}
                       className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl text-[10px] cursor-pointer"
                     >
                       Centering: Kochi
                     </button>
                     <button
                       type="button"
                       onClick={() => {
                         setCenterPosition([11.9151, 75.1969]);
                         fetchNearby(11.9151, 75.1969, radius);
                       }}
                       className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl text-[10px] cursor-pointer"
                     >
                       Centering: Kannur
                     </button>
                   </div>

                   <button
                     type="button"
                     onClick={() => {
                       if (navigator.geolocation) {
                         navigator.geolocation.getCurrentPosition(
                           (pos) => {
                             const { latitude, longitude } = pos.coords;
                             setCenterPosition([latitude, longitude]);
                             fetchNearby(latitude, longitude, radius);
                             alert("Map centered on your GPS coordinates!");
                           },
                           (err) => {
                             alert("Could not access GPS. Please check location permissions.");
                           }
                         );
                       } else {
                         alert("Geolocation not supported.");
                       }
                     }}
                     className="w-full py-2.5 px-4 bg-green-700 hover:bg-green-800 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm text-xs"
                   >
                     📡 Detect My Location (GPS)
                   </button>
                 </div>
               </div>
             </div>

             {/* Dynamic Product Cards */}
             <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA] pb-24 lg:pb-6">
                {loading ? (
                  <div className="flex flex-col gap-6 animate-pulse">
                     {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-[2rem]" />)}
                  </div>
                ) : sortedProducts.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                       <MapPin className="h-9 w-9 text-gray-300" />
                    </div>
                    <p className="font-bold text-xl text-gray-700 mb-2">No produce found</p>
                    <p className="text-sm">Try expanding your {radius}km search radius.</p>
                  </div>
                ) : (
                  sortedProducts.map((p, i) => (
                    <motion.div 
                      key={p.id} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-[2rem] p-6 shadow-md border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-50 to-transparent opacity-50 rounded-bl-[80px] pointer-events-none -z-10 group-hover:scale-110 transition-transform" />
                      
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                          <span className="text-3xl mb-2 block">{getProductEmoji(p.name)}</span>
                          <h3 className="font-bold text-xl text-gray-900 leading-tight tracking-tight">{p.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[10px] font-black tracking-widest text-green-700 uppercase bg-green-50 px-2.5 py-1 rounded-md inline-block border border-green-200">{p.category}</span>
                            {p.available_stock <= 0 ? (
                              <span className="text-[10px] font-black tracking-widest text-red-650 uppercase bg-red-50 px-2.5 py-1 rounded-md inline-block border border-red-200">
                                Out of Stock
                              </span>
                            ) : p.available_stock <= 5 ? (
                              <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase bg-amber-50 px-2.5 py-1 rounded-md inline-block border border-amber-200 animate-pulse">
                                ⚠ Low Stock ({p.available_stock} {p.unit || 'kg'})
                              </span>
                            ) : (
                              <span className="text-[10px] font-black tracking-widest text-green-750 uppercase bg-green-50 px-2.5 py-1 rounded-md inline-block border border-green-200">
                                {p.available_stock} {p.unit || 'kg'} Available
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-green-700">&#8377;{p.price}</span>
                          <p className="text-xs font-bold text-gray-400 mt-0.5">per {p.quantity}</p>
                        </div>
                      </div>
                      
                      {/* Farmer reputation info with verified badge check */}
                      <div className="flex flex-wrap items-center justify-between mb-3 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 gap-1.5">
                         <div className="flex flex-col gap-1 text-xs font-bold text-gray-750">
                           <div className="flex items-center gap-1.5 flex-wrap">
                             <UserCircle2 size={16} className="text-gray-400" /> 
                             <span className="text-gray-900 font-bold mr-1">{p.farmer_name}</span>
                             <CompactBadgeRow farmer={{
                               phone_verified: p.farmer_phone_verified,
                               farm_verified: p.farmer_farm_verified,
                               community_verified: p.farmer_community_verified,
                               trust_score: p.farmer_trust_score
                             }} />
                           </div>
                           <div className="flex items-center gap-2 text-[9px] text-gray-500 font-semibold pl-5 mt-0.5">
                             <span className="text-amber-500 font-extrabold">★ {p.farmer_rating_count > 0 && p.farmer_rating !== null ? p.farmer_rating : "No Ratings"}</span>
                             <span className="text-gray-300">|</span>
                             <span>📦 {p.farmer_completed_orders || 0} orders</span>
                             <span className="text-gray-300">|</span>
                             <span className="text-blue-600 font-bold">⚡ Fast Response</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-1 text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                           <Navigation size={12} /> {p.distance_km} km
                         </div>
                      </div>
                      
                      {/* Farm location area (Town, District, Distance) */}
                      <div className="mb-3.5 flex items-center justify-between px-4 py-2.5 bg-green-50/50 rounded-2xl border border-green-100 text-xs font-bold text-gray-750">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-green-700 shrink-0" />
                          <span>{p.farmer_town || "Kerala"}, {p.farmer_district || "Naadan"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-800">
                          <Navigation size={12} className="shrink-0" />
                          <span>{p.distance_km} km away</span>
                        </div>
                      </div>
                      
                      {/* Delivery Availability Badge */}
                      <div className="mb-2 text-xs font-bold flex items-center gap-1.5 px-1">
                        {p.delivery_available ? (
                          <span className="text-green-700 bg-green-50 border border-green-200 py-1.5 px-3 rounded-xl flex items-center gap-1.5 w-full">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                            🚚 Delivery Available: &#8377;{p.delivery_price_per_km}/km (Est: {Math.round(p.distance_km * 3)}m)
                          </span>
                        ) : (
                          <span className="text-gray-500 bg-gray-100 border border-gray-200 py-1.5 px-3 rounded-xl flex items-center gap-1.5 w-full">
                            📍 Pickup Only (collect from farm)
                          </span>
                        )}
                      </div>

                      {/* Payment Method Badge */}
                      <div className="mb-4 text-xs font-bold flex items-center gap-1.5 px-1">
                        {p.farmer_payment_methods === 'UPI_ONLY' ? (
                          <span className="text-purple-700 bg-purple-50 border border-purple-200 py-1.5 px-3 rounded-xl flex items-center gap-1.5 w-full">
                            💳 UPI Payments Only
                          </span>
                        ) : p.farmer_payment_methods === 'COD_ONLY' ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-xl flex items-center gap-1.5 w-full">
                            💵 Cash on Delivery Only
                          </span>
                        ) : p.farmer_payment_methods === 'BOTH' ? (
                          <span className="text-blue-700 bg-blue-50 border border-blue-200 py-1.5 px-3 rounded-xl flex items-center gap-1.5 w-full">
                            💳 + 💵 UPI &amp; Cash on Delivery
                          </span>
                        ) : null}
                      </div>
                      
                      {p.available_stock <= 0 ? (
                        <button 
                          disabled
                          className="w-full relative flex items-center justify-center gap-2 bg-gray-300 text-gray-500 py-3.5 rounded-xl font-bold text-sm border-none cursor-not-allowed"
                        >
                          ❌ Out of Stock
                        </button>
                      ) : (
                        <button 
                          onClick={() => openCheckout(p)}
                          className="w-full relative flex items-center justify-center gap-2 bg-gray-900 hover:bg-green-750 text-white py-3.5 rounded-xl font-bold text-sm overflow-hidden transition-colors border-none cursor-pointer"
                        >
                          <ShoppingBag size={16} /> Choose & Buy
                          <ChevronRight size={16} className="group-hover:translate-x-1.5 transition-transform opacity-50 absolute right-4" />
                        </button>
                      )}
                    </motion.div>
                  ))
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT PANEL - PREMIUM MAP VIEW */}
      <div className={`flex-1 h-full w-full relative z-0 ${viewMode !== 'map' ? 'hidden lg:block' : 'block'}`}>
        <MapContainer center={centerPosition} zoom={13} zoomControl={false} scrollWheelZoom={true} className="h-full w-full">
          <MapUpdater center={centerPosition} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Buyer Location */}
          <Marker position={centerPosition} icon={userIcon}>
            <Popup className="shadow-2xl rounded-3xl border-0">
              <div className="text-center font-bold text-gray-900 px-3 py-1.5 text-xs tracking-wider uppercase">YOUR LOCATION</div>
            </Popup>
          </Marker>

          {/* Product Pins */}
          {sortedProducts.map(p => {
            if (!p.lat || !p.lng) return null;
            return (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={produceIcon(p.name)}>
                <Popup className="shadow-2xl rounded-3xl border-0">
                  <div className="p-3 font-sans text-xs">
                    <span className="text-2xl mb-1 block">{getProductEmoji(p.name)}</span>
                    <h3 className="font-black text-gray-900 text-sm mb-1">{p.name}</h3>
                    <p className="text-green-700 font-extrabold text-md mb-2">&#8377;{p.price} <span className="text-[10px] text-gray-400 font-medium">/ per {p.quantity}</span></p>
                                        <p className="text-gray-550 font-bold mb-1">Farmer: {p.farmer_name}</p>
                    <p className="text-gray-550 font-semibold mb-2 flex items-center gap-1">
                      <MapPin size={12} className="text-green-700" />
                      {p.farmer_town || "Kerala"}, {p.farmer_district || "Naadan"} ({p.distance_km} km)
                    </p>
                    {p.location_privacy === "approximate" && (
                      <p className="text-[10px] text-gray-405 italic mb-2">Marker displays general farm area for privacy.</p>
                    )}
                    <div className="mb-3">
                      <CompactBadgeRow farmer={{
                        phone_verified: p.farmer_phone_verified,
                        farm_verified: p.farmer_farm_verified,
                        community_verified: p.farmer_community_verified,
                        trust_score: p.farmer_trust_score
                      }} />
                    </div>
                    <button 
                      disabled={p.available_stock <= 0}
                      onClick={() => openCheckout(p)}
                      className={`w-full font-bold py-2 rounded-xl text-center text-[10px] border-none cursor-pointer transition-colors ${p.available_stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-700 hover:bg-green-800 text-white'}`}
                    >
                      {p.available_stock <= 0 ? 'Out of Stock' : 'Choose Product'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* PRODUCT CHECKOUT POPUP */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setSelectedProduct(null)} />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg border border-gray-100 shadow-2xl relative z-10 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="text-4xl p-2 bg-gray-50 rounded-2xl">{getProductEmoji(selectedProduct.name)}</span>
                  <div>
                    <h3 className="font-extrabold text-2xl text-gray-900 leading-tight">{selectedProduct.name}</h3>
                    <span className="text-[10px] font-black tracking-widest text-green-700 bg-green-50 px-2 py-0.5 rounded uppercase mt-1 inline-block">{selectedProduct.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full border-none bg-transparent cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Product Pricing Box */}
              <div className="flex justify-between items-baseline bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-sm font-bold text-gray-500">Unit Price</span>
                <span className="text-2xl font-black text-green-700">&#8377;{selectedProduct.price} <span className="text-xs text-gray-400 font-medium">/ per {selectedProduct.quantity}</span></span>
              </div>
              <div className="flex justify-between items-baseline bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-sm font-bold text-gray-500">Available Stock</span>
                <span className={`text-md font-black ${selectedProduct.available_stock <= 5 ? 'text-amber-600 animate-pulse' : 'text-green-750'}`}>{selectedProduct.available_stock} {selectedProduct.unit || 'kg'}</span>
              </div>

              {/* Farmer Trust Profile */}
              <FarmerTrustCard farmer={{
                phone_verified: selectedProduct.farmer_phone_verified,
                farm_verified: selectedProduct.farmer_farm_verified,
                community_verified: selectedProduct.farmer_community_verified,
                farm_verification_status: selectedProduct.farmer_farm_verification_status,
                community_doc_status: selectedProduct.farmer_community_doc_status,
                trust_score: selectedProduct.farmer_trust_score,
                average_rating: selectedProduct.farmer_rating,
                total_ratings: selectedProduct.farmer_rating_count || 0,
                completed_orders_count: selectedProduct.farmer_completed_orders,
                response_speed: 'Fast'
              }} />

              {/* Quantity Select */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Select Quantity</label>
                <div className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-2xl border border-gray-150 w-fit">
                  <button 
                    onClick={() => orderQty > 1 && setOrderQty(orderQty - 1)}
                    className="p-2 bg-white hover:bg-red-50 rounded-xl text-gray-600 border border-gray-200 cursor-pointer shadow-sm"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-black text-xl text-gray-800 px-4 min-w-[32px] text-center">{orderQty}</span>
                  <button 
                    onClick={() => {
                      if (orderQty >= selectedProduct.available_stock) {
                        alert(`Only ${selectedProduct.available_stock} ${selectedProduct.unit || 'kg'} currently available.`);
                        return;
                      }
                      setOrderQty(orderQty + 1);
                    }}
                    className="p-2 bg-white hover:bg-green-50 rounded-xl text-gray-600 border border-gray-200 cursor-pointer shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Delivery Preferences Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Fulfillment Option</label>
                {selectedProduct.delivery_available ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setDeliveryType('Pickup')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold cursor-pointer transition-all ${deliveryType === 'Pickup' ? 'bg-green-700 text-white border-green-700 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      Farm Pickup
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDeliveryType('Delivery')}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold cursor-pointer transition-all ${deliveryType === 'Delivery' ? 'bg-green-700 text-white border-green-700 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      🚚 Request Delivery
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-900 border border-amber-200 py-3.5 px-4 rounded-xl text-sm font-bold flex items-center gap-2">
                    📍 Pickup Only - Customer must collect product from farm.
                  </div>
                )}
              </div>

              {/* Total and Add to Cart Button */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-6">
                <div>
                  <span className="text-xs font-bold text-gray-400">Subtotal</span>
                  <p className="text-3xl font-black text-green-750">
                    &#8377;{(selectedProduct.price * orderQty) + (deliveryType === 'Delivery' ? Math.round(selectedProduct.distance_km * selectedProduct.delivery_price_per_km) : 0)}
                  </p>
                  {deliveryType === 'Delivery' && (
                    <span className="text-[10px] text-gray-400 font-bold block">Includes delivery charge: &#8377;{Math.round(selectedProduct.distance_km * selectedProduct.delivery_price_per_km)}</span>
                  )}
                </div>
                <button 
                  onClick={handleAddToCart}
                  className="btn btn-primary font-bold py-4 px-8 shadow-lg shadow-green-700/30 flex items-center gap-2 border-none cursor-pointer"
                >
                  <Check size={18} /> Add to Cart
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SLIDING CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[9990] flex justify-end bg-black/30 backdrop-blur-sm">
            {/* Backdrop click closer */}
            <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-gray-100 z-10 flex flex-col"
            >
              {/* Cart Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#1b5e20] text-white">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={24} />
                  <h3 className="font-extrabold text-xl">Your Shopping Cart</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-white border-none bg-transparent cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center h-full">
                    <ShoppingBag size={64} className="text-gray-300 mb-4 animate-bounce" />
                    <p className="font-bold text-lg text-gray-600 mb-1">Your cart is empty</p>
                    <p className="text-sm">Browse our map and add fresh items to get started!</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <motion.div 
                      key={item.id}
                      layout
                      className="bg-white rounded-2xl p-4 border border-gray-150 shadow-sm flex items-center gap-4 relative"
                    >
                      <span className="text-3xl p-2.5 bg-gray-50 rounded-xl">{item.emoji}</span>
                      
                      <div className="flex-1 min-w-0 pr-6">
                        <h4 className="font-bold text-gray-900 truncate text-base">{item.name}</h4>
                        <p className="text-xs text-gray-500 font-semibold mb-2">Farmer: {item.farmer_name}</p>
                        <div className="flex items-center justify-between gap-4 mt-2">
                          <p className="text-sm font-black text-green-700">&#8377;{item.price} <span className="text-xs text-gray-400 font-medium">/ unit</span></p>
                          
                          {/* Horizontal Quantity Modifier */}
                          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-150">
                            <button 
                              onClick={() => item.order_qty > 1 ? updateCartQty(item.id, -1) : removeFromCart(item.id)}
                              className="p-1.5 bg-white hover:bg-red-50 rounded-lg text-gray-600 border border-gray-200 cursor-pointer flex items-center justify-center"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="font-black text-xs text-gray-800 px-1 min-w-[14px] text-center">{item.order_qty}</span>
                            <button 
                              onClick={() => updateCartQty(item.id, 1)}
                              className="p-1.5 bg-white hover:bg-green-50 rounded-lg text-gray-600 border border-gray-200 cursor-pointer flex items-center justify-center"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                        {item.available_stock !== undefined && item.order_qty > item.available_stock && (
                          <span className="text-[9px] font-black text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-200 block text-center mt-2 animate-pulse">
                            ⚠️ Exceeds Available Stock ({item.available_stock} left)
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 border-none bg-transparent cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="p-6 bg-white border-t border-gray-150 shadow-[0_-8px_30px_rgb(0,0,0,0.02)]">
                  <div className="flex justify-between items-baseline mb-6">
                    <span className="text-sm font-bold text-gray-500">Cart Subtotal</span>
                    <span className="text-3xl font-black text-green-700">&#8377;{cartTotal}</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setCart([])}
                      className="btn bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 font-bold border-none py-4 px-4 flex-1 cursor-pointer"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        navigate('/buyer/checkout');
                      }}
                      className="btn btn-primary font-bold py-4 px-6 flex-[2] flex items-center justify-center gap-2 shadow-lg shadow-green-700/20 active:scale-95 transition-all cursor-pointer"
                    >
                      Checkout <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BuyerBottomNav cartCount={cart.reduce((sum, item) => sum + item.order_qty, 0)} />
    </div>
  );
};

export default BuyerSearch;
