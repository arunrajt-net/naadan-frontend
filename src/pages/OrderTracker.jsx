import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, CheckCircle2, Clock, Home, MapPin, MessageSquare, Navigation, Package, Phone, User, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { ordersAPI, marketAPI } from '../api';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
// Leaflet marker configurations
const buyerIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div style="width: 20px; height: 20px; background-color: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(59, 130, 246, 0.9);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const farmerIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div style="width: 32px; height: 32px; background-color: #1b5e20; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(27, 94, 32, 0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">🌾</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Dynamic Rider Icon Builder based on delivery selection
const getRiderIcon = (type) => {
  let emoji = '🏍️';
  if (type === 'bicycle') emoji = '🚴';
  if (type === 'auto') emoji = '🛺';
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div style="width: 36px; height: 36px; background-color: #fb8f00; border-radius: 50%; border: 3px solid white; box-shadow: 0 6px 15px rgba(251, 143, 0, 0.5); display: flex; align-items: center; justify-content: center; font-size: 20px; animation: bounce 1s infinite alternate;">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

function MapFocus({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default 
// Note: GPS tracking is simulated for demonstration purposes.
// Coordinates and route are interpolated along an OSRM driving route between the farmer and buyer.
// Real-time GPS tracking requires the Naadan mobile application.

function OrderTracker() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const deliveryVehicle = localStorage.getItem('deliveryVehicle') || 'motorcycle';
  
  const [farmerCoords, setFarmerCoords] = useState([10.012, 76.025]);
  const [buyerCoords, setBuyerCoords] = useState([10.028, 76.042]);
  const [routePath, setRoutePath] = useState([
    [10.012, 76.025],
    [10.015, 76.029],
    [10.018, 76.032],
    [10.021, 76.035],
    [10.023, 76.038],
    [10.026, 76.040],
    [10.028, 76.042]
  ]);
  
  // Animation states
  const [riderPosition, setRiderPosition] = useState([10.012, 76.025]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [orderDetail, setOrderDetail] = useState(null);
  const [trackerProofFile, setTrackerProofFile] = useState(null);
  const [trackerUpiRef, setTrackerUpiRef] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);

  const handleTrackerSubmitProof = async (e) => {
    if (e) e.preventDefault();
    if (!trackerProofFile) {
      alert("Please upload a payment screenshot.");
      return;
    }
    
    if (trackerProofFile.size > 5 * 1024 * 1024) {
      alert("File size exceeds the maximum limit of 5 MB.");
      return;
    }
    
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(trackerProofFile.type)) {
      alert("Only JPG, JPEG, and PNG images are allowed.");
      return;
    }
    
    setSubmittingProof(true);
    try {
      let downloadUrl = null;
      try {
        const fileExt = trackerProofFile.name.split('.').pop() || 'jpg';
        const storageRef = ref(storage, `payment_proofs/order_${orderId}_${Date.now()}.${fileExt}`);
        const snapshot = await uploadBytes(storageRef, trackerProofFile);
        downloadUrl = await getDownloadURL(snapshot.ref);
      } catch (storageErr) {
        console.warn("Firebase Storage upload failed, falling back to local server upload:", storageErr);
      }

      if (downloadUrl) {
        await ordersAPI.submitProof(orderId, {
          screenshot_url: downloadUrl,
          utr_number: trackerUpiRef
        }, true);
      } else {
        const formData = new FormData();
        formData.append("screenshot", trackerProofFile);
        formData.append("utr_number", trackerUpiRef);
        await ordersAPI.submitProof(orderId, formData, false);
      }
      alert("Proof submitted successfully! The farmer will verify it.");
      
      // Reload order details
      const res = await ordersAPI.getDetail(orderId);
      if (res.data) {
        setOrderDetail(res.data);
        setBackendStatus(res.data.status);
      }
      setTrackerProofFile(null);
      setTrackerUpiRef("");
    } catch (err) {
      alert("Failed to submit proof: " + (err.response?.data?.msg || err.message));
    } finally {
      setSubmittingProof(false);
    }
  };

  // Rating Modal states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [backendStatus, setBackendStatus] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Set initial ETA based on delivery speed
  const getInitialEta = () => {
    if (deliveryVehicle === 'bicycle') return 24;
    if (deliveryVehicle === 'auto') return 15;
    return 10; // motorcycle
  };

  const [eta, setEta] = useState(getInitialEta());
  const [distanceLeft, setDistanceLeft] = useState(3.4); // km
  const [orderStatus, setOrderStatus] = useState('Packaging'); // Packaging -> OutForDelivery -> Arrived

  useEffect(() => {
    const loadOrder = async () => {
      try {
        if (!orderId || orderId === 'latest') return;
        const res = await ordersAPI.getDetail(orderId);
        if (res.data) {
          const ord = res.data;
          setOrderDetail(ord);
          setBackendStatus(ord.status);
          
          const isOutForDelivery = ['Shipped', 'Out For Delivery', 'OutForDelivery'].includes(ord.status);
          const isArrived = ['Delivered', 'Waiting Customer Confirmation', 'Completed', 'Disputed'].includes(ord.status);
          if (isArrived) {
            setOrderStatus('Arrived');
          } else if (isOutForDelivery) {
            setOrderStatus('OutForDelivery');
          } else {
            setOrderStatus('Packaging');
          }

          const fCoords = [ord.farmer_lat || 10.012, ord.farmer_lng || 76.025];
          const bCoords = [ord.buyer_lat || 10.028, ord.buyer_lng || 76.042];
          setFarmerCoords(fCoords);
          setBuyerCoords(bCoords);
          setRiderPosition(fCoords);
          
          // Fetch OSRM route for real road routing
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fCoords[1]},${fCoords[0]};${bCoords[1]},${bCoords[0]}?overview=full&geometries=geojson`;
            const routeRes = await fetch(osrmUrl);
            const routeData = await routeRes.json();
            if (routeData.routes && routeData.routes.length > 0) {
              const coords = routeData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
              
              // Downsample route to max 20 steps for a smooth animation
              const maxSteps = 20;
              let sampledRoute = [];
              if (coords.length > maxSteps) {
                for (let i = 0; i < maxSteps; i++) {
                  const idx = Math.floor((i / (maxSteps - 1)) * (coords.length - 1));
                  sampledRoute.push(coords[idx]);
                }
              } else {
                sampledRoute = coords;
              }
              setRoutePath(sampledRoute);
              
              const totalRoadDist = (routeData.routes[0].distance / 1000).toFixed(1);
              setDistanceLeft(parseFloat(totalRoadDist));
              
              let speed = 45; // km/h for motorcycle
              if (deliveryVehicle === 'bicycle') speed = 15;
              if (deliveryVehicle === 'auto') speed = 30;
              const calculatedEta = Math.round((totalRoadDist / speed) * 60);
              setEta(calculatedEta);
            } else {
              throw new Error("No OSRM routes found");
            }
          } catch (e) {
            console.warn("OSRM routing failed, using straight-line fallback:", e);
            const interpolated = [];
            const steps = 6;
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const lat = fCoords[0] + (bCoords[0] - fCoords[0]) * t;
              const lng = fCoords[1] + (bCoords[1] - fCoords[1]) * t;
              interpolated.push([lat, lng]);
            }
            setRoutePath(interpolated);
            setDistanceLeft(3.4);
            setEta(getInitialEta());
          }
        }
      } catch (err) {
        console.error("Failed to fetch order detail", err);
      }
    };
    loadOrder();
    // Poll every 30s to get fresh status from farmer
    const poll = setInterval(loadOrder, 30000);
    return () => clearInterval(poll);
  }, [orderId, deliveryVehicle]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await ordersAPI.getDetail(orderId).catch(() => null);
    if (res?.data) {
      setBackendStatus(res.data.status);
      setOrderDetail(res.data);
    }
    setRefreshing(false);
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      setRefreshing(true);
      await ordersAPI.updateStatus(orderId, 'Cancelled');
      setBackendStatus('Cancelled');
      alert("Order cancelled successfully.");
    } catch (e) {
      alert("Failed to cancel order: " + (e.response?.data?.msg || e.message));
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!orderId || orderId === 'latest') return;
    try {
      setConfirmingDelivery(true);
      await ordersAPI.updateStatus(orderId, 'Completed');
      setBackendStatus('Completed');
      setOrderStatus('Arrived');
      setShowConfirmModal(false);
      setShowRatingModal(true);
    } catch (e) {
      alert('Could not confirm delivery. Please try again.');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleDisputeOrder = async () => {
    if (!window.confirm("Are you sure you want to report an issue for this order? This will mark the order as Disputed and halt automatic completion for admin review.")) return;
    try {
      setRefreshing(true);
      await ordersAPI.updateStatus(orderId, 'Disputed');
      setBackendStatus('Disputed');
      alert("Issue reported. The order has been marked as Disputed. Admin review is now pending.");
    } catch (e) {
      alert("Failed to dispute order: " + (e.response?.data?.msg || e.message));
    } finally {
      setRefreshing(false);
    }
  };

  const updateStatusToWaitingConfirmation = async () => {
    try {
      if (orderId && orderId !== 'latest') {
        await ordersAPI.updateStatus(orderId, 'Waiting Customer Confirmation');
        setBackendStatus('Waiting Customer Confirmation');
      }
    } catch (e) {
      console.warn("Failed to set order status to Waiting Customer Confirmation", e);
    }
  };

  // Animate the rider along the path
  useEffect(() => {
    const totalSteps = routePath.length;
    if (totalSteps === 0) return;

    const isOutForDelivery = ['Shipped', 'Out For Delivery', 'OutForDelivery'].includes(backendStatus);
    const isArrived = ['Delivered', 'Waiting Customer Confirmation', 'Completed', 'Disputed'].includes(backendStatus);
    
    if (isArrived) {
      setRiderPosition(buyerCoords);
      setEta(0);
      setDistanceLeft(0);
      setOrderStatus('Arrived');
      return;
    }
    
    if (!isOutForDelivery) {
      // Keep rider at farmer coordinates
      setRiderPosition(routePath[0] || farmerCoords);
      setOrderStatus('Packaging');
      return;
    }

    setRouteIndex(0);
    setRiderPosition(routePath[0] || farmerCoords);
    setOrderStatus('OutForDelivery');
    
    const initialDistance = distanceLeft;
    const initialEtaVal = eta;
    
    const interval = setInterval(() => {
      setRouteIndex(prev => {
        const next = prev + 1;
        if (next < totalSteps) {
          setRiderPosition(routePath[next]);
          
          const nextEta = Math.max(1, Math.round(initialEtaVal - (next * (initialEtaVal / totalSteps))));
          setEta(nextEta);
          setDistanceLeft(Math.max(0.01, parseFloat((initialDistance - (next * (initialDistance / totalSteps))).toFixed(2))));
          
          return next;
        } else {
          setRiderPosition(buyerCoords);
          setEta(0);
          setDistanceLeft(0);
          setOrderStatus('Arrived');
          clearInterval(interval);
          return prev;
        }
      });
    }, 1500); // 1.5 seconds per step makes it fast and responsive

    return () => clearInterval(interval);
  }, [deliveryVehicle, routePath, buyerCoords, backendStatus]);

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!orderId || orderId === 'latest') return;
    try {
      setSubmittingRating(true);
      await marketAPI.rateOrder(orderId, userRating, ratingFeedback);
      alert('Thank you! Your community rating has been submitted.');
      setShowRatingModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const getStatusText = () => {
    if (backendStatus === 'Cancelled') return 'This order has been cancelled';
    if (backendStatus === 'Rejected' || backendStatus === 'COD_REJECTED') return 'Order was rejected by the farmer';
    if (backendStatus === 'COD_EXPIRED') return 'This order has expired due to farmer inactivity';
    if (backendStatus === 'Disputed') return 'Order reported: Disputed. Admin review is pending.';
    if (orderDetail?.payment_method === 'COD') {
      if (backendStatus === 'COD_PENDING') return 'Order Placed. Farmer is reviewing your Cash on Delivery order.';
      if (backendStatus === 'COD_ACCEPTED') return '✅ Your Cash on Delivery order has been accepted. The farmer is preparing your order. Please keep the payment ready during pickup or delivery.';
      if (backendStatus === 'Completed') return 'Order completed! Cash payment collected. Thank you.';
    }
    if (backendStatus === 'PendingPayment' || backendStatus === 'Pending Payment') return 'Complete your UPI payment to notify the farmer';
    if (backendStatus === 'WaitingFarmerConfirmation' || backendStatus === 'Waiting Farmer Confirmation') return 'Payment sent! Farmer is checking their notification...';
    if (backendStatus === 'Confirmed' || backendStatus === 'Accepted' || backendStatus === 'ACCEPTED') return 'Order accepted! Farmer is preparing your order.';
    if (backendStatus === 'Packed') return 'Produce packed and sanitized! Awaiting dispatch.';
    if (backendStatus === 'Shipped' || backendStatus === 'Out For Delivery') {
      const t = deliveryVehicle === 'bicycle' ? 'Cyclist' : deliveryVehicle === 'auto' ? 'Auto Driver' : 'Rider';
      return t + ' is out for delivery — track on map';
    }
    if (backendStatus === 'Delivered' || backendStatus === 'Waiting Customer Confirmation') return 'Your order has been delivered! Please confirm receipt.';
    if (backendStatus === 'Completed') return 'Order completed! Thank you.';
    if (orderStatus === 'Packaging') return 'Farmer is packaging your items';
    if (orderStatus === 'OutForDelivery') {
      const t = deliveryVehicle === 'bicycle' ? 'Cyclist' : deliveryVehicle === 'auto' ? 'Auto Driver' : 'Rider';
      return t + ' is on the way';
    }
    return 'Your order has arrived!';
  };

  const getStatusStep = () => {
    const steps = [
      'Pending Payment',
      'Waiting Farmer Confirmation',
      'Accepted',
      'Packed',
      'Out For Delivery',
      'Waiting Customer Confirmation',
      'Completed'
    ];
    const legacyMap = {
      'PendingPayment': 0,
      'WaitingFarmerConfirmation': 1,
      'Confirmed': 2,
      'ACCEPTED': 2,
      'Accepted': 2,
      'Packed': 3,
      'Shipped': 4,
      'OutForDelivery': 4,
      'Delivered': 5,
      'Disputed': 5
    };
    if (legacyMap[backendStatus] !== undefined) {
      return legacyMap[backendStatus];
    }
    return Math.max(0, steps.indexOf(backendStatus));
  };

  const getTimelineStepClass = (step) => {
    const activeClass = "bg-green-700 text-white shadow-md shadow-green-700/25";
    const inactiveClass = "bg-gray-100 text-gray-400";
    const currentStep = getStatusStep();
    
    // Step Placed corresponds to 'Order Confirmed' (Accepted/Confirmed status: currentStep >= 2)
    // Step Packaging corresponds to 'Harvest Packaged' (Packed status: currentStep >= 3)
    // Step Delivery corresponds to 'Out for Delivery' (Out For Delivery status: currentStep >= 4)
    // Step Arrived corresponds to 'Delivered' (Waiting Customer Confirmation/Completed/Disputed status: currentStep >= 5)

    if (step === 'Placed') return currentStep >= 2 ? activeClass : inactiveClass;
    if (step === 'Confirmed') return currentStep >= 2 ? activeClass : inactiveClass;
    if (step === 'Packaging') return currentStep >= 3 ? activeClass : inactiveClass;
    if (step === 'Delivery') return currentStep >= 4 ? activeClass : inactiveClass;
    if (step === 'Arrived') return currentStep >= 5 ? activeClass : inactiveClass;
    return inactiveClass;
  };

  const getRiderDetails = () => {
    if (deliveryVehicle === 'bicycle') return '🚴 Hero Cycle • KL-33 (No plate)';
    if (deliveryVehicle === 'auto') return '🛺 Cargo Ape Auto • KL-33-F-4389';
    return '🏍️ Royal Enfield • KL-33-B-8290';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans text-gray-900">
      
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <span className="text-xs font-bold text-green-700 uppercase tracking-widest bg-green-50 border border-green-200 px-3.5 py-1.5 rounded-full inline-block mb-3">Simulated Route Tracking (Simulation Mode)</span>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">Order #{orderId || '729A'}</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn bg-white hover:bg-gray-50 text-gray-700 font-bold border border-gray-200 shadow-sm flex items-center gap-2 cursor-pointer py-3 px-5 rounded-xl mr-2"
        >
          <RefreshCw size={16} className={`refreshing ? 'animate-spin' : ''`} /> Refresh Status
        </button>
        {user.id === orderDetail?.buyer_id && ['PendingPayment', 'WaitingFarmerConfirmation'].includes(backendStatus) && (
          <button
            onClick={handleCancelOrder}
            disabled={refreshing}
            className="btn bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 shadow-sm flex items-center gap-2 cursor-pointer py-3.5 px-5 rounded-xl mr-2"
          >
            ❌ Cancel Order
          </button>
        )}
        <button 
          onClick={() => navigate('/buyer/search')}
          className="btn bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold border-none shadow-sm flex items-center gap-2 cursor-pointer py-3.5 px-6 rounded-xl"
        >
          <Home size={18} /> Shop More
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* === STATUS BANNERS === */}
        {/* UPI Payment Form or Pending Verification Card */}
        {orderDetail?.payment_method === 'UPI' && (
          <div className="col-span-1 lg:col-span-3">
            {orderDetail.payment_status === 'PENDING_PAYMENT' && (
              <div className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-[2rem] p-6 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-green-200/50 pb-5">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-green-700 uppercase tracking-widest bg-green-100/50 border border-green-200 px-3 py-1 rounded-full inline-block">Direct UPI Payment Required</div>
                    <h2 className="text-2xl font-black text-gray-900 mt-2">Pay Directly to Farmer: {orderDetail.farmer_name}</h2>
                    <p className="text-sm text-gray-600 font-semibold">Please scan the QR code below or open your preferred UPI app to pay <strong>&#8377;{orderDetail.total_price}</strong>.</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur rounded-2xl py-3 px-6 border border-green-200 text-center md:text-right shrink-0">
                    <span className="text-xs font-bold text-gray-500 block uppercase">Amount Due</span>
                    <span className="text-3xl font-black text-green-700">&#8377;{orderDetail.total_price}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="text-center space-y-3">
                    <div className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Scan this QR Code</div>
                    <div className="bg-white border-2 border-dashed border-green-300 rounded-2xl p-4 inline-block shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=15&data=${encodeURIComponent(`upi://pay?pa=${encodeURIComponent(orderDetail.farmer_upi_id || '')}&pn=${encodeURIComponent(orderDetail.farmer_name || 'Farmer')}&am=${orderDetail.total_price}&cu=INR`)}`}
                        alt="UPI QR" 
                        className="w-[200px] h-[200px] block mx-auto" 
                      />
                    </div>
                    <div className="text-[10px] text-gray-450 font-bold">UPI ID: {orderDetail.farmer_upi_id || 'Not Configured'}</div>
                  </div>

                  <form onSubmit={handleTrackerSubmitProof} className="space-y-5 bg-white/40 p-6 rounded-2xl border border-green-200/40">
                    <h3 className="text-lg font-bold text-gray-800">Submit Payment Proof</h3>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Screenshot *</label>
                      <div className="border-2 border-dashed border-green-300 hover:border-green-500 rounded-xl p-5 text-center cursor-pointer relative bg-white hover:bg-green-50/20 transition-colors">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => setTrackerProofFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          required
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-750">
                            {trackerProofFile ? trackerProofFile.name : "Select payment screenshot"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">PNG, JPG, or JPEG up to 5 MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">UTR / Transaction ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="12-digit UTR or transaction ID"
                        value={trackerUpiRef}
                        onChange={(e) => setTrackerUpiRef(e.target.value)}
                        className="form-control"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingProof}
                      className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer border-none shadow-md shadow-green-700/20 transition-all disabled:opacity-50">
                      {submittingProof ? <Loader size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {submittingProof ? "Submitting..." : "Submit Payment Proof"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {orderDetail.payment_status === 'PAYMENT_SUBMITTED' && (
              <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-[2rem] p-6 shadow-md flex items-start gap-4">
                <div className="text-4xl shrink-0">&#128336;</div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-black text-amber-900 text-lg">Waiting for Farmer Confirmation</h3>
                  <p className="text-amber-800 text-sm font-semibold">Your payment proof has been submitted successfully. The farmer is checking their GPay/PhonePe notification.</p>
                  <p className="text-amber-700 text-xs font-medium">This usually takes a few minutes. Your order will be confirmed once the farmer verifies the payment.</p>
                  {orderDetail.utr_number && (
                    <p className="text-xs text-amber-850 font-bold mt-2">Submitted UTR: <span className="bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-mono text-[11px]">{orderDetail.utr_number}</span></p>
                  )}
                  <button onClick={handleRefresh} disabled={refreshing}
                    className="mt-3 text-xs font-black text-amber-700 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-xl cursor-pointer border-solid inline-flex items-center gap-1.5 transition-all">
                    <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                    {refreshing ? "Refreshing..." : "Check for Update"}
                  </button>
                </div>
              </div>
            )}

            {orderDetail.payment_status === 'PAYMENT_REJECTED' && (
              <div className="mb-6 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-[2rem] p-6 shadow-xl space-y-6">
                <div className="flex items-start gap-4 border-b border-red-200/50 pb-5">
                  <div className="text-4xl shrink-0">&#10060;</div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-red-755 uppercase tracking-widest bg-red-100 border border-red-200 px-3.5 py-1 rounded-full inline-block">Payment Verification Failed</div>
                    <h3 className="font-black text-red-900 text-lg mt-2">The farmer rejected the payment proof.</h3>
                    <p className="text-red-800 text-sm font-bold mt-1">Reason: <span className="underline">{orderDetail.payment_rejection_reason || "Invalid screenshot / UTR mismatch"}</span></p>
                    <p className="text-red-700 text-xs font-semibold">Please review the details, scan the QR code, and submit a corrected screenshot and transaction ID.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="text-center space-y-3">
                    <div className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Scan this QR Code</div>
                    <div className="bg-white border-2 border-dashed border-red-300 rounded-2xl p-4 inline-block shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=15&data=${encodeURIComponent(`upi://pay?pa=${encodeURIComponent(orderDetail.farmer_upi_id || '')}&pn=${encodeURIComponent(orderDetail.farmer_name || 'Farmer')}&am=${orderDetail.total_price}&cu=INR`)}`}
                        alt="UPI QR" 
                        className="w-[200px] h-[200px] block mx-auto" 
                      />
                    </div>
                    <div className="text-[10px] text-gray-450 font-bold">UPI ID: {orderDetail.farmer_upi_id || 'Not Configured'}</div>
                  </div>

                  <form onSubmit={handleTrackerSubmitProof} className="space-y-5 bg-white/40 p-6 rounded-2xl border border-red-200/40">
                    <h3 className="text-lg font-bold text-gray-800">Submit Corrected Proof</h3>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Corrected Screenshot *</label>
                      <div className="border-2 border-dashed border-red-300 hover:border-red-500 rounded-xl p-5 text-center cursor-pointer relative bg-white hover:bg-red-50/20 transition-colors">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => setTrackerProofFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          required
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-gray-750">
                            {trackerProofFile ? trackerProofFile.name : "Select corrected screenshot"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">PNG, JPG, or JPEG up to 5 MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">UTR / Transaction ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="12-digit UTR or transaction ID"
                        value={trackerUpiRef}
                        onChange={(e) => setTrackerUpiRef(e.target.value)}
                        className="form-control"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingProof}
                      className="w-full bg-red-600 hover:bg-red-750 text-white font-extrabold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer border-none shadow-md shadow-red-600/20 transition-all disabled:opacity-50">
                      {submittingProof ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      {submittingProof ? "Submitting..." : "Submit Corrected Proof"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regular Status Banners (COD or non-verification states) */}
        {(!orderDetail?.payment_method || orderDetail?.payment_method !== 'UPI' || orderDetail?.payment_status === 'PAYMENT_CONFIRMED') && (
          <div className="col-span-1 lg:col-span-3">
            {(backendStatus === 'Confirmed' || backendStatus === 'Accepted' || backendStatus === 'ACCEPTED') && (
              <div className="mb-6 bg-green-50 border-2 border-green-400 rounded-2xl p-5 flex items-start gap-4">
                <div className="text-3xl shrink-0">&#9989;</div>
                <div>
                  <h3 className="font-black text-green-900 text-base">Order Confirmed by Farmer!</h3>
                  <p className="text-green-800 text-sm font-semibold mt-1">Your order is being prepared for pickup/delivery.</p>
                </div>
              </div>
            )}
            {backendStatus === 'Rejected' && (
              <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-4">
                <div className="text-3xl shrink-0">&#10060;</div>
                <div>
                  <h3 className="font-black text-red-900 text-base">Order Rejected</h3>
                  <p className="text-red-800 text-sm font-semibold mt-1">The farmer could not fulfill this order. Please contact the farmer for clarification.</p>
                  <button onClick={() => window.history.back()} className="mt-3 text-xs font-black text-red-700 border border-red-300 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg cursor-pointer border-solid inline-flex items-center gap-1.5">
                    &#8592; Go Back
                  </button>
                </div>
              </div>
            )}
            {backendStatus === 'Cancelled' && (
              <div className="mb-6 bg-gray-50 border-2 border-gray-300 rounded-2xl p-5 flex items-start gap-4">
                <div className="text-3xl shrink-0">🚫</div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Order Cancelled</h3>
                  <p className="text-gray-800 text-sm font-semibold mt-1">This order was cancelled. Any reserved stock has been released.</p>
                  <button onClick={() => window.history.back()} className="mt-3 text-xs font-black text-gray-700 border border-gray-300 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer border-solid inline-flex items-center gap-1.5">
                    &#8592; Go Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Left Panels - Live Status & Rider Details */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status Header */}
          <div className="card glass p-6 border border-green-500/10">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-700">
                <Clock size={28} className={`orderStatus !== 'Arrived' ? 'animate-pulse' : ''`} />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400">Estimated Arrival</span>
                <p className="text-3xl font-black text-gray-900">{eta > 0 ? `${eta} mins` : 'Arrived!'}</p>
              </div>
            </div>

            <p className="text-sm font-bold text-gray-700 mb-6 bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-green-600 rounded-full animate-ping" />
              {getStatusText()}
            </p>

            {/* Timeline Progress */}
            {orderDetail?.payment_method === 'COD' ? (
              <div className="relative pl-8 space-y-8 border-l-2 border-gray-100">
                <div className="relative">
                  <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    ['COD_PENDING', 'COD_ACCEPTED', 'Completed'].includes(backendStatus) ? "bg-green-700 text-white shadow-md shadow-green-700/25" : "bg-gray-100 text-gray-400"
                  }`}>1</span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Order Placed</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">Awaiting farmer review</p>
                </div>

                <div className="relative">
                  <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    ['COD_ACCEPTED', 'Completed'].includes(backendStatus) ? "bg-green-700 text-white shadow-md shadow-green-700/25" : "bg-gray-100 text-gray-400"
                  }`}>2</span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Order Accepted</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">Farmer is preparing your order</p>
                </div>

                <div className="relative">
                  <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    backendStatus === 'Completed' ? "bg-green-700 text-white shadow-md shadow-green-700/25" : "bg-gray-100 text-gray-400"
                  }`}>3</span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Completed</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">Cash collected during delivery/pickup</p>
                </div>
              </div>
            ) : (
              <div className="relative pl-8 space-y-8 border-l-2 border-gray-100">
                <div className="relative">
                  <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${getTimelineStepClass('Placed')}`}>1</span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Order Confirmed</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">Farmer accepted harvest match</p>
                </div>

                <div className="relative">
                  <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${getTimelineStepClass('Packaging')}`}>2</span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Harvest Packaged</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">Produce packed and sanitized</p>
                </div>

                <div className="relative">
                  <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${getTimelineStepClass('Delivery')}`}>3</span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Out for Delivery</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">Rider animating on the live route</p>
                </div>

                <div className="relative">
                  <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${getTimelineStepClass('Arrived')}`}>4</span>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Delivered</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-0.5">Fresh produce received</p>
                </div>
              </div>
            )}
          </div>

          {/* Rider Card */}
          {orderDetail?.delivery_type === "Pickup" ? (
            <div className="card glass p-6 border border-gray-150 space-y-4">
              <h4 className="font-extrabold text-gray-900 text-lg mb-2 flex items-center gap-2">
                <Package size={20} className="text-green-700" /> Farm Pickup Details
              </h4>
              
              <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100 text-xs font-semibold space-y-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Farmer & Farm Name</span>
                    <span className="text-gray-955 font-black text-sm">
                      {orderDetail?.farmer_name || "Farmer"}
                      {orderDetail?.farm_name ? ` (${orderDetail.farm_name})` : ''}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-green-700 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Pickup Location</span>
                    <span className="text-gray-955 font-black text-xs">
                      Coordinates: {orderDetail?.farmer_lat?.toFixed(5)}, {orderDetail?.farmer_lng?.toFixed(5)}
                    </span>
                    {orderDetail?.pickup_landmark && (
                      <span className="text-gray-600 block text-[11px] mt-1 font-bold">
                        Landmark: {orderDetail.pickup_landmark}
                      </span>
                    )}
                  </div>
                </div>

                {orderDetail?.pickup_instructions && (
                  <div className="bg-white p-3 rounded-xl border border-gray-150 text-gray-750">
                    <span className="text-gray-400 font-bold block text-[9px] uppercase mb-1">Pickup Instructions</span>
                    <p className="text-xs leading-relaxed font-semibold">{orderDetail.pickup_instructions}</p>
                  </div>
                )}
              </div>

              {/* Get Directions Button */}
              {orderDetail?.farmer_lat && orderDetail?.farmer_lng && (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${orderDetail.farmer_lat},${orderDetail.farmer_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-800 hover:to-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm text-center no-underline flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-700/20 border-none transition-all"
                >
                  <Navigation size={16} /> Get Directions (Google Maps)
                </a>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <a 
                  href={`tel:${orderDetail?.farmer_phone || ""}`}
                  className="btn bg-gray-55 hover:bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded-xl border border-gray-200 text-xs flex items-center justify-center gap-1.5 no-underline cursor-pointer"
                >
                  <Phone size={14} className="text-green-600" /> Call Farmer
                </a>
                <button 
                  onClick={() => { if(orderDetail?.farmer_phone) { window.open(`https://wa.me/91${orderDetail.farmer_phone}`, "_blank"); } else { alert("Farmer contact not available"); } }}
                  className="btn bg-gray-55 hover:bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded-xl border border-gray-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare size={14} className="text-blue-500" /> Chat
                </button>
              </div>
            </div>
          ) : (
            <div className="card glass p-6 border border-gray-150">
              <h4 className="font-extrabold text-gray-900 text-lg mb-4">Delivery Partner</h4>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-md">
                A
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-black text-gray-955 text-base leading-tight">{orderDetail?.farmer_name || "Farmer"}</h5>
                <p className="text-xs text-gray-450 font-bold mt-1">{getRiderDetails()}</p>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mt-1.5 flex items-center gap-1">
                  <Navigation size={10} /> {distanceLeft} km away
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a 
                href={`tel:${orderDetail?.farmer_phone || ""}`}
                className="btn bg-gray-55 hover:bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded-xl border border-gray-200 text-xs flex items-center justify-center gap-1.5 no-underline cursor-pointer"
              >
                <Phone size={14} className="text-green-600" /> Call Farmer
              </a>
              <button 
                onClick={() => { if(orderDetail?.farmer_phone) { window.open(`https://wa.me/91${orderDetail.farmer_phone}`, "_blank"); } else { alert("Farmer contact not available"); } }}
                className="btn bg-gray-55 hover:bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded-xl border border-gray-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare size={14} className="text-blue-500" /> Chat
              </button>
            </div>
          </div>
          )}

          {/* CONFIRM DELIVERY & DISPUTE BUTTONS */}
          {user.id === orderDetail?.buyer_id && 
           ['Out For Delivery', 'Shipped', 'Waiting Customer Confirmation', 'Delivered'].includes(backendStatus) && 
           backendStatus !== 'Completed' && 
           backendStatus !== 'Disputed' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-bold text-amber-800 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Only press below AFTER you physically receive your goods. This cannot be undone.</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-extrabold py-4 rounded-2xl border-none cursor-pointer shadow-xl shadow-green-700/25 flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 size={16} /> Confirm Received
                </button>
                <button
                  onClick={handleDisputeOrder}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-4 rounded-2xl border-none cursor-pointer shadow-xl shadow-red-600/25 flex items-center justify-center gap-2 text-sm"
                >
                  <AlertCircle size={16} /> Report Issue
                </button>
              </div>
            </div>
          )}

          {user.id === orderDetail?.buyer_id && backendStatus === 'Completed' && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-2xl text-center space-y-3">
              <p className="text-sm font-extrabold text-green-800">Order Completed successfully!</p>
              <p className="text-xs font-semibold text-green-600">Would you like to rate the farmer and product?</p>
              <button
                onClick={() => setShowRatingModal(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3 rounded-2xl border-none cursor-pointer shadow-md"
              >
                Rate Order
              </button>
            </div>
          )}

                    {/* Direct trust block */}
          <div className="bg-green-50 border border-green-200/50 p-4 rounded-2xl flex items-start gap-3 text-xs font-semibold text-green-800">
            <ShieldCheck size={20} className="text-green-700 shrink-0" />
            <p className="leading-relaxed">Logistics optimized by Ranni Grama Panchayat. Zero middleman fees. Delivery status secured mathematically.</p>
          </div>

        </div>

        {/* Right Panels - Interactive Map with Dotted Route Line */}
        <div className="lg:col-span-2 h-[550px] rounded-[2.5rem] overflow-hidden border border-gray-150 shadow-xl relative">
          <div className="absolute top-4 left-4 z-[1000] bg-orange-600/90 backdrop-blur-md text-white font-black text-[10px] tracking-wider uppercase px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-orange-500 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            Simulation Mode
          </div>
          <MapContainer center={farmerCoords} zoom={13} zoomControl={false} scrollWheelZoom={true} className="h-full w-full">
            <MapFocus center={riderPosition} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Farmer pin */}
            <Marker position={farmerCoords} icon={farmerIcon}>
              <Popup className="rounded-3xl border-none">
                <div className="text-center font-bold px-3 py-1 text-xs text-gray-800">FARM LOCATION</div>
              </Popup>
            </Marker>

            {/* Buyer pin */}
            <Marker position={buyerCoords} icon={buyerIcon}>
              <Popup className="rounded-3xl border-none">
                <div className="text-center font-bold px-3 py-1 text-xs text-gray-855">DELIVERY ADDRESS</div>
              </Popup>
            </Marker>

            {/* Dotted polyline representing the delivery path */}
            <Polyline 
              positions={routePath} 
              pathOptions={{ 
                color: '#1b5e20', 
                dashArray: '8, 8', 
                weight: 4,
                opacity: 0.8
              }} 
            />

            {/* Animated Delivery Rider */}
            <Marker position={riderPosition} icon={getRiderIcon(deliveryVehicle)}>
              <Popup className="rounded-3xl border-none">
                <div className="text-center font-bold px-3 py-1 text-xs text-gray-800">ARJUN ({deliveryVehicle.toUpperCase()})</div>
              </Popup>
            </Marker>

          </MapContainer>
          
          <div className="pointer-events-none absolute inset-0 shadow-[inset_10px_0_40px_rgba(0,0,0,0.02)] z-[400]" />
        </div>

      </div>

      {/* CONFIRM DELIVERY MODAL */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setShowConfirmModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md border border-gray-100 shadow-2xl relative z-10 space-y-6 text-center"
            >
              <div className="bg-green-50 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Package size={32} />
              </div>
              <div>
                <h3 className="font-extrabold text-2xl text-gray-900">Confirm Receipt</h3>
                <p className="text-gray-500 font-semibold text-sm mt-2">
                  You are confirming that you received <strong>{orderDetail?.product_name}</strong> from <strong>{orderDetail?.farmer_name}</strong>.
                </p>
                <p className="text-xs text-red-600 font-bold mt-2">This action is permanent. Only confirm if you actually received the goods.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelivery}
                  disabled={confirmingDelivery}
                  className="flex-[2] py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md border-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {confirmingDelivery ? 'Confirming...' : 'Yes, I Received It'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

            {/* COMMUNITY RATING MODAL */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setShowRatingModal(false)} />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md border border-gray-100 shadow-2xl relative z-10 space-y-6 text-center"
            >
              <div className="bg-orange-50 text-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Star size={32} className="fill-orange-500" />
              </div>
              
              <div>
                <h3 className="font-extrabold text-2xl text-gray-900 leading-tight">Rate Your Produce</h3>
                <p className="text-gray-500 font-semibold text-sm mt-1">
                  {orderDetail ? `Leave feedback for Farmer ${orderDetail.farmer_name} on their ${orderDetail.product_name}.` : 'Rate your recent farm purchase.'}
                </p>
              </div>

              <form onSubmit={handleRatingSubmit} className="space-y-6">
                
                {/* 5-star interactive picker */}
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      className="border-none bg-transparent cursor-pointer hover:scale-110 transition-transform p-1"
                    >
                      <Star 
                        size={36} 
                        className={star <= userRating ? 'fill-orange-500 text-orange-500' : 'text-gray-300'} 
                      />
                    </button>
                  ))}
                </div>

                <div className="form-group text-left">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Write a Review (Optional)</label>
                  <textarea 
                    value={ratingFeedback}
                    onChange={(e) => setRatingFeedback(e.target.value)}
                    placeholder="Tell us about the quality, size, and packaging..."
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none font-semibold text-gray-800 text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors border-none cursor-pointer"
                  >
                    Skip
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingRating}
                    className="flex-[2] py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submittingRating ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}