import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Info, Loader, MapPin, Phone, ShieldCheck, ShoppingBag, Truck, QrCode, Banknote, Scan } from 'lucide-react';
import { ordersAPI, verificationAPI } from "../api";
import { CompactBadgeRow } from "../components/VerificationBadges";
import { motion, AnimatePresence } from "motion/react";

// UPI app deep link builder
function getUpiAppUrl(app, upiId, name, amount) {
  const base = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
  if (app === "gpay") return "gpay://upi/pay?" + base.split("upi://pay?")[1];
  if (app === "phonepe") return "phonepe://pay?" + base.split("upi://pay?")[1];
  if (app === "paytm") return "paytmmp://pay?" + base.split("upi://pay?")[1];
  return base; // generic UPI
}

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [deliveryVehicle, setDeliveryVehicle] = useState("motorcycle");
  const [step, setStep] = useState("form"); // form | payment | proof | success
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [upiRef, setUpiRef] = useState("");
  const [paymentFarmerDetails, setPaymentFarmerDetails] = useState(null);
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (placedOrderId && step === "payment") {
      ordersAPI.getDetail(placedOrderId)
        .then(res => {
          setPaymentFarmerDetails({
            phone: res.data.farmer_phone,
            upi_id: res.data.farmer_upi_id,
            name: res.data.farmer_name
          });
        })
        .catch(err => {
          console.error("Error fetching order details for payment:", err);
        });
    }
  }, [placedOrderId, step]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [form, setForm] = useState({ name: user.name || "", phone: "", address: "" });
  const [liveDeliveryAvailable, setLiveDeliveryAvailable] = useState(true);
  const [liveRate, setLiveRate] = useState(10);

  useEffect(() => {
    if (!localStorage.getItem("token")) { alert("Please log in!"); navigate("/auth"); }
    const saved = localStorage.getItem("cart");
    if (saved) {
      const parsedCart = JSON.parse(saved);
      setCart(parsedCart);
      
      const firstItem = parsedCart[0];
      if (firstItem && firstItem.farmer_id) {
        verificationAPI.getFarmerProfile(firstItem.farmer_id)
          .then(res => {
            const data = res.data;
            const available = !!data.delivery_available;
            setLiveDeliveryAvailable(available);
            setLiveRate(data.delivery_price_per_km !== undefined ? data.delivery_price_per_km : 10);
            
            // If live delivery is false, force all items in cart to Pickup
            if (!available) {
              const updated = parsedCart.map(item => ({ ...item, delivery_type: "Pickup" }));
              setCart(updated);
              localStorage.setItem('cart', JSON.stringify(updated));
            }
          })
          .catch(err => {
            console.error("Failed to fetch live farmer settings:", err);
          });
      }
    }
  }, [navigate]);

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <ShoppingBag size={64} className="text-gray-200 mx-auto mb-6" />
        <h2 className="text-2xl font-black mb-2">Cart is Empty</h2>
        <button onClick={() => navigate("/buyer/search")} className="btn btn-primary mt-4 cursor-pointer">Browse Products</button>
      </div>
    );
  }

  const itemsTotal = cart.reduce((s, i) => s + i.price * i.order_qty, 0);
  const hasDelivery = cart.some(i => i.delivery_type === "Delivery");
  const deliveryFee = (() => {
    if (!hasDelivery) return 0;
    return cart.reduce((s, i) => {
      if (i.delivery_type !== "Delivery") return s;
      const r = liveRate;
      const d = i.distance_km || 2;
        return s + Math.round(d * r);
    }, 0);
  })();
  const grandTotal = itemsTotal + deliveryFee;

  // Farmer info from first cart item
  const fi = cart[0] || {};
  const farmerName = paymentFarmerDetails?.name || fi.farmer_name || "Farmer";
  const farmerPhone = paymentFarmerDetails?.phone || fi.farmer_phone || "";
  const farmerUpiId = paymentFarmerDetails?.upi_id || fi.farmer_upi_id || "";
  const upiUrl = `upi://pay?pa=${encodeURIComponent(farmerUpiId)}&pn=${encodeURIComponent(farmerName)}&am=${grandTotal}&cu=INR`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=15&data=${encodeURIComponent(upiUrl)}`;

  // STEP 1: Place order, get ID, move to payment step
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone.trim()) { alert("Please enter your phone number"); return; }
    if (hasDelivery && !form.address.trim()) { alert("Please enter your delivery address for Home Delivery"); return; }
    setLoading(true);
    try {
      let firstId = null;
      localStorage.setItem("deliveryVehicle", deliveryVehicle);
      for (const item of cart) {
        const res = await ordersAPI.create({
          product_id: item.id,
          quantity_ordered: item.order_qty,
          delivery_type: item.delivery_type,
          delivery_vehicle: deliveryVehicle,
          payment_method: paymentMethod,
          shipping_phone: form.phone,
          shipping_address: form.address,
        });
        if (!firstId) firstId = res.data.id;
      }
      setPlacedOrderId(firstId);
      if (paymentMethod === "COD") {
        localStorage.removeItem("cart");
        navigate(`/buyer/track/${firstId}`);
      } else {
        setStep("payment");
      }
    } catch (err) {
      alert("Order failed: " + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Buyer submits payment proof uploader
  const handleSubmitProof = async (e) => {
    if (e) e.preventDefault();
    if (!proofFile) {
      alert("Please upload a payment screenshot.");
      return;
    }
    
    if (proofFile.size > 5 * 1024 * 1024) {
      alert("File size exceeds the maximum limit of 5 MB.");
      return;
    }
    
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(proofFile.type)) {
      alert("Only JPG, JPEG, and PNG images are allowed.");
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("screenshot", proofFile);
      formData.append("utr_number", upiRef);
      
      await ordersAPI.submitProof(placedOrderId, formData);
      localStorage.removeItem("cart");
      setStep("success");
      setTimeout(() => navigate(`/buyer/track/${placedOrderId}`), 2500);
    } catch (err) {
      alert("Failed to submit proof: " + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // PAYMENT STEP UI
  // ===========================
  if (step === "payment") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-green-100">

          {/* Header */}
          <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-6 text-white text-center">
            <div className="text-sm font-bold opacity-80 mb-1">Paying directly to</div>
            <div className="text-2xl font-black">{farmerName}</div>
            <div className="text-sm opacity-80 mt-0.5">{farmerUpiId}</div>
            <div className="mt-4 bg-white/20 backdrop-blur rounded-2xl py-3 px-6 inline-block">
              <span className="text-3xl font-black">&#8377;{grandTotal}</span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* QR Code */}
            <div className="text-center">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Scan QR Code to Pay</div>
              <div className="bg-white border-2 border-dashed border-green-300 rounded-2xl p-4 inline-block shadow-sm">
                <img src={qrSrc} alt="UPI QR" className="w-[200px] h-[200px] block mx-auto" />
              </div>
              <div className="text-[10px] text-gray-400 font-semibold mt-2">Works with any UPI app — GPay, PhonePe, Paytm, BHIM</div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs font-bold text-gray-400">OR OPEN APP DIRECTLY</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* UPI App Buttons */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "gpay", label: "Google Pay", color: "from-blue-500 to-blue-600" },
                { id: "phonepe", label: "PhonePe", color: "from-purple-500 to-purple-700" },
                { id: "paytm", label: "Paytm", color: "from-sky-400 to-blue-500" },
              ].map(app => (
                <a key={app.id}
                  href={getUpiAppUrl(app.id, farmerUpiId, farmerName, grandTotal)}
                  className={`bg-gradient-to-br ${app.color} text-white font-extrabold py-3 rounded-xl text-xs text-center no-underline block shadow-md active:scale-95 transition-transform`}>
                  {app.label}
                </a>
              ))}
            </div>

            {/* Generic UPI link */}
            <a href={upiUrl} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl text-sm text-center no-underline block hover:bg-black transition-colors">
              Open Any UPI App
            </a>

            {/* I Have Paid button */}
            <button
              type="button"
              onClick={() => setStep("proof")}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold py-4 rounded-xl text-base flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-green-700/30 transition-all">
              <CheckCircle size={20} />
              I Have Paid — Upload Screenshot
            </button>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800 font-semibold">
              <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <span>After tapping above, the farmer will check their GPay/PhonePe notification and confirm. Your order is placed only after farmer confirms.</span>
            </div>

            <button onClick={() => setStep("form")} className="w-full text-gray-400 text-xs font-bold bg-transparent border-none cursor-pointer">
              &larr; Go back to edit order
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===========================
  // PROOF UPLOAD STEP UI
  // ===========================
  if (step === "proof") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-green-100 p-6 space-y-6">
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-green-700" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Upload Payment Proof</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Please upload the screenshot of your UPI transfer to confirm your payment of <strong>&#8377;{grandTotal}</strong>.</p>
          </div>

          <form onSubmit={handleSubmitProof} className="space-y-5">
            {/* File Upload Area */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">UPI Payment Screenshot *</label>
              <div className="border-2 border-dashed border-green-300 hover:border-green-500 rounded-2xl p-6 text-center cursor-pointer relative bg-green-50/20 hover:bg-green-50/50 transition-colors">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("File size exceeds 5 MB limit.");
                        return;
                      }
                      setProofFile(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <div className="space-y-1">
                  <span className="inline-block p-3 bg-white rounded-full shadow-sm text-green-700">
                    <Scan size={24} />
                  </span>
                  <p className="text-sm font-bold text-gray-700">
                    {proofFile ? proofFile.name : "Select or drag screenshot"}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">PNG, JPG, or JPEG up to 5 MB</p>
                </div>
              </div>
            </div>

            {/* UTR Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">UTR / Transaction ID (Optional)</label>
              <input
                type="text"
                placeholder="12-digit UTR or transaction ID"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                className="form-control"
              />
              <p className="text-[10px] text-gray-400 font-medium">Providing the transaction ID helps speed up farmer verification.</p>
            </div>

            {/* Submit / Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold py-4 rounded-xl text-base flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-green-700/30 transition-all disabled:opacity-50">
                {loading ? <Loader size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                {loading ? "Submitting..." : "Submit Proof"}
              </button>

              <button
                type="button"
                onClick={() => setStep("payment")}
                className="w-full bg-transparent border-none text-gray-400 hover:text-gray-600 font-bold text-xs cursor-pointer py-1">
                &larr; Go back to QR Code / UPI Apps
              </button>
            </div>
          </form>

        </motion.div>
      </div>
    );
  }

  // ===========================
  // SUCCESS STEP UI
  // ===========================
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-5 max-w-xs">
          <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
            <CheckCircle className="w-14 h-14 text-green-600" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">Payment Notified!</h2>
            <p className="text-green-700 font-bold mt-1">Farmer is checking their notification...</p>
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-xs text-yellow-800 font-semibold">
              &#128336; Order status: <strong>Waiting Farmer Confirmation</strong>
            </div>
            <p className="text-gray-400 text-xs mt-3">Taking you to live order tracker...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===========================
  // MAIN CHECKOUT FORM
  // ===========================
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-sans">
      <button onClick={() => navigate("/buyer/search")} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold mb-8 bg-transparent border-none cursor-pointer">
        <ArrowLeft size={18} /> Back to Search
      </button>
      <h1 className="text-4xl font-black text-gray-900 mb-1">Checkout</h1>
      <p className="text-gray-500 font-medium mb-8">Your payment goes directly to the farmer — zero middleman.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleFormSubmit} className="card glass p-8 border border-green-500/10 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2"><Truck className="text-green-700" size={20} /> Your Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-control" placeholder="Your name" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="form-control pl-10" placeholder="10-digit mobile" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Delivery Address</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="form-control pl-10 min-h-[90px] resize-none py-3" placeholder="House, street, landmark... (for delivery or to help farmer find you)" />
              </div>
              <p className="text-xs text-gray-400 font-medium mt-1">{hasDelivery ? "Farmer will deliver to your address." : "Items set to Pickup — change below if you want delivery."}</p>
            </div>

            {/* Delivery Type Toggle */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Delivery Method</p>
              
              {!liveDeliveryAvailable ? (
                <div className="text-center py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-extrabold text-amber-800">&#127968; Pickup Only – Customer must collect from farm.</p>
                  <p className="text-xs text-amber-600 mt-1 font-semibold">The farmer does not offer home delivery for this item.</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = cart.map(i => ({...i, delivery_type: "Pickup"}));
                      setCart(updated);
                      localStorage.setItem('cart', JSON.stringify(updated));
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-extrabold border transition-all cursor-pointer ${!hasDelivery ? "bg-green-700 text-white border-green-700 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    &#127968; Pickup from Farm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = cart.map(i => ({...i, delivery_type: "Delivery"}));
                      setCart(updated);
                      localStorage.setItem('cart', JSON.stringify(updated));
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-extrabold border transition-all cursor-pointer ${hasDelivery ? "bg-green-700 text-white border-green-700 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    &#128666; Home Delivery
                  </button>
                </div>
              )}

              {liveDeliveryAvailable && !hasDelivery && <p className="text-xs text-amber-600 font-semibold mt-2">&#128338; You will collect from the farmer directly.</p>}
              {liveDeliveryAvailable && hasDelivery && <p className="text-xs text-green-600 font-semibold mt-2">&#128666; Farmer will deliver to your address. Enter address above.</p>}
            </div>

            {/* Payment method */}
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4">Payment Method</h3>
              <div className="space-y-3">
                {/* UPI */}
                <button type="button" onClick={() => setPaymentMethod("UPI")}
                  className={`flex items-center gap-4 w-full p-4 rounded-2xl border text-left cursor-pointer transition-all ${paymentMethod === "UPI" ? "bg-green-50 border-green-700 ring-2 ring-green-700/20" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                    <QrCode size={22} className="text-green-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-gray-900">Direct UPI to Farmer</div>
                    <div className="text-xs text-gray-500 mt-0.5">Scan QR or open GPay / PhonePe — money goes straight to farmer</div>
                    <div className="text-[10px] font-black text-green-700 mt-1">&#10003; Zero platform fee &#183; Zero middleman</div>
                  </div>
                  {paymentMethod === "UPI" && <div className="w-5 h-5 bg-green-700 rounded-full flex items-center justify-center shrink-0"><CheckCircle size={12} className="text-white" /></div>}
                </button>

                {/* COD */}
                <button type="button" onClick={() => setPaymentMethod("COD")}
                  className={`flex items-center gap-4 w-full p-4 rounded-2xl border text-left cursor-pointer transition-all ${paymentMethod === "COD" ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <Banknote size={22} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-gray-900">Cash on Pickup / Delivery</div>
                    <div className="text-xs text-gray-500 mt-0.5">Pay cash directly when you receive the produce</div>
                    <div className="text-[10px] font-black text-amber-600 mt-1">Order confirmed automatically by farmer</div>
                  </div>
                  {paymentMethod === "COD" && <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shrink-0"><CheckCircle size={12} className="text-white" /></div>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-green-700/20 text-lg disabled:opacity-60 transition-all">
              {loading ? <Loader size={20} className="animate-spin" /> : <Scan size={20} />}
              {loading ? "Please wait..." : paymentMethod === "UPI" ? "Continue to UPI Payment" : "Place Order (Pay on Delivery)"}
            </button>
          </form>
        </div>

        {/* Right: Summary */}
        <div>
          <div className="card glass p-6 border border-gray-100 sticky top-4">
            <h3 className="font-black text-lg mb-4 pb-3 border-b border-gray-100">Order Summary</h3>

            {/* Farmer info */}
            <div className="bg-green-50 rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">
                {farmerName[0]}
              </div>
              <div>
                <div className="font-extrabold text-gray-900 text-sm mb-1">{farmerName}</div>
                <div className="text-[10px] text-gray-500 font-semibold mb-2">UPI: {farmerUpiId}</div>
                <CompactBadgeRow farmer={{
                  phone_verified: fi.farmer_phone_verified,
                  farm_verified: fi.farmer_farm_verified,
                  community_verified: fi.farmer_community_verified,
                  trust_score: fi.farmer_trust_score
                }} />
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm font-semibold">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="min-w-0">
                      <p className="truncate text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">x{item.order_qty}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-gray-900">&#8377;{item.price * item.order_qty}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2 text-sm font-semibold text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>&#8377;{itemsTotal}</span></div>
              {deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>&#8377;{deliveryFee}</span></div>}
              <div className="flex justify-between text-base font-black text-gray-900 border-t pt-3">
                <span>Total</span><span className="text-green-700">&#8377;{grandTotal}</span>
              </div>
            </div>

            <div className="mt-5 bg-green-50 border border-green-200/70 p-3.5 rounded-xl flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-green-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-green-900">100% Farmer Direct</p>
                <p className="text-[10px] text-green-800 font-medium mt-0.5">Your money goes straight to the farmer. No platform fee, no deductions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
